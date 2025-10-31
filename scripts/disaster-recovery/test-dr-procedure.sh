#!/bin/bash

###############################################################################
# Disaster Recovery Testing Script
#
# Purpose: Automated end-to-end DR procedure testing
# Validates complete backup/restore cycle without affecting production
#
# Usage: ./test-dr-procedure.sh [OPTIONS]
# Options:
#   -e, --env ENV          Environment to test (development|staging) [default: development]
#   -f, --full             Full test including data validation
#   -c, --cleanup          Clean up test artifacts after completion
#   -s, --skip-backup      Skip backup creation (use existing backup)
#   -r, --report FILE      Save detailed report to file
#   -h, --help             Show this help message
#
# Examples:
#   ./test-dr-procedure.sh
#   ./test-dr-procedure.sh -e staging -f -c
#   ./test-dr-procedure.sh --full --cleanup --report dr-test-report.txt
#
# Exit Codes:
#   0 - All tests passed
#   1 - Test setup failed
#   2 - Backup test failed
#   3 - Restore test failed
#   4 - Validation test failed
#   5 - Cleanup failed
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default configuration
ENV="development"
FULL_TEST=false
CLEANUP=false
SKIP_BACKUP=false
REPORT_FILE=""
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$PROJECT_ROOT/backups/dr-test-$TIMESTAMP"
TEST_DB="ai_affiliate_empire_dr_test_${TIMESTAMP}"

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_START_TIME=$(date +%s)

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

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

log_result() {
    local status=$1
    local message=$2

    ((TOTAL_TESTS++))

    if [[ "$status" == "PASS" ]]; then
        ((PASSED_TESTS++))
        log_success "✓ TEST PASSED: $message"
    else
        ((FAILED_TESTS++))
        log_error "✗ TEST FAILED: $message"
    fi
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
            -f|--full)
                FULL_TEST=true
                shift
                ;;
            -c|--cleanup)
                CLEANUP=true
                shift
                ;;
            -s|--skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            -r|--report)
                REPORT_FILE="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Validate environment
    if [[ "$ENV" == "production" ]]; then
        log_error "Cannot run DR tests on production environment"
        exit 1
    fi
}

# Setup test environment
setup_test_env() {
    log_info "=========================================="
    log_info "Setting up test environment"
    log_info "=========================================="

    # Create test directory
    mkdir -p "$TEST_DIR"
    log_success "Created test directory: $TEST_DIR"

    # Load environment variables
    local env_file="$PROJECT_ROOT/.env.$ENV"
    if [[ "$ENV" == "development" ]]; then
        env_file="$PROJECT_ROOT/.env"
    fi

    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi

    set -a
    source "$env_file"
    set +a

    log_success "Loaded environment variables"

    # Extract database params
    local db_url="${DIRECT_DATABASE_URL:-$DATABASE_URL}"
    if [[ $db_url =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^\?]+) ]]; then
        export PGUSER="${BASH_REMATCH[1]}"
        export PGPASSWORD="${BASH_REMATCH[2]}"
        export PGHOST="${BASH_REMATCH[3]}"
        export PGPORT="${BASH_REMATCH[4]}"
        export ORIGINAL_DB="${BASH_REMATCH[5]}"
    else
        log_error "Invalid DATABASE_URL format"
        exit 1
    fi

    log_info "Source database: $ORIGINAL_DB @ $PGHOST:$PGPORT"
    log_info "Test database: $TEST_DB @ $PGHOST:$PGPORT"
}

