#!/bin/bash

##############################################################################
# Backup Status Monitoring Script
#
# Checks the age and presence of database backups
# Sends alerts if backups are missing or too old
#
# Usage: ./check-backup-status.sh [backup_dir] [max_age_hours]
# Example: ./check-backup-status.sh ./backups 24
##############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
MAX_AGE_HOURS="${2:-${BACKUP_MAX_AGE_HOURS:-24}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

# Main check
main() {
    echo ""
    log_info "=========================================="
    log_info "BACKUP STATUS CHECK"
    log_info "=========================================="
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Maximum age: ${MAX_AGE_HOURS}h"
    log_info ""

    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        echo ""

        if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
            bash "$SCRIPT_DIR/send-discord-alert.sh" \
                "critical" \
                "Backup Directory Missing" \
                "Backup directory not found: $BACKUP_DIR"
        fi

        exit 1
    fi

    # Find most recent backup
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -print0 | \
        xargs -0 ls -t 2>/dev/null | head -1 || echo "")

    if [[ -z "$LATEST_BACKUP" ]]; then
        log_error "No backups found in $BACKUP_DIR"
        echo ""

        if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
            bash "$SCRIPT_DIR/send-discord-alert.sh" \
                "critical" \
                "Backup Missing" \
                "No database backups found in $BACKUP_DIR"
        fi

        exit 1
    fi

    # Get backup info
    BACKUP_NAME=$(basename "$LATEST_BACKUP")
    BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)

    # Get backup age
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        BACKUP_TIME=$(stat -f %m "$LATEST_BACKUP")
    else
        # Linux
        BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP")
    fi

    CURRENT_TIME=$(date +%s)
    AGE_SECONDS=$((CURRENT_TIME - BACKUP_TIME))
    AGE_HOURS=$((AGE_SECONDS / 3600))
    AGE_MINUTES=$(( (AGE_SECONDS % 3600) / 60 ))

    log_info "Latest backup: $BACKUP_NAME"
    log_info "Size: $BACKUP_SIZE"
    log_info "Age: ${AGE_HOURS}h ${AGE_MINUTES}m"

    echo ""
    log_info "=========================================="

    # Check if backup is too old
    if (( AGE_HOURS > MAX_AGE_HOURS )); then
        log_error "Backup is too old (${AGE_HOURS}h > ${MAX_AGE_HOURS}h)"
        echo ""

        if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
            bash "$SCRIPT_DIR/send-discord-alert.sh" \
                "warning" \
                "Backup Outdated" \
                "Last backup is ${AGE_HOURS}h ${AGE_MINUTES}m old (threshold: ${MAX_AGE_HOURS}h)\nBackup: $BACKUP_NAME\nSize: $BACKUP_SIZE"
        fi

        exit 1
    else
        log_success "Backup is current"
        echo ""
        exit 0
    fi
}

# Run main
main "$@"
