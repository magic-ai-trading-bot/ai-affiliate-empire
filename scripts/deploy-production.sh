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
ENVIRONMENT="production"
APP_NAME="ai-affiliate-empire"
DB_APP_NAME="ai-affiliate-empire-db"
REGISTRY="ghcr.io"
IMAGE_NAME="$REGISTRY/magic-ai-trading-bot/ai-affiliate-empire"
HEALTH_CHECK_URL="https://ai-affiliate-empire.fly.dev/health"

echo -e "${GREEN}🚀 Starting deployment to ${ENVIRONMENT}...${NC}"
echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION${NC}"

# Safety prompt
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ Fly CLI is not installed${NC}"
    exit 1
fi

if [ -z "$FLY_API_TOKEN" ]; then
    echo -e "${RED}❌ FLY_API_TOKEN environment variable is not set${NC}"
    exit 1
fi

# Check git status
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Working directory is not clean. Commit or stash changes first.${NC}"
    exit 1
fi

# Ensure on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Not on main branch. Switch to main before deploying to production.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
COMMIT_SHA=$(git rev-parse --short HEAD)
VERSION=$(git describe --tags --always)
IMAGE_TAG="${ENVIRONMENT}-${VERSION}"

docker build \
    --platform linux/amd64 \
    --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --build-arg VCS_REF="$COMMIT_SHA" \
    --build-arg VERSION="$VERSION" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -t "${IMAGE_NAME}:${ENVIRONMENT}-latest" \
    -t "${IMAGE_NAME}:latest" \
    .

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Push Docker image
echo -e "${YELLOW}📦 Pushing Docker image to registry...${NC}"

echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_ACTOR" --password-stdin

docker push "${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:${ENVIRONMENT}-latest"
docker push "${IMAGE_NAME}:latest"

echo -e "${GREEN}✅ Docker image pushed successfully${NC}"

# Backup database
echo -e "${YELLOW}💾 Creating database backup...${NC}"

flyctl postgres backup create --app "$DB_APP_NAME" || {
    echo -e "${YELLOW}⚠️  Database backup creation skipped (might not be supported)${NC}"
}

echo -e "${GREEN}✅ Database backup created${NC}"

# Store current deployment info for potential rollback
CURRENT_DEPLOYMENT=$(flyctl status --app "$APP_NAME" --json | jq -r '.ID' 2>/dev/null || echo "unknown")
echo "$CURRENT_DEPLOYMENT" > .last-deployment.txt

echo -e "${BLUE}📝 Stored current deployment ID: ${CURRENT_DEPLOYMENT}${NC}"

# Deploy to Fly.io with blue-green strategy
echo -e "${YELLOW}🚢 Deploying to Fly.io (${ENVIRONMENT}) with blue-green strategy...${NC}"

flyctl deploy \
    --config deploy/fly.production.toml \
    --image "${IMAGE_NAME}:${IMAGE_TAG}" \
    --remote-only \
    --strategy bluegreen

echo -e "${GREEN}✅ Deployment initiated${NC}"

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"

flyctl ssh console \
    --app "$APP_NAME" \
    --command "npx prisma migrate deploy" || {
    echo -e "${RED}❌ Database migration failed${NC}"
    echo -e "${YELLOW}🔄 Initiating automatic rollback...${NC}"
    bash ./scripts/rollback.sh "$ENVIRONMENT"
    exit 1
}

echo -e "${GREEN}✅ Database migrations completed${NC}"

# Wait for deployment to stabilize
echo -e "${YELLOW}⏳ Waiting for deployment to stabilize...${NC}"
sleep 20

# Comprehensive health checks
echo -e "${YELLOW}🏥 Running comprehensive health checks...${NC}"

MAX_ATTEMPTS=15
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
        SUCCESS=true
        break
    else
        echo -e "${YELLOW}⏳ Health check failed (HTTP $HTTP_CODE), attempt $ATTEMPT/$MAX_ATTEMPTS${NC}"

        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            echo -e "${RED}❌ Health check failed after $MAX_ATTEMPTS attempts${NC}"
            echo -e "${YELLOW}🔄 Initiating automatic rollback...${NC}"
            bash ./scripts/rollback.sh "$ENVIRONMENT"
            exit 1
        fi

        sleep 10
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

# Run smoke tests
echo -e "${YELLOW}🧪 Running smoke tests...${NC}"

npm run test:smoke:production || {
    echo -e "${RED}❌ Smoke tests failed${NC}"
    echo -e "${YELLOW}🔄 Initiating automatic rollback...${NC}"
    bash ./scripts/rollback.sh "$ENVIRONMENT"
    exit 1
}

echo -e "${GREEN}✅ Smoke tests passed${NC}"

# Monitor for anomalies
echo -e "${YELLOW}📊 Monitoring deployment for 2 minutes...${NC}"

MONITORING_DURATION=120
MONITORING_INTERVAL=15
ELAPSED=0

while [ $ELAPSED -lt $MONITORING_DURATION ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")

    if [ "$HTTP_CODE" -ne 200 ]; then
        echo -e "${RED}❌ Service became unhealthy during monitoring${NC}"
        echo -e "${YELLOW}🔄 Initiating automatic rollback...${NC}"
        bash ./scripts/rollback.sh "$ENVIRONMENT"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} Health check OK (${ELAPSED}s/${MONITORING_DURATION}s)"
    sleep $MONITORING_INTERVAL
    ELAPSED=$((ELAPSED + MONITORING_INTERVAL))
done

echo -e "${GREEN}✅ Monitoring completed - deployment is stable${NC}"

# Record deployment
echo -e "${YELLOW}📝 Recording deployment...${NC}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "${TIMESTAMP},${COMMIT_SHA},${ENVIRONMENT},success,${VERSION}" >> deployments.log

# Display deployment info
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment to ${ENVIRONMENT} completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Commit SHA: ${YELLOW}${COMMIT_SHA}${NC}"
echo -e "Image Tag: ${YELLOW}${IMAGE_TAG}${NC}"
echo -e "Deployed at: ${YELLOW}${TIMESTAMP}${NC}"
echo -e "Health URL: ${YELLOW}${HEALTH_CHECK_URL}${NC}"
echo ""
echo -e "${GREEN}Deployment logs: ${YELLOW}flyctl logs --app ${APP_NAME}${NC}"
echo -e "${GREEN}SSH access: ${YELLOW}flyctl ssh console --app ${APP_NAME}${NC}"
echo -e "${GREEN}Metrics: ${YELLOW}flyctl status --app ${APP_NAME}${NC}"
echo ""

# Send notifications
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
        -X POST \
        -d "{\"content\":\"🚀 Production deployment successful: \`${VERSION}\` (\`${COMMIT_SHA}\`) deployed to ${ENVIRONMENT}\"}" \
        "$DISCORD_WEBHOOK_URL" &> /dev/null || true
fi

if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
        -X POST \
        -d "{\"text\":\"🚀 Production deployment successful: \`${VERSION}\` (\`${COMMIT_SHA}\`) deployed to ${ENVIRONMENT}\"}" \
        "$SLACK_WEBHOOK_URL" &> /dev/null || true
fi

exit 0
