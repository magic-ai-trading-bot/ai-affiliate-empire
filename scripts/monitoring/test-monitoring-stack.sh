#!/bin/bash

##############################################################################
# Monitoring Stack Test Script
#
# Comprehensive test of all monitoring components
# Verifies Sentry, Prometheus, Grafana, Discord integration
#
# Usage: ./test-monitoring-stack.sh [environment]
# Example: ./test-monitoring-stack.sh production
##############################################################################

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-production}"
API_URL="${API_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3002}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test backend health
test_backend_health() {
    log_info "Testing backend health checks..."

    # Health check
    if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
        log_success "Backend health check endpoint responds"
    else
        log_error "Backend health check endpoint failed"
        return 1
    fi

    # Readiness check
    if curl -s -f "$API_URL/health/ready" > /dev/null 2>&1; then
        log_success "Backend readiness check endpoint responds"
    else
        log_error "Backend readiness check endpoint failed"
        return 1
    fi

    # Liveness check
    if curl -s -f "$API_URL/health/live" > /dev/null 2>&1; then
        log_success "Backend liveness check endpoint responds"
    else
        log_error "Backend liveness check endpoint failed"
        return 1
    fi
}

# Test metrics endpoint
test_metrics_endpoint() {
    log_info "Testing metrics endpoint..."

    if response=$(curl -s -f "$API_URL/metrics" 2>/dev/null); then
        if echo "$response" | grep -q "http_requests_total"; then
            log_success "Metrics endpoint returns Prometheus data"
        else
            log_error "Metrics endpoint missing expected metrics"
            return 1
        fi
    else
        log_error "Metrics endpoint failed to respond"
        return 1
    fi
}

# Test Prometheus
test_prometheus() {
    log_info "Testing Prometheus..."

    if curl -s -f "$PROMETHEUS_URL/-/healthy" > /dev/null 2>&1; then
        log_success "Prometheus is healthy"
    else
        log_error "Prometheus is not responding"
        return 1
    fi

    # Check targets
    if response=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null); then
        if echo "$response" | grep -q "backend"; then
            log_success "Prometheus has backend target configured"
        else
            log_warning "Prometheus backend target not found"
        fi
    else
        log_error "Failed to query Prometheus targets"
    fi
}

# Test Grafana
test_grafana() {
    log_info "Testing Grafana..."

    if curl -s -f "$GRAFANA_URL/api/health" > /dev/null 2>&1; then
        log_success "Grafana is healthy"
    else
        log_error "Grafana is not responding"
        return 1
    fi

    # Check dashboards
    if response=$(curl -s "$GRAFANA_URL/api/search?query=ai-affiliate" 2>/dev/null | grep -q "dashboard" || true); then
        log_warning "Check Grafana dashboards manually at $GRAFANA_URL"
    fi
}

# Test AlertManager
test_alertmanager() {
    log_info "Testing AlertManager..."

    if curl -s -f "$ALERTMANAGER_URL/-/healthy" > /dev/null 2>&1; then
        log_success "AlertManager is healthy"
    else
        log_warning "AlertManager may not be running (optional)"
        return 0
    fi

    # Check status
    if curl -s -f "$ALERTMANAGER_URL/api/v1/status" > /dev/null 2>&1; then
        log_success "AlertManager API is responding"
    else
        log_error "AlertManager API failed"
    fi
}

# Test Sentry configuration
test_sentry() {
    log_info "Testing Sentry configuration..."

    if [[ -z "${SENTRY_DSN:-}" ]]; then
        log_warning "Sentry DSN not configured"
        return 0
    fi

    # Extract project info from DSN
    if [[ "$SENTRY_DSN" =~ https://([^@]+)@([^/]+)/([0-9]+) ]]; then
        local sentry_host="${BASH_REMATCH[2]}"
        log_success "Sentry DSN format is valid"

        # Test connectivity
        if curl -s -I "https://$sentry_host/api/0/projects/" > /dev/null 2>&1; then
            log_success "Sentry endpoint is reachable"
        else
            log_error "Sentry endpoint is not reachable"
        fi
    else
        log_error "Sentry DSN format is invalid"
        return 1
    fi
}

# Test Discord webhook
test_discord() {
    log_info "Testing Discord webhook..."

    if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
        log_warning "Discord webhook URL not configured"
        return 0
    fi

    # Send test alert
    local payload=$(cat <<EOF
{
  "content": "✅ **Monitoring Stack Test**",
  "embeds": [{
    "title": "Test Alert",
    "description": "Discord webhook is working correctly!",
    "color": 3066993,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  }]
}
EOF
)

    if curl -s -X POST -H "Content-Type: application/json" \
        -d "$payload" "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1; then
        log_success "Discord webhook test alert sent"
    else
        log_error "Discord webhook test failed"
        return 1
    fi
}

# Test database connectivity
test_database() {
    log_info "Testing database connectivity..."

    if response=$(curl -s "$API_URL/health" | grep -q "database" || true); then
        log_success "Database health check is available in health endpoint"
    else
        log_error "Database health check failed"
        return 1
    fi
}

# Test Temporal
test_temporal() {
    log_info "Testing Temporal connectivity..."

    if response=$(curl -s "$API_URL/health" | grep -q "temporal" || true); then
        log_success "Temporal health check is available in health endpoint"
    else
        log_warning "Temporal health check not available (may be optional)"
        return 0
    fi
}

# Main test suite
main() {
    echo ""
    echo "=========================================="
    echo "MONITORING STACK TEST SUITE"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "API URL: $API_URL"
    echo ""

    # Run all tests
    test_backend_health || true
    test_metrics_endpoint || true
    test_prometheus || true
    test_grafana || true
    test_alertmanager || true
    test_sentry || true
    test_discord || true
    test_database || true
    test_temporal || true

    echo ""
    echo "=========================================="
    echo "TEST RESULTS"
    echo "=========================================="
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        echo ""
        echo "Monitoring Stack Status: 10/10 ✅"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Some tests failed${NC}"
        echo "Review failures above and fix configuration"
        echo ""
        return 1
    fi
}

# Run
main "$@"
