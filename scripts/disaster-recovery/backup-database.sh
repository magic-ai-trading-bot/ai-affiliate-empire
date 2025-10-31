#!/bin/bash

###############################################################################
# Database Backup Script
#
# Purpose: Create compressed PostgreSQL database backups with metadata
# RPO Target: <1 day (24 hours)
#
# Usage: ./backup-database.sh [OPTIONS]
# Options:
#   -e, --env ENV       Environment (development|staging|production) [default: development]
#   -o, --output DIR    Output directory for backups [default: ./backups]
#   -r, --retention N   Keep last N backups [default: 30]
#   -s, --s3-upload     Upload backup to S3 (requires AWS CLI configured)
#   -n, --no-compress   Skip compression (faster, larger files)
#   -h, --help          Show this help message
#
# Examples:
#   ./backup-database.sh
#   ./backup-database.sh -e production -o /var/backups/db -r 90 -s
#   ./backup-database.sh --env staging --s3-upload
#
# Exit Codes:
#   0 - Success
#   1 - Missing dependencies
#   2 - Invalid arguments
#   3 - Database connection failed
#   4 - Backup creation failed
#   5 - S3 upload failed
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
ENV="development"
BACKUP_DIR="./backups"
RETENTION_DAYS=30
S3_UPLOAD=false
COMPRESS=true
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Show help message
show_help() {
    grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENV="$2"
                shift 2
                ;;
            -o|--output)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -s|--s3-upload)
                S3_UPLOAD=true
                shift
                ;;
            -n|--no-compress)
                COMPRESS=false
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                exit 2
                ;;
        esac
    done
}

# Check required dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("pg_dump (PostgreSQL client)")
    fi

    if [[ "$COMPRESS" == true ]] && ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi

    if [[ "$S3_UPLOAD" == true ]] && ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        exit 1
    fi

    log_success "All dependencies satisfied"
}

# Load environment variables
load_env_vars() {
    log_info "Loading environment variables for: $ENV"

    local env_file="$PROJECT_ROOT/.env.$ENV"
    if [[ "$ENV" == "development" ]]; then
        env_file="$PROJECT_ROOT/.env"
    fi

    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 2
    fi

    # Export variables from .env file
    set -a
    source "$env_file"
    set +a

    log_success "Environment variables loaded"
}

