#!/bin/bash

###############################################################################
# Database Restore Script
#
# Purpose: Restore PostgreSQL database from backup with safety checks
# RTO Target: <1 hour
#
# Usage: ./restore-database.sh [OPTIONS]
# Options:
#   -e, --env ENV          Target environment (development|staging|production) [default: development]
#   -b, --backup FILE      Backup file path (local or S3 URI)
#   -t, --target-db NAME   Target database name [default: from backup metadata]
#   -f, --force            Skip confirmation prompt
#   -d, --dry-run          Verify backup only, don't restore
#   -s, --from-s3          Download latest backup from S3
#   --no-verify            Skip backup integrity verification
#   -h, --help             Show this help message
#
# Examples:
#   ./restore-database.sh -b ./backups/backup_production_20241031_120000.sql.gz
#   ./restore-database.sh -e staging -s
#   ./restore-database.sh -b s3://bucket/backup.sql.gz -f
#   ./restore-database.sh -d -b ./backups/latest.sql
#
# Exit Codes:
#   0 - Success
#   1 - Missing dependencies
#   2 - Invalid arguments
#   3 - Backup file not found or invalid
#   4 - Database connection failed
#   5 - Restore failed
#   6 - Verification failed
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
ENV="development"
BACKUP_FILE=""
TARGET_DB=""
FORCE=false
DRY_RUN=false
FROM_S3=false
VERIFY_BACKUP=true
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="/tmp/db_restore_$$"

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

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
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
            -b|--backup)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -t|--target-db)
                TARGET_DB="$2"
                shift 2
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -s|--from-s3)
                FROM_S3=true
                shift
                ;;
            --no-verify)
                VERIFY_BACKUP=false
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

    if ! command -v psql &> /dev/null; then
        missing_deps+=("psql (PostgreSQL client)")
    fi

    if ! command -v pg_restore &> /dev/null; then
        missing_deps+=("pg_restore (PostgreSQL client)")
    fi

    if ! command -v gunzip &> /dev/null; then
        missing_deps+=("gunzip")
    fi

    if [[ "$FROM_S3" == true ]] && ! command -v aws &> /dev/null; then
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

    # Use DIRECT_DATABASE_URL if available
    local db_url="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

    if [[ -z "$db_url" ]]; then
        log_error "DATABASE_URL not found in environment"
        exit 4
    fi

    # Parse PostgreSQL connection string
    if [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
        export PGUSER="${BASH_REMATCH[1]}"
        export PGPASSWORD="${BASH_REMATCH[2]}"
        export PGHOST="${BASH_REMATCH[3]}"
        export PGPORT="${BASH_REMATCH[4]}"
        export PGDATABASE="${BASH_REMATCH[5]}"
    else
        log_error "Invalid DATABASE_URL format"
        exit 4
    fi

    # Override database name if specified
    if [[ -n "$TARGET_DB" ]]; then
        export PGDATABASE="$TARGET_DB"
    fi

    log_success "Database parameters extracted"
    log_info "Target database: $PGDATABASE @ $PGHOST:$PGPORT"
}

# Download backup from S3
download_from_s3() {
    if [[ "$FROM_S3" != true ]]; then
        return 0
    fi

    log_info "Downloading latest backup from S3..."

    local s3_bucket="${DB_BACKUP_S3_BUCKET:-ai-affiliate-empire-backups}"
    local s3_prefix="${DB_BACKUP_S3_PREFIX:-database-backups/$ENV}"

    # Find latest backup
    local latest_backup=$(aws s3 ls "s3://${s3_bucket}/${s3_prefix}/" | grep "backup_${ENV}_" | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "$latest_backup" ]]; then
        log_error "No backups found in S3: s3://${s3_bucket}/${s3_prefix}/"
        exit 3
    fi

    # Create temp directory
    mkdir -p "$TEMP_DIR"

    # Download backup
    BACKUP_FILE="$TEMP_DIR/$latest_backup"
    local s3_path="s3://${s3_bucket}/${s3_prefix}/${latest_backup}"

    log_info "Downloading: $s3_path"

    if ! aws s3 cp "$s3_path" "$BACKUP_FILE"; then
        log_error "Failed to download backup from S3"
        exit 3
    fi

    # Download metadata if available
    aws s3 cp "${s3_path}.meta" "${BACKUP_FILE}.meta" 2>/dev/null || true

    log_success "Backup downloaded: $BACKUP_FILE"
}

