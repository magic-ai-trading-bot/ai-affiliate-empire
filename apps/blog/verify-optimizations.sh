#!/bin/bash

# Performance Optimization Verification Script
# AI Affiliate Empire Blog

echo "=========================================="
echo "Performance Optimization Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ((FAILED++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        ((FAILED++))
        return 1
    fi
}

# Function to check file contains text
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ((FAILED++))
        return 1
    fi
}

echo "1. Checking Core Utility Files..."
echo "--------------------------------"
check_file "lib/imageUtils.ts"
check_file "lib/serviceWorker.ts"
echo ""

echo "2. Checking Performance Components..."
echo "-------------------------------------"
check_file "app/performance-monitor.tsx"
check_file "app/sw-registration.tsx"
echo ""

echo "3. Checking Loading & Error States..."
echo "--------------------------------------"
check_file "components/LoadingSpinner.tsx"
check_file "components/ErrorBoundary.tsx"
check_file "app/loading.tsx"
check_file "app/error.tsx"
check_file "app/articles/loading.tsx"
check_file "app/articles/[slug]/loading.tsx"
echo ""

echo "4. Checking Offline Support..."
echo "-------------------------------"
check_file "public/sw.js"
check_file "public/offline.html"
echo ""

echo "5. Checking Documentation..."
echo "-----------------------------"
check_file "PERFORMANCE-OPTIMIZATION-REPORT.md"
check_file "OPTIMIZATION-QUICKSTART.md"
check_file "CHANGES-SUMMARY.md"
echo ""

echo "6. Checking Configuration Updates..."
echo "-------------------------------------"
check_content "next.config.js" "remotePatterns"
check_content "next.config.js" "optimizePackageImports"
check_content "app/layout.tsx" "PerformanceMonitor"
check_content "app/layout.tsx" "ServiceWorkerRegistration"
check_content "app/page.tsx" "dynamic"
check_content "app/page.tsx" "revalidate"
check_content "package.json" "web-vitals"
echo ""

echo "7. Checking Image Optimization..."
echo "----------------------------------"
check_content "components/ArticleCard.tsx" "getBlurDataURL"
check_content "components/ArticleCard.tsx" "placeholder=\"blur\""
check_content "app/articles/[slug]/page.tsx" "getBlurDataURL"
echo ""

echo "8. Checking Font Optimization..."
echo "---------------------------------"
check_content "app/layout.tsx" "Playfair_Display"
check_content "app/layout.tsx" "preload: true"
check_content "app/layout.tsx" "fallback:"
echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All optimizations verified successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm install"
    echo "2. Run: npm run build"
    echo "3. Run: npm run start"
    echo "4. Open: http://localhost:3002"
    echo "5. Test: Service worker, offline mode, loading states"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
