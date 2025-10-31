#!/bin/bash

###############################################################################
# Backup Integrity Verification Script
#
# Purpose: Comprehensive verification of database backup integrity
# Validates backup files without affecting production systems
#
# Usage: ./verify-backup-integrity.sh [OPTIONS]
# Options:
#   -b, --backup FILE     Backup file to verify (required)
#   -d, --detailed        Perform detailed analysis
#   -r, --report FILE     Save report to file
#   -q, --quiet           Minimal output
#   -h, --help            Show this help message
#
# Examples:
#   ./verify-backup-integrity.sh -b ./backups/backup_production_20241031.sql.gz
#   ./verify-backup-integrity.sh -b ./backups/latest.sql -d -r report.txt
#   ./verify-backup-integrity.sh -b s3://bucket/backup.sql.gz
#
# Exit Codes:
#   0 - Backup is valid
#   1 - Missing dependencies
#   2 - Invalid arguments
#   3 - Backup file not found
#   4 - Integrity check failed
#   5 - Verification failed
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
BACKUP_FILE=""
DETAILED=false
REPORT_FILE=""
QUIET=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="/tmp/backup_verify_$$"

# Verification results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log_info() {
    if [[ "$QUIET" != true ]]; then
        echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    fi
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

log_check() {
    local status=$1
    local message=$2

    ((TOTAL_CHECKS++))

    case $status in
        PASS)
            ((PASSED_CHECKS++))
            log_success "✓ $message"
            ;;
        FAIL)
            ((FAILED_CHECKS++))
            log_error "✗ $message"
            ;;
        WARN)
            ((WARNING_CHECKS++))
            log_warning "⚠ $message"
            ;;
    esac
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
            -b|--backup)
                BACKUP_FILE="$2"
                shift 2
                ;;
            -d|--detailed)
                DETAILED=true
                shift
                ;;
            -r|--report)
                REPORT_FILE="$2"
                shift 2
                ;;
            -q|--quiet)
                QUIET=true
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

    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file is required. Use -b option"
        exit 2
    fi
}

# Check required dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    if ! command -v file &> /dev/null; then
        missing_deps+=("file")
    fi

    if ! command -v gunzip &> /dev/null; then
        missing_deps+=("gunzip")
    fi

    if ! command -v sha256sum &> /dev/null && ! command -v shasum &> /dev/null; then
        missing_deps+=("sha256sum or shasum")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            log_error "  - $dep"
        done
        exit 1
    fi

    log_info "All dependencies satisfied"
}

# Create temp directory
setup_temp_dir() {
    mkdir -p "$TEMP_DIR"
}

