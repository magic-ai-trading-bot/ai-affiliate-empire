#!/bin/bash

##############################################################################
# API Health Monitoring Script
#
# Checks critical API endpoints and sends alerts on failures
#
# Usage: ./check-api-health.sh [api_url]
# Example: ./check-api-health.sh http://localhost:3000
##############################################################################

set -euo pipefail

# Configuration
API_URL="${1:-${API_URL:-http://localhost:3000}}"
TIMEOUT=5
FAILURES=0
FAILED_ENDPOINTS=()

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

# Check endpoint
check_endpoint() {
    local endpoint=$1
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    local url="${API_URL}${endpoint}"

    log_info "Checking $method $endpoint..."

    if response=$(curl -s -w "\n%{http_code}" -X "$method" --max-time $TIMEOUT "$url" 2>/dev/null); then
        local status=$(echo "$response" | tail -1)

        if [[ "$status" == "$expected_status" ]]; then
            log_success "$method $endpoint returned $status"
            return 0
        else
            log_error "$method $endpoint returned $status (expected $expected_status)"
            FAILED_ENDPOINTS+=("$endpoint ($status)")
            ((FAILURES++))
            return 1
        fi
    else
        log_error "$method $endpoint - Connection timeout or failed"
        FAILED_ENDPOINTS+=("$endpoint (timeout)")
        ((FAILURES++))
        return 1
    fi
}

# Main checks
main() {
    echo ""
    log_info "=========================================="
    log_info "API HEALTH CHECK"
    log_info "=========================================="
    log_info "API URL: $API_URL"
    log_info "Timeout: ${TIMEOUT}s"
    log_info ""

    # Check critical endpoints
    check_endpoint "/health" "GET" "200" || true
    check_endpoint "/health/live" "GET" "200" || true
    check_endpoint "/health/ready" "GET" "200" || true
    check_endpoint "/metrics" "GET" "200" || true

    echo ""
    log_info "=========================================="
    log_info "HEALTH CHECK SUMMARY"
    log_info "=========================================="

    if [[ $FAILURES -eq 0 ]]; then
        log_success "All health checks passed"
        echo ""
        exit 0
    else
        log_error "Health check failed: $FAILURES endpoint(s) unhealthy"
        echo ""
        log_error "Failed endpoints:"
        for endpoint in "${FAILED_ENDPOINTS[@]}"; do
            echo "  - $endpoint"
        done
        echo ""

        # Send Discord alert if webhook is configured
        if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
            log_warning "Sending Discord alert..."
            bash "$(dirname "$0")/send-discord-alert.sh" \
                "critical" \
                "API Health Check Failed" \
                "$(printf '%s\n' "${FAILED_ENDPOINTS[@]}" | sed 's/^/- /' | paste -sd ',' -)"
        fi

        exit 1
    fi
}

# Run main
main "$@"
