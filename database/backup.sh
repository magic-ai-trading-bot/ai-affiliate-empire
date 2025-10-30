#!/bin/bash
# ============================================================================
# PostgreSQL Database Backup Script
# AI Affiliate Empire - Production Database Backup
# ============================================================================
# Purpose: Automated database backups with retention policy
# Schedule: Daily full backups + hourly incremental (WAL archiving)
# Retention: 7 daily, 4 weekly, 12 monthly backups
# Location: Local + S3/R2 cloud storage
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
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_RETENTION_WEEKS="${BACKUP_RETENTION_WEEKS:-4}"
BACKUP_RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-12}"

# Database configuration
DB_NAME="${DB_NAME:-ai_affiliate_empire}"
DB_USER="${DB_USER:-user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Cloud storage (Cloudflare R2 or S3)
CLOUD_BACKUP_ENABLED="${CLOUD_BACKUP_ENABLED:-true}"
R2_BUCKET="${R2_BUCKET_NAME:-ai-affiliate-backups}"
R2_ENDPOINT="${R2_ENDPOINT:-https://your-account-id.r2.cloudflarestorage.com}"

# Notification
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y-%m-%d")
YEAR_MONTH=$(date +"%Y-%m")

# Backup file names
DAILY_BACKUP="daily_${DB_NAME}_${TIMESTAMP}.sql.gz"
WEEKLY_BACKUP="weekly_${DB_NAME}_$(date +%Y_W%U).sql.gz"
MONTHLY_BACKUP="monthly_${DB_NAME}_${YEAR_MONTH}.sql.gz"

# ============================================================================
# Functions
# ============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${BACKUP_DIR}/backup.log"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${BACKUP_DIR}/backup.log" >&2
}

