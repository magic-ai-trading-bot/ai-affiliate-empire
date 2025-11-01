-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "EmailFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "category" TEXT;

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "confirmToken" TEXT,
    "confirmTokenExpiry" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "source" TEXT,
    "referrer" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "frequency" "EmailFrequency" NOT NULL DEFAULT 'WEEKLY',
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "emailsOpened" INTEGER NOT NULL DEFAULT 0,
    "emailsClicked" INTEGER NOT NULL DEFAULT 0,
    "lastEmailSentAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "targetStatus" "SubscriptionStatus"[],
    "targetLanguage" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unsubscribeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendCache" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "googleTrendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "twitterScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "redditScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiktokScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "nextUpdateAt" TIMESTAMP(3) NOT NULL,
    "failedSources" TEXT[],
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendDataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "dailyUsed" INTEGER NOT NULL DEFAULT 0,
    "requestsPerMin" INTEGER NOT NULL DEFAULT 60,
    "cacheTTLHours" INTEGER NOT NULL DEFAULT 12,
    "lastSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_createdAt_idx" ON "NewsletterSubscriber"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_confirmToken_idx" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_unsubscribeToken_idx" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_scheduledAt_idx" ON "NewsletterCampaign"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_sentAt_idx" ON "NewsletterCampaign"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrendCache_productId_key" ON "TrendCache"("productId");

-- CreateIndex
CREATE INDEX "TrendCache_nextUpdateAt_idx" ON "TrendCache"("nextUpdateAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrendDataSource_name_key" ON "TrendDataSource"("name");

-- CreateIndex
CREATE INDEX "TrendDataSource_enabled_status_idx" ON "TrendDataSource"("enabled", "status");

-- CreateIndex
CREATE INDEX "Blog_category_status_idx" ON "Blog"("category", "status");

-- AddForeignKey
ALTER TABLE "TrendCache" ADD CONSTRAINT "TrendCache_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
