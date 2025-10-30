#!/bin/bash

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
APP_NAME="ai-affiliate-empire"
DB_APP_NAME="ai-affiliate-empire-db"

if [ "$ENVIRONMENT" = "staging" ]; then
    APP_NAME="ai-affiliate-empire-staging"
    HEALTH_CHECK_URL="https://ai-affiliate-empire-staging.fly.dev/health"
else
    HEALTH_CHECK_URL="https://ai-affiliate-empire.fly.dev/health"
fi

echo -e "${RED}🔄 Initiating rollback for ${ENVIRONMENT}...${NC}"

# Check prerequisites
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ Fly CLI is not installed${NC}"
    exit 1
fi

if [ -z "$FLY_API_TOKEN" ]; then
    echo -e "${RED}❌ FLY_API_TOKEN environment variable is not set${NC}"
    exit 1
fi

# Get deployment history
echo -e "${YELLOW}📜 Fetching deployment history...${NC}"

RELEASES=$(flyctl releases list --app "$APP_NAME" --json 2>/dev/null)

if [ -z "$RELEASES" ] || [ "$RELEASES" = "null" ]; then
    echo -e "${RED}❌ Could not fetch deployment history${NC}"
    exit 1
fi

# Get the previous stable release
PREVIOUS_RELEASE=$(echo "$RELEASES" | jq -r '.[1].Version' 2>/dev/null)

if [ -z "$PREVIOUS_RELEASE" ] || [ "$PREVIOUS_RELEASE" = "null" ]; then
    echo -e "${RED}❌ No previous release found to rollback to${NC}"
    exit 1
fi

echo -e "${BLUE}📝 Previous stable release: v${PREVIOUS_RELEASE}${NC}"

# Confirm rollback
echo -e "${RED}⚠️  WARNING: This will rollback to version ${PREVIOUS_RELEASE}${NC}"
read -p "Continue with rollback? (yes/no): " -r

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

# Backup current database state
echo -e "${YELLOW}💾 Creating database backup before rollback...${NC}"

flyctl postgres backup create --app "$DB_APP_NAME" || {
    echo -e "${YELLOW}⚠️  Database backup creation skipped${NC}"
}

# Perform rollback
echo -e "${YELLOW}🔄 Rolling back to version ${PREVIOUS_RELEASE}...${NC}"

flyctl releases rollback \
    --app "$APP_NAME" \
    --version "$PREVIOUS_RELEASE" \
    --yes

echo -e "${GREEN}✅ Rollback initiated${NC}"

# Wait for rollback to complete
echo -e "${YELLOW}⏳ Waiting for rollback to complete...${NC}"
sleep 15

# Verify rollback health
echo -e "${YELLOW}🏥 Verifying rollback health...${NC}"

MAX_ATTEMPTS=10
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✅ Rollback health check passed (HTTP $HTTP_CODE)${NC}"
        SUCCESS=true
        break
    else
        echo -e "${YELLOW}⏳ Rollback health check attempt $ATTEMPT/$MAX_ATTEMPTS (HTTP $HTTP_CODE)${NC}"

        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            echo -e "${RED}❌ Rollback health check failed after $MAX_ATTEMPTS attempts${NC}"
            echo -e "${RED}❌ CRITICAL: Service may be down. Manual intervention required!${NC}"

            # Send critical alert
            if [ -n "$DISCORD_WEBHOOK_URL" ]; then
                curl -H "Content-Type: application/json" \
                    -X POST \
                    -d "{\"content\":\"🚨 CRITICAL: Rollback failed for ${ENVIRONMENT}. Manual intervention required!\"}" \
                    "$DISCORD_WEBHOOK_URL" &> /dev/null || true
            fi

            exit 1
        fi

        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

# Check database migrations
echo -e "${YELLOW}🔍 Checking database migration status...${NC}"

flyctl ssh console \
    --app "$APP_NAME" \
    --command "npx prisma migrate status" || {
    echo -e "${YELLOW}⚠️  Database might need manual migration review${NC}"
}

# Run basic smoke tests
echo -e "${YELLOW}🧪 Running basic smoke tests...${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")
if echo "$HEALTH_RESPONSE" | grep -q "ok\|healthy\|success"; then
    echo -e "${GREEN}✅ Health endpoint responding correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Health endpoint response unclear: ${HEALTH_RESPONSE}${NC}"
fi

# Record rollback
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_SHA=$(git rev-parse --short HEAD)
echo "${TIMESTAMP},${COMMIT_SHA},${ENVIRONMENT},rollback,v${PREVIOUS_RELEASE}" >> deployments.log

# Display rollback info
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Rollback to ${ENVIRONMENT} completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Rolled back to version: ${YELLOW}v${PREVIOUS_RELEASE}${NC}"
echo -e "Timestamp: ${YELLOW}${TIMESTAMP}${NC}"
echo -e "Health URL: ${YELLOW}${HEALTH_CHECK_URL}${NC}"
echo ""
echo -e "${GREEN}Deployment logs: ${YELLOW}flyctl logs --app ${APP_NAME}${NC}"
echo -e "${GREEN}SSH access: ${YELLOW}flyctl ssh console --app ${APP_NAME}${NC}"
echo ""

# Send notification
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
        -X POST \
        -d "{\"content\":\"🔄 Rollback successful: ${ENVIRONMENT} rolled back to v${PREVIOUS_RELEASE}\"}" \
        "$DISCORD_WEBHOOK_URL" &> /dev/null || true
fi

if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
        -X POST \
        -d "{\"text\":\"🔄 Rollback successful: ${ENVIRONMENT} rolled back to v${PREVIOUS_RELEASE}\"}" \
        "$SLACK_WEBHOOK_URL" &> /dev/null || true
fi

exit 0