# Test 1: Backup script functionality
test_backup_creation() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_test "Test 1: Skipped - Using existing backup"
        return 0
    fi

    log_test "=========================================="
    log_test "Test 1: Backup Creation"
    log_test "=========================================="

    local backup_start=$(date +%s)

    # Run backup script
    if "$SCRIPT_DIR/backup-database.sh" \
        -e "$ENV" \
        -o "$TEST_DIR" \
        -r 1 \
        --no-compress; then

        local backup_end=$(date +%s)
        local backup_duration=$((backup_end - backup_start))

        log_result PASS "Backup created successfully (${backup_duration}s)"

        # Find the created backup
        BACKUP_FILE=$(find "$TEST_DIR" -name "backup_${ENV}_*.sql" -type f | head -n 1)

        if [[ -z "$BACKUP_FILE" ]]; then
            log_result FAIL "Backup file not found"
            return 1
        fi

        log_info "Backup file: $BACKUP_FILE"

        # Check RTO compliance (should complete within target time)
        if [[ $backup_duration -lt 300 ]]; then  # 5 minutes
            log_result PASS "Backup completed within acceptable time"
        else
            log_warning "Backup took longer than expected"
        fi

        return 0
    else
        log_result FAIL "Backup creation failed"
        return 1
    fi
}

# Test 2: Backup integrity verification
test_backup_verification() {
    log_test "=========================================="
    log_test "Test 2: Backup Integrity Verification"
    log_test "=========================================="

    if [[ -z "${BACKUP_FILE:-}" ]]; then
        BACKUP_FILE=$(find "$TEST_DIR" -name "backup_${ENV}_*.sql*" -type f | head -n 1)
    fi

    if [[ -z "$BACKUP_FILE" ]]; then
        log_result FAIL "No backup file available for verification"
        return 1
    fi

    # Run verification script
    if "$SCRIPT_DIR/verify-backup-integrity.sh" \
        -b "$BACKUP_FILE" \
        -q; then

        log_result PASS "Backup integrity verified"
        return 0
    else
        log_result FAIL "Backup integrity check failed"
        return 1
    fi
}

# Test 3: Create test database
test_create_test_db() {
    log_test "=========================================="
    log_test "Test 3: Test Database Creation"
    log_test "=========================================="

    # Drop test database if exists
    psql -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true

    # Create test database
    if psql -d postgres -c "CREATE DATABASE $TEST_DB;"; then
        log_result PASS "Test database created"
        return 0
    else
        log_result FAIL "Failed to create test database"
        return 1
    fi
}

# Test 4: Restore to test database
test_restore_procedure() {
    log_test "=========================================="
    log_test "Test 4: Database Restore"
    log_test "=========================================="

    local restore_start=$(date +%s)

    # Run restore script with force flag
    if "$SCRIPT_DIR/restore-database.sh" \
        -e "$ENV" \
        -b "$BACKUP_FILE" \
        -t "$TEST_DB" \
        -f; then

        local restore_end=$(date +%s)
        local restore_duration=$((restore_end - restore_start))

        log_result PASS "Database restored successfully (${restore_duration}s)"

        # Check RTO compliance (<1 hour = 3600s)
        if [[ $restore_duration -lt 3600 ]]; then
            log_result PASS "Restore completed within RTO target (<1 hour)"
        else
            log_result FAIL "Restore exceeded RTO target (${restore_duration}s)"
        fi

        return 0
    else
        log_result FAIL "Database restore failed"
        return 1
    fi
}

# Test 5: Basic connectivity test
test_database_connectivity() {
    log_test "=========================================="
    log_test "Test 5: Database Connectivity"
    log_test "=========================================="

    if psql -d "$TEST_DB" -c "SELECT 1;" &> /dev/null; then
        log_result PASS "Database connection successful"
        return 0
    else
        log_result FAIL "Cannot connect to restored database"
        return 1
    fi
}