# Download backup from S3 if needed
download_from_s3() {
    if [[ ! "$BACKUP_FILE" =~ ^s3:// ]]; then
        return 0
    fi

    log_info "Downloading backup from S3..."

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI required for S3 downloads"
        exit 1
    fi

    local temp_file="$TEMP_DIR/$(basename "$BACKUP_FILE")"

    if ! aws s3 cp "$BACKUP_FILE" "$temp_file"; then
        log_error "Failed to download from S3"
        exit 3
    fi

    BACKUP_FILE="$temp_file"
    log_success "Downloaded from S3"
}

# Check 1: File exists and is readable
check_file_exists() {
    log_info "Check 1: File existence and readability"

    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_check FAIL "File does not exist: $BACKUP_FILE"
        exit 3
    fi

    if [[ ! -r "$BACKUP_FILE" ]]; then
        log_check FAIL "File is not readable: $BACKUP_FILE"
        exit 3
    fi

    log_check PASS "File exists and is readable"
}

# Check 2: File size validation
check_file_size() {
    log_info "Check 2: File size validation"

    local file_size_bytes=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    local file_size_human=$(du -h "$BACKUP_FILE" | cut -f1)

    log_info "File size: $file_size_human ($file_size_bytes bytes)"

    # Minimum size check (1 KB)
    if [[ $file_size_bytes -lt 1024 ]]; then
        log_check FAIL "File is too small (< 1 KB)"
        return 1
    fi

    # Maximum reasonable size check (10 GB)
    if [[ $file_size_bytes -gt 10737418240 ]]; then
        log_check WARN "File is very large (> 10 GB)"
    else
        log_check PASS "File size is reasonable"
    fi
}

# Check 3: File type validation
check_file_type() {
    log_info "Check 3: File type validation"

    local file_type=$(file -b "$BACKUP_FILE")
    log_info "File type: $file_type"

    if [[ "$file_type" =~ gzip|compressed ]]; then
        log_check PASS "File is gzip compressed"
        export IS_COMPRESSED=true
    elif [[ "$file_type" =~ ASCII|text ]]; then
        log_check PASS "File is plain text SQL"
        export IS_COMPRESSED=false
    else
        log_check WARN "Unknown file type: $file_type"
    fi
}

# Check 4: Compression integrity
check_compression_integrity() {
    if [[ "${IS_COMPRESSED:-false}" != true ]]; then
        log_info "Check 4: Skipped (file not compressed)"
        return 0
    fi

    log_info "Check 4: Compression integrity"

    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_check PASS "Gzip compression is valid"
    else
        log_check FAIL "Gzip compression is corrupted"
        return 1
    fi
}

# Check 5: Metadata validation
check_metadata() {
    log_info "Check 5: Metadata file validation"

    local meta_file="${BACKUP_FILE}.meta"

    if [[ -f "$meta_file" ]]; then
        log_check PASS "Metadata file found"

        # Validate metadata content
        if grep -q "BACKUP_TIMESTAMP=" "$meta_file" && \
           grep -q "BACKUP_DATABASE=" "$meta_file"; then
            log_check PASS "Metadata content is valid"

            # Display key metadata
            if [[ "$QUIET" != true ]]; then
                log_info "Metadata details:"
                grep "BACKUP_" "$meta_file" | while read -r line; do
                    log_info "  $line"
                done
            fi
        else
            log_check WARN "Metadata content is incomplete"
        fi
    else
        log_check WARN "Metadata file not found"
    fi
}

# Check 6: Checksum validation
check_checksum() {
    log_info "Check 6: Checksum calculation"

    local checksum_file="${BACKUP_FILE}.sha256"

    # Calculate current checksum
    local current_checksum
    if command -v sha256sum &> /dev/null; then
        current_checksum=$(sha256sum "$BACKUP_FILE" | cut -d' ' -f1)
    else
        current_checksum=$(shasum -a 256 "$BACKUP_FILE" | cut -d' ' -f1)
    fi

    log_info "SHA256: $current_checksum"

    # Compare with stored checksum if available
    if [[ -f "$checksum_file" ]]; then
        local stored_checksum=$(cat "$checksum_file" | cut -d' ' -f1)

        if [[ "$current_checksum" == "$stored_checksum" ]]; then
            log_check PASS "Checksum matches stored value"
        else
            log_check FAIL "Checksum mismatch (file may be corrupted)"
            return 1
        fi
    else
        log_check WARN "No stored checksum for comparison"

        # Create checksum file for future verification
        echo "$current_checksum  $(basename "$BACKUP_FILE")" > "$checksum_file"
        log_info "Created checksum file: $checksum_file"
    fi
}

# Check 7: SQL content validation
check_sql_content() {
    log_info "Check 7: SQL content validation"

    # Decompress if needed
    local test_file="$BACKUP_FILE"
    if [[ "${IS_COMPRESSED:-false}" == true ]]; then
        test_file="$TEMP_DIR/$(basename "${BACKUP_FILE%.gz}")"
        gunzip -c "$BACKUP_FILE" > "$test_file"
    fi

    # Check for PostgreSQL dump header
    if head -n 20 "$test_file" | grep -q "PostgreSQL database dump"; then
        log_check PASS "Valid PostgreSQL dump header found"
    else
        log_check WARN "PostgreSQL dump header not found"
    fi

    # Check for essential SQL statements
    local has_create=$(grep -c "CREATE TABLE" "$test_file" 2>/dev/null || echo "0")
    local has_insert=$(grep -c "INSERT INTO" "$test_file" 2>/dev/null || echo "0")
    local has_copy=$(grep -c "COPY" "$test_file" 2>/dev/null || echo "0")

    log_info "CREATE TABLE statements: $has_create"
    log_info "INSERT INTO statements: $has_insert"
    log_info "COPY statements: $has_copy"

    if [[ $has_create -gt 0 ]]; then
        log_check PASS "CREATE TABLE statements found"
    else
        log_check WARN "No CREATE TABLE statements found"
    fi

    if [[ $((has_insert + has_copy)) -gt 0 ]]; then
        log_check PASS "Data insertion statements found"
    else
        log_check WARN "No data insertion statements found"
    fi

    # Clean up decompressed file
    if [[ "$test_file" != "$BACKUP_FILE" ]]; then
        rm -f "$test_file"
    fi
}

# Check 8: Detailed schema analysis (optional)
check_detailed_schema() {
    if [[ "$DETAILED" != true ]]; then
        log_info "Check 8: Skipped (use -d for detailed analysis)"
        return 0
    fi

    log_info "Check 8: Detailed schema analysis"

    # Decompress if needed
    local test_file="$BACKUP_FILE"
    if [[ "${IS_COMPRESSED:-false}" == true ]]; then
        test_file="$TEMP_DIR/$(basename "${BACKUP_FILE%.gz}")"
        if [[ ! -f "$test_file" ]]; then
            gunzip -c "$BACKUP_FILE" > "$test_file"
        fi
    fi

    # Analyze table structure
    local tables=$(grep "CREATE TABLE" "$test_file" | sed 's/.*CREATE TABLE //' | sed 's/ .*//' | sort)

    if [[ -n "$tables" ]]; then
        log_check PASS "Schema analysis completed"

        if [[ "$QUIET" != true ]]; then
            log_info "Tables found:"
            echo "$tables" | while read -r table; do
                log_info "  - $table"
            done
        fi

        # Expected tables for AI Affiliate Empire
        local expected_tables=("Product" "Video" "Publication" "Blog" "ProductAnalytics" "PlatformAnalytics" "AffiliateNetwork")
        local missing_tables=()

        for expected in "${expected_tables[@]}"; do
            if ! echo "$tables" | grep -qi "\"$expected\""; then
                missing_tables+=("$expected")
            fi
        done

        if [ ${#missing_tables[@]} -eq 0 ]; then
            log_check PASS "All expected tables present"
        else
            log_check WARN "Missing expected tables: ${missing_tables[*]}"
        fi
    else
        log_check FAIL "No tables found in backup"
    fi

    # Clean up decompressed file
    if [[ "$test_file" != "$BACKUP_FILE" ]]; then
        rm -f "$test_file"
    fi
}

# Check 9: Age validation
check_backup_age() {
    log_info "Check 9: Backup age validation"

    local file_time=$(stat -f%m "$BACKUP_FILE" 2>/dev/null || stat -c%Y "$BACKUP_FILE" 2>/dev/null)
    local current_time=$(date +%s)
    local age_seconds=$((current_time - file_time))
    local age_days=$((age_seconds / 86400))
    local age_hours=$(((age_seconds % 86400) / 3600))

    log_info "Backup age: $age_days days, $age_hours hours"

    # Check against RPO target (1 day)
    if [[ $age_days -eq 0 ]]; then
        log_check PASS "Backup is fresh (< 1 day old)"
    elif [[ $age_days -eq 1 ]]; then
        log_check PASS "Backup is within RPO target (1 day)"
    elif [[ $age_days -lt 7 ]]; then
        log_check WARN "Backup is older than RPO target (${age_days} days)"
    else
        log_check WARN "Backup is stale (${age_days} days old)"
    fi
}

# Generate verification report
generate_report() {
    log_info "Generating verification report..."

    local report_content
    report_content=$(cat <<EOF
==========================================
BACKUP INTEGRITY VERIFICATION REPORT
==========================================

Verification Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

Backup File Information:
  Path: $BACKUP_FILE
  Size: $(du -h "$BACKUP_FILE" | cut -f1)
  Type: $(file -b "$BACKUP_FILE")
  Modified: $(stat -f%Sm -t '%Y-%m-%d %H:%M:%S' "$BACKUP_FILE" 2>/dev/null || stat -c%y "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1)

Verification Results:
  Total Checks: $TOTAL_CHECKS
  Passed: $PASSED_CHECKS
  Failed: $FAILED_CHECKS
  Warnings: $WARNING_CHECKS

Status: $(if [[ $FAILED_CHECKS -eq 0 ]]; then echo "VALID"; else echo "INVALID"; fi)

Recommendation:
$(if [[ $FAILED_CHECKS -eq 0 ]] && [[ $WARNING_CHECKS -eq 0 ]]; then
    echo "  ✓ Backup is valid and can be used for restoration"
elif [[ $FAILED_CHECKS -eq 0 ]]; then
    echo "  ⚠ Backup is valid but has warnings - review before use"
else
    echo "  ✗ Backup has integrity issues - DO NOT use for restoration"
fi)

==========================================
EOF
)

    echo "$report_content"

    # Save to file if specified
    if [[ -n "$REPORT_FILE" ]]; then
        echo "$report_content" > "$REPORT_FILE"
        log_success "Report saved to: $REPORT_FILE"
    fi
}

# Cleanup temporary files
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Main execution
main() {
    # Set up cleanup trap
    trap cleanup EXIT

    log_info "=========================================="
    log_info "BACKUP INTEGRITY VERIFICATION"
    log_info "=========================================="

    parse_arguments "$@"
    check_dependencies
    setup_temp_dir
    download_from_s3

    # Run all checks
    check_file_exists
    check_file_size
    check_file_type
    check_compression_integrity
    check_metadata
    check_checksum
    check_sql_content
    check_detailed_schema
    check_backup_age

    # Generate report
    echo ""
    generate_report

    # Determine exit code
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "=========================================="
        log_success "VERIFICATION COMPLETED: BACKUP IS VALID"
        log_success "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "VERIFICATION FAILED: BACKUP IS INVALID"
        log_error "=========================================="
        exit 4
    fi
}

# Run main function
main "$@"
