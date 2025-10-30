# Temporal Orchestration - AI Affiliate Empire

**24-Hour Autonomous Control Loop Implementation**

---

## 🎯 Overview

Temporal provides durable workflow execution that survives crashes, restarts, and failures. Our system uses Temporal to orchestrate the complete autonomous affiliate marketing cycle.

**Key Benefits:**
- ✅ Workflow survives server crashes
- ✅ Automatic retries on failure
- ✅ Long-running processes (days/weeks)
- ✅ Visual workflow monitoring
- ✅ Time-based scheduling

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Temporal Server (localhost:7233)        │
│  - Workflow Engine                              │
│  - Task Queue: ai-affiliate-empire             │
│  - Namespace: default                           │
└─────────────────────────────────────────────────┘
           ↓                              ↓
    [Temporal Worker]              [NestJS API Server]
    - Executes workflows           - Starts workflows
    - Runs activities              - Queries status
    - Processes tasks              - REST API endpoints
```

---

## 🔄 Daily Control Loop Workflow

**File:** `src/temporal/workflows/daily-control-loop.ts`

### Workflow Steps

```typescript
1. Sync Products (5 min)
   → syncProductsFromAmazon()
   ↓
2. Rank Products (2 min)
   → rankAllProducts()
   ↓
3. Select Top Products (1 min)
   → selectTopProducts(limit: 10)
   ↓
4. Generate Scripts (10 min)
   → generateContentForProducts()
   ↓
5. Generate Videos (30 min)
   → generateVideosForContent()
   ↓
6. Publish to Platforms (15 min)
   → publishVideosToAll()
   ↓
7. Collect Analytics (5 min)
   → collectAnalytics()
   ↓
8. Optimize Strategy (3 min)
   → optimizeStrategy()
```

**Total Duration:** ~71 minutes per cycle

---

## 📊 Workflow Activities

**File:** `src/temporal/activities/index.ts`

### 1. syncProductsFromAmazon
Fetches latest products from Amazon PA-API.

**Input:**
```typescript
{ category?: string }
```

**Output:**
```typescript
{ productCount: number }
```

### 2. rankAllProducts
Calculates AI scores for all active products.

**Scores:**
- Trend Score (0-1)
- Profit Score (0-1)
- Virality Score (0-1)
- Overall Score (weighted average)

### 3. selectTopProducts
Returns top N products by overall score.

**Input:**
```typescript
{ limit: number }
```

**Output:**
```typescript
Array<{ id: string; title: string; score: number }>
```

### 4. generateContentForProducts
Creates video scripts for selected products.

**Input:**
```typescript
{
  productIds: string[];
  language: string;
}
```

**Output:**
```typescript
{
  scriptsCreated: number;
  videoIds: string[];
}
```

### 5. generateVideosForContent
Generates videos (voice + visuals) in batches.

**Input:**
```typescript
{
  videoIds: string[];
  batchSize: number;
}
```

**Output:**
```typescript
{
  videosGenerated: number;
  readyVideoIds: string[];
}
```

### 6. publishVideosToAll
Publishes videos to all platforms.

**Input:**
```typescript
{
  videoIds: string[];
  platforms: string[];
}
```

**Output:**
```typescript
{
  published: number;
  failed: number;
}
```

### 7. collectAnalytics
Gathers performance metrics.

**Input:**
```typescript
{ daysBack: number }
```

**Output:**
```typescript
{
  totalRevenue: number;
  totalViews: number;
}
```

### 8. optimizeStrategy
Archives low performers, scales winners.

**Input:**
```typescript
{
  minROI: number;
  killThreshold: number;
  scaleFactor?: number;
}
```

---

## 🚀 Running Temporal

### 1. Install Temporal Server

**Option A: Using Docker (Recommended)**

```bash
# Download Temporal Docker Compose
git clone https://github.com/temporalio/docker-compose.git temporal
cd temporal

# Start Temporal server
docker-compose up -d

# Verify running
docker-compose ps
```

**Option B: Using Temporal CLI**

```bash
# Install Temporal CLI
brew install temporal

# Start Temporal dev server
temporal server start-dev
```

### 2. Start Temporal Worker

```bash
# Terminal 1: Start worker
npm run temporal:worker
```

Output:
```
✅ Nest.js application context initialized
🔧 Starting Temporal Worker...
Temporal Server: localhost:7233
✅ Temporal Worker created
👂 Listening for workflows on task queue: ai-affiliate-empire
```

### 3. Start API Server

```bash
# Terminal 2: Start API server
npm run start:dev
```

### 4. Trigger Daily Loop

**Via API:**
```bash
curl -X POST http://localhost:3000/orchestrator/daily-loop/start \
  -H "Content-Type: application/json" \
  -d '{
    "maxProducts": 10,
    "platforms": ["YOUTUBE", "TIKTOK", "INSTAGRAM"]
  }'