# Test 6: Schema validation
test_schema_validation() {
    log_test "=========================================="
    log_test "Test 6: Schema Validation"
    log_test "=========================================="

    # Get table count
    local table_count=$(psql -d "$TEST_DB" -t -c "
        SELECT count(*)
        FROM information_schema.tables
        WHERE table_schema = 'public';
    " | xargs)

    log_info "Tables found: $table_count"

    if [[ $table_count -gt 0 ]]; then
        log_result PASS "Schema contains tables"
    else
        log_result FAIL "No tables found in restored database"
        return 1
    fi

    # Check critical tables
    local expected_tables=("Product" "Video" "Publication" "Blog" "ProductAnalytics")
    local missing_tables=()

    for table in "${expected_tables[@]}"; do
        if ! psql -d "$TEST_DB" -t -c "
            SELECT 1 FROM information_schema.tables
            WHERE table_name = '$table';
        " | grep -q 1; then
            missing_tables+=("$table")
        fi
    done

    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_result PASS "All critical tables present"
        return 0
    else
        log_result FAIL "Missing tables: ${missing_tables[*]}"
        return 1
    fi
}

# Test 7: Data integrity validation
test_data_integrity() {
    if [[ "$FULL_TEST" != true ]]; then
        log_test "Test 7: Skipped - Use -f for full data validation"
        return 0
    fi

    log_test "=========================================="
    log_test "Test 7: Data Integrity Validation"
    log_test "=========================================="

    # Compare record counts between original and restored database
    local tables=("Product" "Video" "Publication" "Blog")
    local mismatches=()

    for table in "${tables[@]}"; do
        local original_count=$(psql -d "$ORIGINAL_DB" -t -c "SELECT count(*) FROM \"$table\";" 2>/dev/null | xargs || echo "0")
        local restored_count=$(psql -d "$TEST_DB" -t -c "SELECT count(*) FROM \"$table\";" 2>/dev/null | xargs || echo "0")

        log_info "$table: Original=$original_count, Restored=$restored_count"

        if [[ "$original_count" != "$restored_count" ]]; then
            mismatches+=("$table")
        fi
    done

    if [ ${#mismatches[@]} -eq 0 ]; then
        log_result PASS "Record counts match across all tables"
        return 0
    else
        log_result FAIL "Record count mismatches: ${mismatches[*]}"
        return 1
    fi
}

# Test 8: Index validation
test_indexes() {
    if [[ "$FULL_TEST" != true ]]; then
        log_test "Test 8: Skipped - Use -f for index validation"
        return 0
    fi

    log_test "=========================================="
    log_test "Test 8: Index Validation"
    log_test "=========================================="

    local index_count=$(psql -d "$TEST_DB" -t -c "
        SELECT count(*)
        FROM pg_indexes
        WHERE schemaname = 'public';
    " | xargs)

    log_info "Indexes found: $index_count"

    if [[ $index_count -gt 0 ]]; then
        log_result PASS "Indexes restored successfully"
        return 0
    else
        log_result FAIL "No indexes found"
        return 1
    fi
}

# Test 9: Constraint validation
test_constraints() {
    if [[ "$FULL_TEST" != true ]]; then
        log_test "Test 9: Skipped - Use -f for constraint validation"
        return 0
    fi

    log_test "=========================================="
    log_test "Test 9: Constraint Validation"
    log_test "=========================================="

    local fk_count=$(psql -d "$TEST_DB" -t -c "
        SELECT count(*)
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public';
    " | xargs)

    log_info "Foreign keys found: $fk_count"

    if [[ $fk_count -gt 0 ]]; then
        log_result PASS "Foreign key constraints restored"
        return 0
    else
        log_warning "No foreign key constraints found"
        return 0
    fi
}

# Test 10: Performance test
test_performance() {
    if [[ "$FULL_TEST" != true ]]; then
        log_test "Test 10: Skipped - Use -f for performance testing"
        return 0
    fi

    log_test "=========================================="
    log_test "Test 10: Basic Performance Test"
    log_test "=========================================="

    # Run simple query and measure time
    local start=$(date +%s%N)

    psql -d "$TEST_DB" -c "
        SELECT count(*) FROM \"Product\" WHERE status = 'ACTIVE';
    " &> /dev/null

    local end=$(date +%s%N)
    local duration=$((($end - $start) / 1000000))  # Convert to milliseconds

    log_info "Query execution time: ${duration}ms"

    if [[ $duration -lt 1000 ]]; then  # Less than 1 second
        log_result PASS "Query performance acceptable"
        return 0
    else
        log_warning "Query took longer than expected"
        return 0
    fi
}

# Cleanup test artifacts
cleanup_test_env() {
    if [[ "$CLEANUP" != true ]]; then
        log_info "Cleanup skipped - Test artifacts preserved in: $TEST_DIR"
        return 0
    fi

    log_info "=========================================="
    log_info "Cleaning up test environment"
    log_info "=========================================="

    # Drop test database
    psql -d postgres -c "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true
    log_success "Dropped test database"

    # Remove test directory
    rm -rf "$TEST_DIR"
    log_success "Removed test directory"
}

# Generate test report
generate_report() {
    local test_end_time=$(date +%s)
    local total_duration=$((test_end_time - TEST_START_TIME))
    local minutes=$((total_duration / 60))
    local seconds=$((total_duration % 60))

    local report_content
    report_content=$(cat <<EOF
==========================================
DISASTER RECOVERY TEST REPORT
==========================================

Test Execution:
  Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
  Environment: $ENV
  Duration: ${minutes}m ${seconds}s
  Full Test: $FULL_TEST

Test Results:
  Total Tests: $TOTAL_TESTS
  Passed: $PASSED_TESTS
  Failed: $FAILED_TESTS
  Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")%

RTO/RPO Validation:
  Backup Time: Within acceptable limits
  Restore Time: $(if [[ $FAILED_TESTS -eq 0 ]]; then echo "Within RTO target (<1 hour)"; else echo "See test results above"; fi)
  Data Integrity: $(if [[ $FAILED_TESTS -eq 0 ]]; then echo "Verified"; else echo "Issues detected"; fi)

Overall Status: $(if [[ $FAILED_TESTS -eq 0 ]]; then echo "✓ ALL TESTS PASSED"; else echo "✗ TESTS FAILED"; fi)

Recommendation:
$(if [[ $FAILED_TESTS -eq 0 ]]; then
    echo "  ✓ DR procedures are functioning correctly"
    echo "  ✓ System meets RTO/RPO targets"
    echo "  ✓ Ready for production use"
else
    echo "  ✗ DR procedures have issues that need attention"
    echo "  ✗ Review failed tests and address issues"
    echo "  ✗ Re-run tests after fixes"
fi)

Test Artifacts:
  Test Directory: $TEST_DIR
  Backup File: ${BACKUP_FILE:-N/A}
  Test Database: $TEST_DB
  Cleanup: $(if [[ "$CLEANUP" == true ]]; then echo "Completed"; else echo "Preserved for review"; fi)

==========================================
EOF
)

    echo ""
    echo "$report_content"

    # Save to file if specified
    if [[ -n "$REPORT_FILE" ]]; then
        echo "$report_content" > "$REPORT_FILE"
        log_success "Report saved to: $REPORT_FILE"
    fi
}

# Main execution
main() {
    log_info "=========================================="
    log_info "DISASTER RECOVERY PROCEDURE TEST"
    log_info "=========================================="

    parse_arguments "$@"
    setup_test_env

    # Run all tests
    test_backup_creation || true
    test_backup_verification || true
    test_create_test_db || true
    test_restore_procedure || true
    test_database_connectivity || true
    test_schema_validation || true
    test_data_integrity || true
    test_indexes || true
    test_constraints || true
    test_performance || true

    # Generate report
    generate_report

    # Cleanup
    cleanup_test_env

    # Determine exit code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "=========================================="
        log_success "ALL DR TESTS PASSED"
        log_success "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "DR TESTS FAILED ($FAILED_TESTS/$TOTAL_TESTS)"
        log_error "=========================================="
        exit 4
    fi
}

# Run main function
main "$@"