send_notification() {
    local status=$1
    local message=$2

    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{\"content\": \"🗄️ **Database Backup $status**\n\`\`\`\n$message\n\`\`\`\"}" \
             "$DISCORD_WEBHOOK" 2>/dev/null || true
    fi
}

check_dependencies() {
    local deps=("pg_dump" "gzip" "aws")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep is not installed"
            exit 1
        fi
    done
}

create_backup_dirs() {
    mkdir -p "${BACKUP_DIR}"/{daily,weekly,monthly,wal}
    log "Backup directories created/verified"
}

perform_backup() {
    local backup_file=$1
    local backup_path="${BACKUP_DIR}/daily/${backup_file}"

    log "Starting database backup: ${backup_file}"

    # Perform backup with compression
    PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --verbose \
        --no-owner \
        --no-acl \
        --compress=0 \
        2>> "${BACKUP_DIR}/backup.log" | gzip -9 > "$backup_path"

    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_path" | cut -f1)
        log "Backup completed successfully: ${backup_file} (${size})"
        return 0
    else
        error "Backup failed: ${backup_file}"
        return 1
    fi
}

create_weekly_backup() {
    # Create weekly backup on Sundays
    if [ "$(date +%u)" -eq 7 ]; then
        local weekly_path="${BACKUP_DIR}/weekly/${WEEKLY_BACKUP}"
        log "Creating weekly backup"
        cp "${BACKUP_DIR}/daily/${DAILY_BACKUP}" "$weekly_path"
        log "Weekly backup created: ${WEEKLY_BACKUP}"
    fi
}

create_monthly_backup() {
    # Create monthly backup on the 1st of each month
    if [ "$(date +%d)" -eq 01 ]; then
        local monthly_path="${BACKUP_DIR}/monthly/${MONTHLY_BACKUP}"
        log "Creating monthly backup"
        cp "${BACKUP_DIR}/daily/${DAILY_BACKUP}" "$monthly_path"
        log "Monthly backup created: ${MONTHLY_BACKUP}"
    fi
}

upload_to_cloud() {
    if [ "$CLOUD_BACKUP_ENABLED" != "true" ]; then
        log "Cloud backup disabled, skipping upload"
        return 0
    fi

    local backup_file=$1
    local backup_path="${BACKUP_DIR}/daily/${backup_file}"

    log "Uploading backup to cloud storage: ${R2_BUCKET}"

    # Upload to R2/S3 using AWS CLI (compatible with R2)
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws s3 cp "$backup_path" \
        "s3://${R2_BUCKET}/backups/${DATE}/${backup_file}" \
        --endpoint-url="$R2_ENDPOINT" \
        2>> "${BACKUP_DIR}/backup.log"

    if [ $? -eq 0 ]; then
        log "Cloud upload successful"
        return 0
    else
        error "Cloud upload failed"
        return 1
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups"

    # Remove daily backups older than retention period
    find "${BACKUP_DIR}/daily" -name "daily_*.sql.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
    log "Removed daily backups older than ${BACKUP_RETENTION_DAYS} days"

    # Remove weekly backups older than retention period
    find "${BACKUP_DIR}/weekly" -name "weekly_*.sql.gz" -type f -mtime +$((BACKUP_RETENTION_WEEKS * 7)) -delete
    log "Removed weekly backups older than ${BACKUP_RETENTION_WEEKS} weeks"

    # Remove monthly backups older than retention period
    find "${BACKUP_DIR}/monthly" -name "monthly_*.sql.gz" -type f -mtime +$((BACKUP_RETENTION_MONTHS * 30)) -delete
    log "Removed monthly backups older than ${BACKUP_RETENTION_MONTHS} months"
}

verify_backup() {
    local backup_file=$1
    local backup_path="${BACKUP_DIR}/daily/${backup_file}"

    log "Verifying backup integrity: ${backup_file}"

    # Test gzip integrity
    if gzip -t "$backup_path" 2>> "${BACKUP_DIR}/backup.log"; then
        log "Backup verification successful"
        return 0
    else
        error "Backup verification failed - file may be corrupted"
        return 1
    fi
}

generate_backup_report() {
    log "Generating backup report"

    cat << EOF

=================================================================
Database Backup Report - $(date)
=================================================================

Database: ${DB_NAME}
Backup File: ${DAILY_BACKUP}
Backup Size: $(du -h "${BACKUP_DIR}/daily/${DAILY_BACKUP}" | cut -f1)

Backup Statistics:
------------------
Daily Backups:   $(find "${BACKUP_DIR}/daily" -name "*.sql.gz" | wc -l) files
Weekly Backups:  $(find "${BACKUP_DIR}/weekly" -name "*.sql.gz" | wc -l) files
Monthly Backups: $(find "${BACKUP_DIR}/monthly" -name "*.sql.gz" | wc -l) files

Total Backup Size: $(du -sh "${BACKUP_DIR}" | cut -f1)

Latest 5 Backups:
-----------------
$(find "${BACKUP_DIR}/daily" -name "*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | head -5 | cut -d' ' -f2- | xargs ls -lh)

Cloud Backup: $([ "$CLOUD_BACKUP_ENABLED" = "true" ] && echo "Enabled" || echo "Disabled")
Status: SUCCESS

=================================================================
EOF
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log "Starting database backup process"

    # Check dependencies
    check_dependencies

    # Create backup directories
    create_backup_dirs

    # Perform backup
    if ! perform_backup "$DAILY_BACKUP"; then
        send_notification "FAILED" "Database backup failed for ${DB_NAME}"
        exit 1
    fi

    # Verify backup
    if ! verify_backup "$DAILY_BACKUP"; then
        send_notification "FAILED" "Backup verification failed for ${DB_NAME}"
        exit 1
    fi

    # Create weekly backup if needed
    create_weekly_backup

    # Create monthly backup if needed
    create_monthly_backup

    # Upload to cloud storage
    if [ "$CLOUD_BACKUP_ENABLED" = "true" ]; then
        upload_to_cloud "$DAILY_BACKUP"
    fi

    # Cleanup old backups
    cleanup_old_backups

    # Generate report
    REPORT=$(generate_backup_report)
    echo "$REPORT"

    # Send success notification
    send_notification "SUCCESS" "$(echo "$REPORT" | tail -n 15)"

    log "Backup process completed successfully"
}

# Run main function
main "$@"

# ============================================================================
# CRON SCHEDULE
# ============================================================================
# Add to crontab for automated backups:
#
# Daily full backup at 2 AM:
# 0 2 * * * /path/to/backup.sh >> /var/log/db-backup.log 2>&1
#
# Hourly incremental (WAL archiving) - configure in postgresql.conf:
# archive_mode = on
# archive_command = 'cp %p /var/backups/postgresql/wal/%f'
# wal_level = replica
# ============================================================================
