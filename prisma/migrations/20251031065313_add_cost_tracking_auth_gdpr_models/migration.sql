-- CreateEnum
CREATE TYPE "NetworkStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'BLOG');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'READONLY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CostService" AS ENUM ('OPENAI', 'CLAUDE', 'ELEVENLABS', 'PIKA', 'DALLE', 'S3', 'DATABASE', 'COMPUTE', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "OptimizationType" AS ENUM ('MODEL_SELECTION', 'BATCH_PROCESSING', 'CACHE_OPTIMIZATION', 'RATE_LIMITING', 'RESOURCE_CLEANUP', 'PROVIDER_SWITCH');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "AffiliateNetwork" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiKey" TEXT,
    "secretKey" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "NetworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "asin" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commission" DECIMAL(5,2) NOT NULL,
    "commissionType" TEXT NOT NULL DEFAULT 'percentage',
    "affiliateUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "networkId" TEXT NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viralityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRankedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "script" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "voiceUrl" TEXT,
    "voiceProvider" TEXT,
    "videoProvider" TEXT NOT NULL DEFAULT 'pikalabs',
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformPostId" TEXT,
    "url" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "hashtags" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnalytics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAnalytics" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkAnalytics" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowLog" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "result" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "refreshToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "method" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL,
    "service" "CostService" NOT NULL,
    "operation" TEXT NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tokens" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "duration" INTEGER,
    "storageBytes" BIGINT,
    "computeMinutes" INTEGER,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "metadata" JSONB,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCostSummary" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openaiCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "claudeCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "elevenlabsCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pikaCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dalleCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "storageCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "databaseCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "computeCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "totalStorage" BIGINT NOT NULL DEFAULT 0,
    "totalCompute" INTEGER NOT NULL DEFAULT 0,
    "videosGenerated" INTEGER NOT NULL DEFAULT 0,
    "blogsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCostSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetConfig" (
    "id" TEXT NOT NULL,
    "monthlyLimit" DECIMAL(10,2) NOT NULL,
    "dailyLimit" DECIMAL(10,2) NOT NULL,
    "warningThreshold" INTEGER NOT NULL DEFAULT 80,
    "criticalThreshold" INTEGER NOT NULL DEFAULT 100,
    "emergencyThreshold" INTEGER NOT NULL DEFAULT 150,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "slackAlerts" BOOLEAN NOT NULL DEFAULT false,
    "emailRecipients" TEXT[],
    "slackWebhookUrl" TEXT,
    "autoScaleDown" BOOLEAN NOT NULL DEFAULT true,
    "emergencyStop" BOOLEAN NOT NULL DEFAULT true,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "level" "AlertLevel" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "currentSpend" DECIMAL(10,2) NOT NULL,
    "budgetLimit" DECIMAL(10,2) NOT NULL,
    "percentUsed" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "actionsTaken" JSONB,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "slackSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationError" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOptimization" (
    "id" TEXT NOT NULL,
    "type" "OptimizationType" NOT NULL,
    "priority" "Priority" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currentCost" DECIMAL(10,2) NOT NULL,
    "estimatedSavings" DECIMAL(10,2) NOT NULL,
    "savingsPercent" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "implementation" TEXT,
    "status" "OptimizationStatus" NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateNetwork_name_key" ON "AffiliateNetwork"("name");

-- CreateIndex
CREATE INDEX "AffiliateNetwork_status_idx" ON "AffiliateNetwork"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_asin_key" ON "Product"("asin");

-- CreateIndex
CREATE INDEX "Product_status_overallScore_idx" ON "Product"("status", "overallScore");

-- CreateIndex
CREATE INDEX "Product_networkId_status_idx" ON "Product"("networkId", "status");

-- CreateIndex
CREATE INDEX "Product_category_status_idx" ON "Product"("category", "status");

-- CreateIndex
CREATE INDEX "Video_productId_status_idx" ON "Video"("productId", "status");

-- CreateIndex
CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Publication_videoId_platform_idx" ON "Publication"("videoId", "platform");

-- CreateIndex
CREATE INDEX "Publication_platform_status_idx" ON "Publication"("platform", "status");

-- CreateIndex
CREATE INDEX "Publication_publishedAt_idx" ON "Publication"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Blog_slug_key" ON "Blog"("slug");

-- CreateIndex
CREATE INDEX "Blog_productId_status_idx" ON "Blog"("productId", "status");

-- CreateIndex
CREATE INDEX "Blog_status_publishedAt_idx" ON "Blog"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_date_idx" ON "ProductAnalytics"("date");

-- CreateIndex
CREATE INDEX "ProductAnalytics_productId_date_idx" ON "ProductAnalytics"("productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnalytics_productId_date_key" ON "ProductAnalytics"("productId", "date");

-- CreateIndex
CREATE INDEX "PlatformAnalytics_publicationId_date_idx" ON "PlatformAnalytics"("publicationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAnalytics_publicationId_date_key" ON "PlatformAnalytics"("publicationId", "date");

-- CreateIndex
CREATE INDEX "NetworkAnalytics_networkId_date_idx" ON "NetworkAnalytics"("networkId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkAnalytics_networkId_date_key" ON "NetworkAnalytics"("networkId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "WorkflowLog_workflowType_startedAt_idx" ON "WorkflowLog"("workflowType", "startedAt");

-- CreateIndex
CREATE INDEX "WorkflowLog_status_startedAt_idx" ON "WorkflowLog"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_status_idx" ON "ApiKey"("userId", "status");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_status_expiresAt_idx" ON "ApiKey"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_status_createdAt_idx" ON "AuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CostEntry_service_timestamp_idx" ON "CostEntry"("service", "timestamp");

-- CreateIndex
CREATE INDEX "CostEntry_timestamp_idx" ON "CostEntry"("timestamp");

-- CreateIndex
CREATE INDEX "CostEntry_resourceId_resourceType_idx" ON "CostEntry"("resourceId", "resourceType");

-- CreateIndex
CREATE INDEX "CostEntry_provider_model_idx" ON "CostEntry"("provider", "model");

-- CreateIndex
CREATE INDEX "DailyCostSummary_date_idx" ON "DailyCostSummary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCostSummary_date_key" ON "DailyCostSummary"("date");

-- CreateIndex
CREATE INDEX "BudgetConfig_isActive_idx" ON "BudgetConfig"("isActive");

-- CreateIndex
CREATE INDEX "BudgetAlert_level_createdAt_idx" ON "BudgetAlert"("level", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetAlert_createdAt_idx" ON "BudgetAlert"("createdAt");

-- CreateIndex
CREATE INDEX "CostOptimization_status_priority_idx" ON "CostOptimization"("status", "priority");

-- CreateIndex
CREATE INDEX "CostOptimization_createdAt_idx" ON "CostOptimization"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalytics" ADD CONSTRAINT "ProductAnalytics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAnalytics" ADD CONSTRAINT "PlatformAnalytics_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkAnalytics" ADD CONSTRAINT "NetworkAnalytics_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "AffiliateNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
