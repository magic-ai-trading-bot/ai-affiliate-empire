#!/bin/bash

###############################################################################
# Load Test Runner Script
#
# Purpose: Execute k6 load tests and generate comprehensive reports
#
# Usage:
#   ./scripts/run-load-tests.sh [test-type] [environment]
#
# Examples:
#   ./scripts/run-load-tests.sh all local
#   ./scripts/run-load-tests.sh baseline staging
#   ./scripts/run-load-tests.sh stress production
#
# Test Types:
#   - all: Run all test scenarios
#   - baseline: Quick baseline test
#   - stress: Stress test to find breaking point
#   - spike: Spike test for traffic surges
#   - soak: Long-running endurance test
#   - products: Product endpoints test
#   - analytics: Analytics endpoints test
#   - orchestrator: Orchestrator endpoints test
#
# Environments:
#   - local: http://localhost:3000
#   - staging: https://ai-affiliate-empire-staging.fly.dev
#   - production: https://ai-affiliate-empire.fly.dev
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="${1:-all}"
ENVIRONMENT="${2:-local}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="test/load/reports"
HTML_REPORT_DIR="$REPORT_DIR/html"

# Environment URLs
case $ENVIRONMENT in
  local)
    BASE_URL="http://localhost:3000"
    ;;
  staging)
    BASE_URL="https://ai-affiliate-empire-staging.fly.dev"
    ;;
  production)
    BASE_URL="https://ai-affiliate-empire.fly.dev"
    ;;
  *)
    BASE_URL="$ENVIRONMENT"
    ;;
esac

# Print header
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Load Testing Framework - AI Affiliate Empire${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
echo -e "${GREEN}Base URL:${NC} $BASE_URL"
echo -e "${GREEN}Test Type:${NC} $TEST_TYPE"
echo -e "${GREEN}Timestamp:${NC} $TIMESTAMP"
echo ""

# Create report directories
mkdir -p "$REPORT_DIR"
mkdir -p "$HTML_REPORT_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo apt install k6"
    echo "  Windows: choco install k6"
    echo ""
    echo "Or visit: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Function to run a single test
run_test() {
    local test_name=$1
    local test_file=$2
    local duration_note=$3

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    if [ -n "$duration_note" ]; then
        echo -e "${YELLOW}Expected Duration: $duration_note${NC}"
    fi
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Run k6 test with environment variables
    k6 run \
        --out json="$REPORT_DIR/${test_name}-${TIMESTAMP}.json" \
        --env BASE_URL="$BASE_URL" \
        --env ENVIRONMENT="$ENVIRONMENT" \
        "$test_file"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name completed successfully${NC}"
    else
        echo -e "${RED}✗ $test_name failed with exit code $exit_code${NC}"
    fi

    echo ""
    return $exit_code
}

# Function to generate HTML report
generate_html_report() {
    local json_file=$1
    local html_file=$2

    if [ -f "$json_file" ]; then
        echo "Generating HTML report: $html_file"
        # Convert JSON to HTML (basic conversion)
        # In production, use k6-reporter or custom tool
        cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Load Test Report</h1>
    <p>See JSON file for detailed metrics: <a href="../${json_file##*/}">${json_file##*/}</a></p>
    <p>Use k6 Cloud or Grafana for advanced visualization.</p>
</body>
</html>
EOF
    fi
}

# Track results
declare -a failed_tests=()
declare -a passed_tests=()

# Run tests based on test type
case $TEST_TYPE in
  all)
    echo -e "${BLUE}Running complete load test suite...${NC}"
    echo ""

    # Baseline (quick)
    if run_test "baseline" "test/load/scenarios/baseline.js" "~5 minutes"; then
        passed_tests+=("baseline")
    else
        failed_tests+=("baseline")
    fi

    # Products endpoints
    if run_test "products" "test/load/scenarios/products-load.js" "~10 minutes"; then
        passed_tests+=("products")
    else
        failed_tests+=("products")
    fi

    # Analytics endpoints
    if run_test "analytics" "test/load/scenarios/analytics-load.js" "~10 minutes"; then
        passed_tests+=("analytics")
    else
        failed_tests+=("analytics")
    fi

    # Orchestrator endpoints
    if run_test "orchestrator" "test/load/scenarios/orchestrator-load.js" "~10 minutes"; then
        passed_tests+=("orchestrator")
    else
        failed_tests+=("orchestrator")
    fi

    # Spike test
    if run_test "spike" "test/load/scenarios/spike-test.js" "~10 minutes"; then
        passed_tests+=("spike")
    else
        failed_tests+=("spike")
    fi

    # Note: Stress and soak tests are excluded from 'all' due to long duration
    echo -e "${YELLOW}Note: Stress and soak tests not included in 'all'. Run separately if needed.${NC}"
    ;;

  baseline)
    run_test "baseline" "test/load/scenarios/baseline.js" "~5 minutes"
    ;;

  stress)
    echo -e "${YELLOW}⚠️  Warning: Stress test may impact the system${NC}"
    echo -e "${YELLOW}Expected duration: ~30 minutes${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_test "stress" "test/load/scenarios/stress-test.js" "~30 minutes"
    fi
    ;;

  spike)
    run_test "spike" "test/load/scenarios/spike-test.js" "~10 minutes"
    ;;

  soak)
    echo -e "${YELLOW}⚠️  Warning: Soak test runs for 2+ hours${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_test "soak" "test/load/scenarios/soak-test.js" "~2 hours"
    fi
    ;;

  products)
    run_test "products" "test/load/scenarios/products-load.js" "~10 minutes"
    ;;

  analytics)
    run_test "analytics" "test/load/scenarios/analytics-load.js" "~10 minutes"
    ;;

  orchestrator)
    run_test "orchestrator" "test/load/scenarios/orchestrator-load.js" "~10 minutes"
    ;;

  *)
    echo -e "${RED}Error: Unknown test type '$TEST_TYPE'${NC}"
    echo ""
    echo "Valid test types: all, baseline, stress, spike, soak, products, analytics, orchestrator"
    exit 1
    ;;