```

**Response:**
```json
{
  "workflowId": "daily-2025-10-31",
  "runId": "abc123...",
  "status": "started"
}
```

---

## 📊 Monitoring Workflows

### 1. Temporal UI

Open: `http://localhost:8080`

**Features:**
- View all workflows
- See workflow history
- Check activity execution
- Retry failed workflows
- Query workflow state

### 2. Check Workflow Status

```bash
curl http://localhost:3000/orchestrator/daily-loop/status/daily-2025-10-31
```

### 3. View Workflow Logs

```bash
curl http://localhost:3000/orchestrator/workflow-logs
```

---

## 🔄 Weekly Optimization Workflow

**File:** `src/temporal/workflows/daily-control-loop.ts`

### What It Does

1. Analyzes 7-day performance
2. Archives products with ROI < 30%
3. Scales products with ROI > 200%
4. Adjusts prompt templates
5. Generates owner report

### Trigger Weekly Optimization

```bash
curl -X POST http://localhost:3000/orchestrator/weekly-optimization/start
```

---

## ⏱️ Scheduling Workflows

### Option 1: Temporal Schedules (Recommended)

```typescript
// Schedule daily loop to run at midnight
await client.schedule.create({
  scheduleId: 'daily-control-loop-schedule',
  spec: {
    cronExpressions: ['0 0 * * *'], // Every day at midnight
  },
  action: {
    type: 'startWorkflow',
    workflowType: 'dailyControlLoop',
    taskQueue: 'ai-affiliate-empire',
    args: [{ maxProducts: 10, platforms: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'] }],
  },
});
```

### Option 2: Cron Job

```bash
# Add to crontab
0 0 * * * curl -X POST http://localhost:3000/orchestrator/daily-loop/start
```

---

## 🛠️ Retry Logic

Temporal automatically retries failed activities:

```typescript
{
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '30 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2.0,
  },
}
```

**Example:**
- Attempt 1: Fails → Wait 30s
- Attempt 2: Fails → Wait 1 min
- Attempt 3: Fails → Wait 2 min
- After 3 attempts: Workflow fails

---

## 📈 Workflow Execution Logs

All workflow executions are logged in database:

```sql
SELECT * FROM "WorkflowLog"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Schema:**
```typescript
{
  id: string;
  workflowId: string;
  workflowType: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  completedAt: Date;
  duration: number; // seconds
  result: string; // JSON
  errorMessage: string;
}
```

---

## 🔐 Environment Variables

```env
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
```

**Production:**
```env
TEMPORAL_ADDRESS=temporal.your-domain.com:7233
TEMPORAL_NAMESPACE=production
```

---

## 🚨 Troubleshooting

### Worker Not Starting

**Error:** "Failed to connect to Temporal"

**Solution:**
```bash
# Check if Temporal is running
docker ps | grep temporal

# Restart Temporal
cd temporal
docker-compose restart
```

### Workflow Stuck

**Check workflow status in UI:** `http://localhost:8080`

**Cancel workflow:**
```bash
temporal workflow cancel --workflow-id daily-2025-10-31
```

### Activities Timing Out

Increase timeout in workflow:
```typescript
const { activity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes', // Increase timeout
});
```

---

## 📊 Production Considerations

### 1. Temporal Cloud

For production, use [Temporal Cloud](https://temporal.io/cloud):
- Managed infrastructure
- Auto-scaling
- Built-in monitoring
- 99.99% uptime SLA

### 2. Worker Scaling

Run multiple workers for parallel execution:
```bash
# Terminal 1
npm run temporal:worker

# Terminal 2
npm run temporal:worker

# Terminal 3
npm run temporal:worker
```

### 3. Activity Idempotency

Ensure all activities are idempotent (can be safely retried):
```typescript
// ✅ Good - Idempotent
await prisma.product.upsert({
  where: { asin: product.asin },
  update: { price: product.price },
  create: product,
});

// ❌ Bad - Not idempotent
await prisma.product.create({ data: product });
```

---

## 🎯 Next Steps

1. **Enable Temporal Schedules**
   - Auto-run daily loop at midnight
   - Weekly optimization on Sundays

2. **Add More Workflows**
   - Real-time trending product discovery
   - Emergency content generation
   - A/B testing workflows

3. **Implement Monitoring**
   - Slack/Discord notifications on failure
   - Grafana dashboards for metrics
   - Alert on low success rates

4. **Add Child Workflows**
   - Separate workflow per platform
   - Parallel niche processing
   - Dynamic scaling based on load

---

## 📚 Resources

- **Temporal Docs**: https://docs.temporal.io/
- **TypeScript SDK**: https://docs.temporal.io/dev-guide/typescript
- **Workflow Patterns**: https://docs.temporal.io/workflows

---

**Status**: Phase 2 - Temporal Orchestration Complete ✅

**Next**: Phase 3 - Analytics Module for real-time tracking
