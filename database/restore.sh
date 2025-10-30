#!/bin/bash
# ============================================================================
# PostgreSQL Database Restore Script
# AI Affiliate Empire - Production Database Restore
# ============================================================================
# Purpose: Restore database from backups (local or cloud)
# Safety: Requires confirmation before restore
# Features: Point-in-time recovery, backup validation, rollback support
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Source environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"

# Database configuration
DB_NAME="${DB_NAME:-ai_affiliate_empire}"
DB_USER="${DB_USER:-user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Cloud storage
R2_BUCKET="${R2_BUCKET_NAME:-ai-affiliate-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-https://your-account-id.r2.cloudflarestorage.com}"

# Notification
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

# ============================================================================
# Functions
# ============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

send_notification() {
    local status=$1
    local message=$2

    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{\"content\": \"🔄 **Database Restore $status**\n\`\`\`\n$message\n\`\`\`\"}" \
             "$DISCORD_WEBHOOK" 2>/dev/null || true
    fi
}

list_available_backups() {
    log "Available local backups:"
    echo ""
    echo "=== Daily Backups ==="
    ls -lh "${BACKUP_DIR}/daily/" 2>/dev/null | grep ".sql.gz" | awk '{print $9, "-", $5, "-", $6, $7}' || echo "No daily backups found"
    echo ""
    echo "=== Weekly Backups ==="
    ls -lh "${BACKUP_DIR}/weekly/" 2>/dev/null | grep ".sql.gz" | awk '{print $9, "-", $5, "-", $6, $7}' || echo "No weekly backups found"
    echo ""
    echo "=== Monthly Backups ==="
    ls -lh "${BACKUP_DIR}/monthly/" 2>/dev/null | grep ".sql.gz" | awk '{print $9, "-", $5, "-", $6, $7}' || echo "No monthly backups found"
}

list_cloud_backups() {
    log "Fetching cloud backups from R2..."

    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 ls "s3://${R2_BUCKET}/backups/" \
        --recursive \
        --endpoint-url="$R2_ENDPOINT" \
        --human-readable | tail -20
}

download_from_cloud() {
    local backup_date=$1
    local backup_file=$2

    log "Downloading backup from cloud: ${backup_file}"

    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp \
        "s3://${R2_BUCKET}/backups/${backup_date}/${backup_file}" \
        "${BACKUP_DIR}/restore/${backup_file}" \
        --endpoint-url="$R2_ENDPOINT"

    if [ $? -eq 0 ]; then
        log "Cloud download successful"
        return 0
    else
        error "Cloud download failed"
        return 1
    fi
}

verify_backup_file() {
    local backup_path=$1

    log "Verifying backup file integrity..."

    if [ ! -f "$backup_path" ]; then
        error "Backup file not found: $backup_path"
        return 1
    fi

    # Test gzip integrity
    if gzip -t "$backup_path" 2>/dev/null; then
        log "Backup file verification successful"
        return 0
    else
        error "Backup file is corrupted or invalid"
        return 1
    fi
}

create_pre_restore_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pre_restore_backup="${BACKUP_DIR}/pre_restore_${DB_NAME}_${timestamp}.sql.gz"

    log "Creating pre-restore backup of current database..."

    PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --compress=0 | gzip -9 > "$pre_restore_backup"

    if [ $? -eq 0 ]; then
        log "Pre-restore backup created: $(basename $pre_restore_backup)"
        echo "$pre_restore_backup"
        return 0
    else
        error "Pre-restore backup failed"
        return 1
    fi
}

restore_database() {
    local backup_path=$1
    local drop_existing=${2:-false}

    log "Starting database restore from: $(basename $backup_path)"

    # Drop existing database if requested
    if [ "$drop_existing" = "true" ]; then
        log "Dropping existing database: ${DB_NAME}"

        PGPASSWORD="${DB_PASSWORD:-}" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="postgres" \
            -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" 2>/dev/null || true

        PGPASSWORD="${DB_PASSWORD:-}" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="postgres" \
            -c "DROP DATABASE IF EXISTS ${DB_NAME};"

        PGPASSWORD="${DB_PASSWORD:-}" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="postgres" \
            -c "CREATE DATABASE ${DB_NAME};"
    fi

    # Restore from backup
    log "Restoring database from backup..."

    gunzip -c "$backup_path" | PGPASSWORD="${DB_PASSWORD:-}" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --single-transaction \
        2>&1 | tee "${BACKUP_DIR}/restore.log"

    if [ ${PIPESTATUS[1]} -eq 0 ]; then
        log "Database restore completed successfully"
        return 0
    else
        error "Database restore failed - check ${BACKUP_DIR}/restore.log for details"
        return 1
    fi
}