esac

# Generate summary report
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Execution Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

if [ ${#passed_tests[@]} -gt 0 ]; then
    echo -e "${GREEN}Passed Tests (${#passed_tests[@]}):${NC}"
    for test in "${passed_tests[@]}"; do
        echo -e "  ${GREEN}✓${NC} $test"
    done
    echo ""
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    echo -e "${RED}Failed Tests (${#failed_tests[@]}):${NC}"
    for test in "${failed_tests[@]}"; do
        echo -e "  ${RED}✗${NC} $test"
    done
    echo ""
fi

# Report location
echo -e "${GREEN}Reports Location:${NC}"
echo "  JSON Reports: $REPORT_DIR/"
echo "  Text Reports: $REPORT_DIR/*.txt"
echo ""

# Performance comparison (if baseline exists)
if [ -f "$REPORT_DIR/baseline-${TIMESTAMP}.json" ]; then
    echo -e "${YELLOW}Performance Analysis:${NC}"
    echo "  Compare with previous baselines to detect degradation"
    echo "  Use: k6 compare baseline-prev.json baseline-new.json"
    echo ""
fi

# Next steps
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review detailed metrics in report files"
echo "  2. Compare with acceptance criteria (test/load/README.md)"
echo "  3. Investigate any failed tests or high error rates"
echo "  4. Monitor production metrics after deployment"
echo ""

# Integration suggestions
echo -e "${BLUE}Integration Options:${NC}"
echo "  • k6 Cloud: k6 cloud run test.js (visualizations)"
echo "  • Grafana: Import k6 dashboard"
echo "  • CI/CD: Run baseline test on every deployment"
echo "  • Monitoring: Set up alerts based on these thresholds"
echo ""

# Exit with error if any tests failed
if [ ${#failed_tests[@]} -gt 0 ]; then
    echo -e "${RED}Some tests failed. Review the reports above.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
fi
