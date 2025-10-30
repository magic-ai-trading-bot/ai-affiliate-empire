#!/bin/bash

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="staging"
APP_NAME="ai-affiliate-empire-staging"
REGISTRY="ghcr.io"
IMAGE_NAME="$REGISTRY/yourusername/ai-affiliate-empire"
HEALTH_CHECK_URL="https://ai-affiliate-empire-staging.fly.dev/health"

echo -e "${GREEN}🚀 Starting deployment to ${ENVIRONMENT}...${NC}"

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

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
COMMIT_SHA=$(git rev-parse --short HEAD)
IMAGE_TAG="${ENVIRONMENT}-${COMMIT_SHA}"

docker build \
    --platform linux/amd64 \
    --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --build-arg VCS_REF="$COMMIT_SHA" \
    --build-arg VERSION="$IMAGE_TAG" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -t "${IMAGE_NAME}:${ENVIRONMENT}-latest" \
    .

echo -e "${GREEN}✅ Docker image built successfully${NC}"

# Push Docker image
echo -e "${YELLOW}📦 Pushing Docker image to registry...${NC}"

echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_ACTOR" --password-stdin

docker push "${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:${ENVIRONMENT}-latest"

echo -e "${GREEN}✅ Docker image pushed successfully${NC}"

# Deploy to Fly.io
echo -e "${YELLOW}🚢 Deploying to Fly.io (${ENVIRONMENT})...${NC}"

flyctl deploy \
    --config deploy/fly.staging.toml \
    --image "${IMAGE_NAME}:${IMAGE_TAG}" \
    --remote-only \
    --strategy rolling

echo -e "${GREEN}✅ Deployment initiated${NC}"

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"

flyctl ssh console \
    --app "$APP_NAME" \
    --command "npx prisma migrate deploy" || {
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Database migrations completed${NC}"

# Wait for deployment to stabilize
echo -e "${YELLOW}⏳ Waiting for deployment to stabilize...${NC}"
sleep 15

# Verify deployment health
echo -e "${YELLOW}🏥 Running health checks...${NC}"

MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL")

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✅ Health check passed (HTTP $HTTP_CODE)${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Health check failed (HTTP $HTTP_CODE), attempt $ATTEMPT/$MAX_ATTEMPTS${NC}"

        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            echo -e "${RED}❌ Health check failed after $MAX_ATTEMPTS attempts${NC}"
            exit 1
        fi

        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

# Run smoke tests
echo -e "${YELLOW}🧪 Running smoke tests...${NC}"

npm run test:smoke:staging || {
    echo -e "${RED}❌ Smoke tests failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Smoke tests passed${NC}"

# Display deployment info
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment to ${ENVIRONMENT} completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Commit SHA: ${YELLOW}${COMMIT_SHA}${NC}"
echo -e "Image Tag: ${YELLOW}${IMAGE_TAG}${NC}"
echo -e "Health URL: ${YELLOW}${HEALTH_CHECK_URL}${NC}"
echo ""
echo -e "${GREEN}Deployment logs: ${YELLOW}flyctl logs --app ${APP_NAME}${NC}"
echo -e "${GREEN}SSH access: ${YELLOW}flyctl ssh console --app ${APP_NAME}${NC}"
echo ""

# Send notification (if Discord webhook is configured)
if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
        -X POST \
        -d "{\"content\":\"✅ Staging deployment successful: \`${COMMIT_SHA}\` deployed to ${ENVIRONMENT}\"}" \
        "$DISCORD_WEBHOOK_URL" &> /dev/null || true
fi

exit 0