# Extract database connection details
extract_db_params() {
    log_info "Extracting database parameters..."

    # Use DIRECT_DATABASE_URL if available (no connection pooling for backups)
    local db_url="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

    if [[ -z "$db_url" ]]; then
        log_error "DATABASE_URL not found in environment"
        exit 3
    fi

    # Parse PostgreSQL connection string
    # Format: postgresql://user:password@host:port/database?params
    if [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
        export PGUSER="${BASH_REMATCH[1]}"
        export PGPASSWORD="${BASH_REMATCH[2]}"
        export PGHOST="${BASH_REMATCH[3]}"
        export PGPORT="${BASH_REMATCH[4]}"
        export PGDATABASE="${BASH_REMATCH[5]}"
    else
        log_error "Invalid DATABASE_URL format"
        exit 3
    fi

    log_success "Database parameters extracted"
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."

    if ! psql -c "SELECT 1;" &> /dev/null; then
        log_error "Failed to connect to database"
        log_error "Host: $PGHOST:$PGPORT"
        log_error "Database: $PGDATABASE"
        log_error "User: $PGUSER"
        exit 3
    fi

    log_success "Database connection successful"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: $BACKUP_DIR"

    mkdir -p "$BACKUP_DIR"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Failed to create backup directory: $BACKUP_DIR"
        exit 4
    fi

    log_success "Backup directory ready"
}

# Get database statistics before backup
get_db_stats() {
    log_info "Collecting database statistics..."

    local stats_query="
    SELECT
        count(*) as table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    "

    local table_count=$(psql -t -c "$stats_query" | xargs)

    local size_query="SELECT pg_size_pretty(pg_database_size('$PGDATABASE'));"
    local db_size=$(psql -t -c "$size_query" | xargs)

    log_info "Tables: $table_count"
    log_info "Database size: $db_size"

    # Export for metadata
    export DB_TABLE_COUNT="$table_count"
    export DB_SIZE="$db_size"
}

# Create backup
create_backup() {
    log_info "Starting database backup..."

    local backup_name="backup_${ENV}_${TIMESTAMP}"
    local backup_file="$BACKUP_DIR/${backup_name}.sql"

    # Add metadata comments to backup file
    {
        echo "-- AI Affiliate Empire Database Backup"
        echo "-- Environment: $ENV"
        echo "-- Database: $PGDATABASE"
        echo "-- Host: $PGHOST:$PGPORT"
        echo "-- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "-- Tables: $DB_TABLE_COUNT"
        echo "-- Size: $DB_SIZE"
        echo "-- Backup Version: 1.0"
        echo "--"
        echo ""
    } > "$backup_file"

    # Create backup using pg_dump
    # Options:
    #   --clean: Add DROP statements before CREATE
    #   --if-exists: Use IF EXISTS for DROP statements
    #   --create: Include CREATE DATABASE statement
    #   --encoding=UTF8: Set character encoding
    #   --no-owner: Don't output commands to set ownership
    #   --no-privileges: Don't output commands to set privileges
    if ! pg_dump \
        --clean \
        --if-exists \
        --create \
        --encoding=UTF8 \
        --no-owner \
        --no-privileges \
        >> "$backup_file" 2>/dev/null; then
        log_error "pg_dump failed"
        rm -f "$backup_file"
        exit 4
    fi

    # Compress backup if enabled
    if [[ "$COMPRESS" == true ]]; then
        log_info "Compressing backup..."

        if ! gzip "$backup_file"; then
            log_error "Compression failed"
            exit 4
        fi

        backup_file="${backup_file}.gz"
        log_success "Backup compressed"
    fi

    # Get final backup size
    local backup_size=$(du -h "$backup_file" | cut -f1)

    # Create metadata file
    local metadata_file="${backup_file}.meta"
    {
        echo "BACKUP_TIMESTAMP=$TIMESTAMP"
        echo "BACKUP_ENV=$ENV"
        echo "BACKUP_DATABASE=$PGDATABASE"
        echo "BACKUP_HOST=$PGHOST"
        echo "BACKUP_PORT=$PGPORT"
        echo "BACKUP_TABLE_COUNT=$DB_TABLE_COUNT"
        echo "BACKUP_DB_SIZE=$DB_SIZE"
        echo "BACKUP_FILE_SIZE=$backup_size"
        echo "BACKUP_COMPRESSED=$COMPRESS"
        echo "BACKUP_VERSION=1.0"
    } > "$metadata_file"

    log_success "Backup created: $backup_file ($backup_size)"

    # Export for upload
    export BACKUP_FILE="$backup_file"
    export METADATA_FILE="$metadata_file"
}

# Upload to S3
upload_to_s3() {
    if [[ "$S3_UPLOAD" != true ]]; then
        return 0
    fi

    log_info "Uploading backup to S3..."

    local s3_bucket="${DB_BACKUP_S3_BUCKET:-ai-affiliate-empire-backups}"
    local s3_prefix="${DB_BACKUP_S3_PREFIX:-database-backups/$ENV}"
    local s3_path="s3://${s3_bucket}/${s3_prefix}/$(basename "$BACKUP_FILE")"

    # Upload backup file
    if ! aws s3 cp "$BACKUP_FILE" "$s3_path" --storage-class STANDARD_IA; then
        log_error "Failed to upload backup to S3"
        exit 5
    fi

    # Upload metadata file
    if ! aws s3 cp "$METADATA_FILE" "${s3_path}.meta"; then
        log_warning "Failed to upload metadata to S3"
    fi

    log_success "Backup uploaded to: $s3_path"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

    # Find and delete old backup files
    local deleted_count=0

    # Delete local backups older than retention period
    while IFS= read -r old_file; do
        rm -f "$old_file"
        rm -f "${old_file}.meta"
        ((deleted_count++))
        log_info "Deleted old backup: $(basename "$old_file")"
    done < <(find "$BACKUP_DIR" -name "backup_${ENV}_*.sql*" -type f -mtime +${RETENTION_DAYS} 2>/dev/null || true)

    if [[ $deleted_count -eq 0 ]]; then
        log_info "No old backups to clean up"
    else
        log_success "Cleaned up $deleted_count old backup(s)"
    fi

    # Clean old S3 backups if S3 upload is enabled
    if [[ "$S3_UPLOAD" == true ]]; then
        log_info "Cleaning up old S3 backups..."

        local s3_bucket="${DB_BACKUP_S3_BUCKET:-ai-affiliate-empire-backups}"
        local s3_prefix="${DB_BACKUP_S3_PREFIX:-database-backups/$ENV}"
        local cutoff_date=$(date -u -v-${RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null || date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)

        # List and delete old S3 objects
        aws s3 ls "s3://${s3_bucket}/${s3_prefix}/" 2>/dev/null | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')

            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://${s3_bucket}/${s3_prefix}/${file_name}" 2>/dev/null || true
                log_info "Deleted old S3 backup: $file_name"
            fi
        done
    fi
}

# Generate backup report
generate_report() {
    log_info "Generating backup report..."

    local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.txt"

    {
        echo "=========================================="
        echo "AI AFFILIATE EMPIRE - DATABASE BACKUP REPORT"
        echo "=========================================="
        echo ""
        echo "Backup Information:"
        echo "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "  Environment: $ENV"
        echo "  Database: $PGDATABASE"
        echo "  Host: $PGHOST:$PGPORT"
        echo ""
        echo "Backup Details:"
        echo "  File: $(basename "$BACKUP_FILE")"
        echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        echo "  Tables: $DB_TABLE_COUNT"
        echo "  Database Size: $DB_SIZE"
        echo "  Compressed: $COMPRESS"
        echo ""
        if [[ "$S3_UPLOAD" == true ]]; then
            echo "S3 Upload:"
            echo "  Status: SUCCESS"
            echo "  Bucket: ${DB_BACKUP_S3_BUCKET:-ai-affiliate-empire-backups}"
            echo "  Path: ${DB_BACKUP_S3_PREFIX:-database-backups/$ENV}/$(basename "$BACKUP_FILE")"
            echo ""
        fi
        echo "Retention Policy:"
        echo "  Keep: Last $RETENTION_DAYS days"
        echo "  Location: $BACKUP_DIR"
        echo ""
        echo "=========================================="
    } > "$report_file"

    cat "$report_file"
    log_success "Report saved: $report_file"
}

# Main execution
main() {
    log_info "=========================================="
    log_info "AI AFFILIATE EMPIRE - DATABASE BACKUP"
    log_info "=========================================="

    parse_arguments "$@"
    check_dependencies
    load_env_vars
    extract_db_params
    test_connection
    create_backup_dir
    get_db_stats
    create_backup
    upload_to_s3
    cleanup_old_backups
    generate_report

    log_success "=========================================="
    log_success "BACKUP COMPLETED SUCCESSFULLY"
    log_success "=========================================="

    exit 0
}

# Run main function
main "$@"