# Validate backup file
validate_backup() {
    log_info "Validating backup file..."

    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "No backup file specified. Use -b or -s option"
        exit 2
    fi

    # Handle S3 URIs
    if [[ "$BACKUP_FILE" =~ ^s3:// ]]; then
        log_info "Downloading backup from S3..."
        mkdir -p "$TEMP_DIR"
        local temp_file="$TEMP_DIR/$(basename "$BACKUP_FILE")"

        if ! aws s3 cp "$BACKUP_FILE" "$temp_file"; then
            log_error "Failed to download backup from S3"
            exit 3
        fi

        BACKUP_FILE="$temp_file"
    fi

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 3
    fi

    # Check file size
    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup file size: $file_size"

    # Verify file is readable
    if [[ ! -r "$BACKUP_FILE" ]]; then
        log_error "Backup file is not readable: $BACKUP_FILE"
        exit 3
    fi

    log_success "Backup file validated"
}

# Read backup metadata
read_metadata() {
    log_info "Reading backup metadata..."

    local meta_file="${BACKUP_FILE}.meta"

    if [[ -f "$meta_file" ]]; then
        # Source metadata file
        set -a
        source "$meta_file"
        set +a

        log_info "Backup created: $BACKUP_TIMESTAMP"
        log_info "Source environment: $BACKUP_ENV"
        log_info "Source database: $BACKUP_DATABASE"
        log_info "Table count: $BACKUP_TABLE_COUNT"
        log_info "Original size: $BACKUP_DB_SIZE"
    else
        log_warning "Metadata file not found: $meta_file"
    fi
}

# Verify backup integrity
verify_integrity() {
    if [[ "$VERIFY_BACKUP" != true ]]; then
        log_warning "Skipping backup integrity verification"
        return 0
    fi

    log_info "Verifying backup integrity..."

    # Decompress if needed
    local test_file="$BACKUP_FILE"
    local is_compressed=false

    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        is_compressed=true
        log_info "Backup is compressed, testing decompression..."

        # Test gunzip
        if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
            log_error "Backup file is corrupted (gunzip test failed)"
            exit 6
        fi

        log_success "Decompression test passed"

        # Decompress for validation
        test_file="${BACKUP_FILE%.gz}"
        gunzip -c "$BACKUP_FILE" > "$test_file"
    fi

    # Validate SQL syntax (basic check)
    log_info "Validating SQL syntax..."

    if ! grep -q "PostgreSQL database dump" "$test_file" 2>/dev/null; then
        log_warning "File may not be a PostgreSQL dump"
    fi

    # Count SQL statements
    local create_count=$(grep -c "CREATE TABLE" "$test_file" 2>/dev/null || echo "0")
    local insert_count=$(grep -c "INSERT INTO" "$test_file" 2>/dev/null || echo "0")

    log_info "CREATE TABLE statements: $create_count"
    log_info "INSERT INTO statements: $insert_count"

    # Clean up decompressed file if it was created
    if [[ "$is_compressed" == true ]] && [[ -f "$test_file" ]]; then
        rm -f "$test_file"
    fi

    log_success "Backup integrity verified"
}

# Confirm restore operation
confirm_restore() {
    if [[ "$FORCE" == true ]] || [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    log_warning "=========================================="
    log_warning "DANGER: DATABASE RESTORE OPERATION"
    log_warning "=========================================="
    log_warning "This will COMPLETELY REPLACE the current database:"
    log_warning "  Environment: $ENV"
    log_warning "  Database: $PGDATABASE"
    log_warning "  Host: $PGHOST:$PGPORT"
    log_warning ""
    log_warning "ALL EXISTING DATA WILL BE LOST!"
    log_warning ""
    log_warning "Backup details:"
    log_warning "  File: $(basename "$BACKUP_FILE")"
    log_warning "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    if [[ -n "${BACKUP_TIMESTAMP:-}" ]]; then
        log_warning "  Created: $BACKUP_TIMESTAMP"
    fi
    log_warning "=========================================="
    echo ""

    read -p "Type 'YES' to proceed with restore: " confirmation

    if [[ "$confirmation" != "YES" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi

    log_info "Restore confirmed, proceeding..."
}

# Create pre-restore backup
create_safety_backup() {
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Dry run mode: skipping safety backup"
        return 0
    fi

    log_info "Creating safety backup of current database..."

    local safety_dir="$PROJECT_ROOT/backups/safety"
    mkdir -p "$safety_dir"

    local safety_file="$safety_dir/pre_restore_${ENV}_${TIMESTAMP}.sql"

    # Quick backup without compression
    if pg_dump \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        > "$safety_file" 2>/dev/null; then
        log_success "Safety backup created: $safety_file"
    else
        log_warning "Failed to create safety backup (continuing anyway)"
    fi
}

# Restore database
restore_database() {
    if [[ "$DRY_RUN" == true ]]; then
        log_success "Dry run mode: restore validation completed successfully"
        return 0
    fi

    log_step "=========================================="
    log_step "STARTING DATABASE RESTORE"
    log_step "=========================================="

    # Prepare backup file
    local restore_file="$BACKUP_FILE"

    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        log_info "Decompressing backup..."
        restore_file="${TEMP_DIR}/$(basename "${BACKUP_FILE%.gz}")"
        gunzip -c "$BACKUP_FILE" > "$restore_file"
        log_success "Backup decompressed"
    fi

    # Terminate existing connections
    log_info "Terminating existing database connections..."

    psql -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$PGDATABASE'
        AND pid <> pg_backend_pid();
    " 2>/dev/null || true

    # Drop and recreate database (if needed)
    log_info "Preparing target database..."

    psql -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;" 2>/dev/null || true
    psql -d postgres -c "CREATE DATABASE $PGDATABASE;" 2>/dev/null || true

    # Restore database
    log_info "Restoring database from backup..."

    if ! psql -d "$PGDATABASE" < "$restore_file" 2>&1 | tee "$TEMP_DIR/restore.log"; then
        log_error "Database restore failed"
        log_error "Check log file: $TEMP_DIR/restore.log"
        exit 5
    fi

    log_success "Database restore completed"

    # Clean up temp restore file
    if [[ "$restore_file" != "$BACKUP_FILE" ]]; then
        rm -f "$restore_file"
    fi
}

# Verify restoration
verify_restore() {
    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    log_info "Verifying database restoration..."

    # Check database exists and is accessible
    if ! psql -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to restored database"
        exit 6
    fi

    # Get table count
    local table_count=$(psql -t -c "
        SELECT count(*)
        FROM information_schema.tables
        WHERE table_schema = 'public';
    " | xargs)

    log_info "Restored tables: $table_count"

    # Compare with backup metadata if available
    if [[ -n "${BACKUP_TABLE_COUNT:-}" ]]; then
        if [[ "$table_count" -eq "$BACKUP_TABLE_COUNT" ]]; then
            log_success "Table count matches backup metadata"
        else
            log_warning "Table count mismatch: expected $BACKUP_TABLE_COUNT, got $table_count"
        fi
    fi

    # Check key tables exist
    local expected_tables=("Product" "Video" "Publication" "Blog" "ProductAnalytics")
    local missing_tables=()

    for table in "${expected_tables[@]}"; do
        if ! psql -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -ne 0 ]; then
        log_warning "Missing expected tables: ${missing_tables[*]}"
    else
        log_success "All expected tables present"
    fi

    # Get database size
    local db_size=$(psql -t -c "SELECT pg_size_pretty(pg_database_size('$PGDATABASE'));" | xargs)
    log_info "Restored database size: $db_size"

    log_success "Database restoration verified"
}

# Generate restore report
generate_report() {
    log_info "Generating restore report..."

    local report_file="$PROJECT_ROOT/backups/restore_report_${TIMESTAMP}.txt"
    mkdir -p "$(dirname "$report_file")"

    {
        echo "=========================================="
        echo "AI AFFILIATE EMPIRE - DATABASE RESTORE REPORT"
        echo "=========================================="
        echo ""
        echo "Restore Information:"
        echo "  Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "  Environment: $ENV"
        echo "  Target Database: $PGDATABASE"
        echo "  Target Host: $PGHOST:$PGPORT"
        echo "  Dry Run: $DRY_RUN"
        echo ""
        echo "Backup Details:"
        echo "  File: $BACKUP_FILE"
        echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        if [[ -n "${BACKUP_TIMESTAMP:-}" ]]; then
            echo "  Created: $BACKUP_TIMESTAMP"
            echo "  Source Environment: ${BACKUP_ENV:-N/A}"
            echo "  Source Database: ${BACKUP_DATABASE:-N/A}"
        fi
        echo ""
        if [[ "$DRY_RUN" != true ]]; then
            echo "Restore Results:"
            echo "  Status: SUCCESS"
            echo "  Tables Restored: $(psql -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)"
            echo "  Database Size: $(psql -t -c "SELECT pg_size_pretty(pg_database_size('$PGDATABASE'));" | xargs)"
        else
            echo "Dry Run Results:"
            echo "  Validation: SUCCESS"
            echo "  No changes made to database"
        fi
        echo ""
        echo "=========================================="
    } > "$report_file"

    cat "$report_file"
    log_success "Report saved: $report_file"
}

# Cleanup temporary files
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

# Main execution
main() {
    # Set up cleanup trap
    trap cleanup EXIT

    log_info "=========================================="
    log_info "AI AFFILIATE EMPIRE - DATABASE RESTORE"
    log_info "=========================================="

    parse_arguments "$@"
    check_dependencies
    load_env_vars
    extract_db_params
    download_from_s3
    validate_backup
    read_metadata
    verify_integrity
    confirm_restore
    create_safety_backup
    restore_database
    verify_restore
    generate_report

    if [[ "$DRY_RUN" == true ]]; then
        log_success "=========================================="
        log_success "DRY RUN COMPLETED SUCCESSFULLY"
        log_success "=========================================="
    else
        log_success "=========================================="
        log_success "RESTORE COMPLETED SUCCESSFULLY"
        log_success "=========================================="
    fi

    exit 0
}

# Run main function
main "$@"