perform_post_restore_checks() {
    log "Running post-restore verification checks..."

    # Check table counts
    local table_count=$(PGPASSWORD="${DB_PASSWORD:-}" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log "Tables found: ${table_count}"

    # Check critical tables
    local critical_tables=("Product" "Video" "Publication" "ProductAnalytics")

    for table in "${critical_tables[@]}"; do
        local count=$(PGPASSWORD="${DB_PASSWORD:-}" psql \
            --host="$DB_HOST" \
            --port="$DB_PORT" \
            --username="$DB_USER" \
            --dbname="$DB_NAME" \
            -t -c "SELECT COUNT(*) FROM \"${table}\";" 2>/dev/null | xargs || echo "0")

        log "  ${table}: ${count} records"
    done

    # Run ANALYZE to update statistics
    log "Updating table statistics..."
    PGPASSWORD="${DB_PASSWORD:-}" psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        -c "ANALYZE;" 2>&1 | tee -a "${BACKUP_DIR}/restore.log"
}

# ============================================================================
# Main Execution
# ============================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Restore PostgreSQL database from backup

OPTIONS:
    -l, --list              List available backups (local)
    -c, --cloud             List cloud backups
    -f, --file FILE         Restore from specific backup file
    -d, --date DATE         Download and restore from cloud backup (YYYY-MM-DD)
    -n, --name NAME         Backup filename (required with --date)
    -r, --drop              Drop existing database before restore
    -h, --help              Show this help message

EXAMPLES:
    # List available backups
    $0 --list

    # Restore from local backup
    $0 --file /var/backups/postgresql/daily/daily_db_20231231_020000.sql.gz

    # Restore from cloud backup
    $0 --date 2023-12-31 --name daily_db_20231231_020000.sql.gz

    # Restore and drop existing database
    $0 --file backup.sql.gz --drop

EOF
}

main() {
    local backup_file=""
    local backup_date=""
    local backup_name=""
    local drop_existing=false
    local list_mode=false
    local cloud_mode=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                list_mode=true
                shift
                ;;
            -c|--cloud)
                cloud_mode=true
                shift
                ;;
            -f|--file)
                backup_file="$2"
                shift 2
                ;;
            -d|--date)
                backup_date="$2"
                shift 2
                ;;
            -n|--name)
                backup_name="$2"
                shift 2
                ;;
            -r|--drop)
                drop_existing=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # List mode
    if [ "$list_mode" = true ]; then
        list_available_backups
        exit 0
    fi

    # Cloud list mode
    if [ "$cloud_mode" = true ]; then
        list_cloud_backups
        exit 0
    fi

    # Download from cloud
    if [ -n "$backup_date" ] && [ -n "$backup_name" ]; then
        mkdir -p "${BACKUP_DIR}/restore"
        download_from_cloud "$backup_date" "$backup_name"
        backup_file="${BACKUP_DIR}/restore/${backup_name}"
    fi

    # Validate backup file
    if [ -z "$backup_file" ]; then
        error "No backup file specified"
        show_usage
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi

    # Verify backup
    if ! verify_backup_file "$backup_file"; then
        exit 1
    fi

    # Confirmation prompt
    echo ""
    echo "⚠️  WARNING: You are about to restore the database!"
    echo ""
    echo "Database: ${DB_NAME}"
    echo "Host: ${DB_HOST}:${DB_PORT}"
    echo "Backup: $(basename $backup_file)"
    echo "Size: $(du -h "$backup_file" | cut -f1)"
    echo "Drop existing: ${drop_existing}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [ "$confirmation" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi

    # Create pre-restore backup
    PRE_RESTORE_BACKUP=$(create_pre_restore_backup)

    if [ $? -ne 0 ]; then
        error "Failed to create pre-restore backup - aborting"
        exit 1
    fi

    # Perform restore
    if restore_database "$backup_file" "$drop_existing"; then
        # Post-restore checks
        perform_post_restore_checks

        # Success notification
        REPORT="Database: ${DB_NAME}
Restored from: $(basename $backup_file)
Pre-restore backup: $(basename $PRE_RESTORE_BACKUP)
Status: SUCCESS"

        send_notification "SUCCESS" "$REPORT"

        log "✅ Database restore completed successfully"
        log "Pre-restore backup saved at: $PRE_RESTORE_BACKUP"
    else
        # Failure notification
        send_notification "FAILED" "Database restore failed for ${DB_NAME}"

        error "Database restore failed"
        log "You can rollback using: $0 --file $PRE_RESTORE_BACKUP"
        exit 1
    fi
}

# Create restore directory
mkdir -p "${BACKUP_DIR}/restore"

# Run main function
main "$@"
