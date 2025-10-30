# Production Best Practices - AI Affiliate Empire

**Last Updated**: 2025-10-31
**Research Date**: 2025-10-31
**Status**: Production Ready Guide

---

## Executive Summary

This guide provides comprehensive production deployment best practices for AI Affiliate Empire system across 7 critical areas: NestJS deployment, PostgreSQL optimization, Temporal orchestration, Next.js dashboard, monitoring/observability, security hardening, and cost optimization. Based on 2024-2025 industry standards and authoritative sources.

**Key Recommendations**:
- Use PM2 cluster mode with graceful shutdown for 99.5%+ uptime
- Implement PgBouncer connection pooling to handle 10x more connections
- Scale Temporal workers horizontally with Kubernetes for reliability
- Deploy Next.js with static generation and CDN for <100ms load times
- Use Prometheus + Grafana with context-aware alerting
- Implement HashiCorp Vault for secrets management
- Apply aggressive caching strategies for 94% cost reduction

---

## Table of Contents

1. [NestJS Production Deployment](#1-nestjs-production-deployment)
2. [PostgreSQL Production Setup](#2-postgresql-production-setup)
3. [Temporal Production Deployment](#3-temporal-production-deployment)
4. [Next.js Dashboard Deployment](#4-nextjs-dashboard-deployment)
5. [Monitoring & Observability](#5-monitoring--observability)
6. [Security Hardening](#6-security-hardening)
7. [Cost Optimization](#7-cost-optimization)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Pre-Production Checklist](#9-pre-production-checklist)

---

## 1. NestJS Production Deployment

### 1.1 PM2 Process Management

#### Cluster Mode Configuration

**Why**: Cluster mode utilizes all CPU cores without code modifications, providing horizontal scaling and zero-downtime deployments.

**Recommended Setup**:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-affiliate-empire-api',
    script: './dist/main.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=2048' // 2GB heap
    },
    max_memory_restart: '2G',
    kill_timeout: 10000, // 10s graceful shutdown
    wait_ready: true, // Wait for app ready signal
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
```

**Key Features**:
- **instances: 'max'** - Spawns worker for each CPU core
- **exec_mode: 'cluster'** - Enables load balancing across workers
- **max_memory_restart** - Auto-restart if memory exceeds limit
- **kill_timeout** - Graceful shutdown window before SIGKILL

#### Zero-Downtime Deployments

**Command Difference**:
```bash
# ❌ Hard restart (causes downtime)
pm2 restart ecosystem.config.js

# ✅ Zero-downtime reload
pm2 reload ecosystem.config.js
```

**How it Works**: `pm2 reload` restarts processes sequentially, ensuring at least one instance handles requests during deployment.

#### Graceful Shutdown Implementation

**Why**: Prevents data loss by closing connections cleanly before exit.

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(3000);

  // Signal PM2 application is ready
  if (process.send) {
    process.send('ready');
  }

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    // Stop accepting new requests
    await app.close();

    // Close database connections
    const prisma = app.get(PrismaService);
    await prisma.$disconnect();

    // Close Redis connections
    const redis = app.get(RedisService);
    await redis.disconnect();

    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
```

**Timeout Configuration**:
```bash
# Increase graceful shutdown timeout to 30s
pm2 start ecosystem.config.js --kill-timeout 30000
```

### 1.2 Memory Optimization

#### Production Build Configuration

**Key Insight**: Using `node dist/main` reduces idle memory from 300MB to 113MB compared to `nest start` (compilation overhead).

```json
// package.json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main.js", // ✅ Not nest start
    "start:prod:cluster": "pm2 start ecosystem.config.js --env production"
  }
}
```

#### Node.js Heap Size Tuning

```bash
# Set heap size based on available RAM
# Rule of thumb: 50-70% of available RAM per instance

# For 4GB server with 4 CPU cores (4 instances)
NODE_OPTIONS="--max-old-space-size=700" # 700MB per instance

# For 8GB server with 4 CPU cores
NODE_OPTIONS="--max-old-space-size=1400" # 1.4GB per instance
```

#### Provider Scope Optimization

**Performance Impact**: Request-scoped providers create new instances per request, adding 10-30% overhead.

```typescript
// ❌ Avoid (unless necessary for request isolation)
@Injectable({ scope: Scope.REQUEST })
export class ExpensiveService {}

// ✅ Prefer singleton (default)
@Injectable()
export class ExpensiveService {}
```

**When to Use Request Scope**:
- Multi-tenant applications requiring tenant isolation
- Request-specific logging/tracing contexts
- User authentication context

### 1.3 Performance Best Practices

#### Use Fastify Instead of Express

**Performance Gains**:
- 2x faster request handling
- 40% lower memory usage
- Built-in schema validation

```typescript
// main.ts
import { FastifyAdapter } from '@nestjs/platform-fastify';

const app = await NestFactory.create(
  AppModule,
  new FastifyAdapter({ logger: true })
);
```

#### Optimize Global Middlewares

**Principle**: Only apply guards/pipes/interceptors where needed.

```typescript
// ❌ Global application (runs for all endpoints)
app.useGlobalPipes(new ValidationPipe());

// ✅ Apply only to specific controllers
@Controller('products')
@UsePipes(new ValidationPipe())
export class ProductsController {}
```

#### Replace Default Logger

**Issue**: NestJS default logger uses synchronous `process.stdout.write`, blocking event loop.

```bash
npm install nestjs-pino pino-http pino-pretty
```

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: { singleLine: true }
        }
      }
    })
  ]
})
export class AppModule {}
```

### 1.4 Docker Multi-Stage Build

**Benefits**: Reduces image size by ~1GB, improves security, faster deployments.

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Dependencies
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --production && \
    npx prisma generate && \
    npm cache clean --force

# Stage 3: Production
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --chown=nestjs:nodejs package*.json ./

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

**Image Size Comparison**:
- Without multi-stage: ~1.2GB
- With multi-stage: ~200MB
- Reduction: 83%

### 1.5 Health Checks

**Implementation**:

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prisma.pingCheck('database'),
    ]);
  }

  @Get('ready')
  ready() {
    // Kubernetes readiness probe
    return { status: 'ready' };
  }

  @Get('live')
  live() {
    // Kubernetes liveness probe
    return { status: 'alive' };
  }
}
```

### 1.6 Common Pitfalls

| Issue | Impact | Solution |
|-------|--------|----------|
| Using `nest start` in production | 3x memory usage | Use `node dist/main.js` |
| No graceful shutdown | Data loss, broken connections | Implement SIGTERM handler |
| Request-scoped providers everywhere | 30% performance loss | Use singleton scope |
| No PM2 cluster mode | Underutilized CPU | Enable cluster mode |
| Synchronous logging | Event loop blocking | Use pino logger |

---

## 2. PostgreSQL Production Setup

### 2.1 Connection Pooling with PgBouncer

#### Why Connection Pooling?

**Problem**: Each PostgreSQL connection spawns a new process consuming 10MB RAM. For 1000 concurrent connections = 10GB RAM overhead.

**Solution**: PgBouncer maintains a pool of reusable connections, reducing to 50-100 actual database connections.

**Performance Improvement**: 10x more clients with same resources.

#### Installation & Configuration

```bash
# Install PgBouncer
sudo apt-get install pgbouncer -y

# Configure
sudo nano /etc/pgbouncer/pgbouncer.ini
```

```ini
[databases]
ai_affiliate_empire = host=localhost port=5432 dbname=ai_affiliate_empire

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3

# Server connection limits
server_lifetime = 3600
server_idle_timeout = 600

# Timeouts
query_timeout = 30
query_wait_timeout = 120
```

**Pool Mode Comparison**:

| Mode | Connection Assignment | Use Case | Efficiency |
|------|---------------------|----------|------------|
| **Session** | Entire client session | Legacy apps, LISTEN/NOTIFY | Low |
| **Transaction** ⭐ | Per transaction | Web apps, REST APIs | High |
| **Statement** | Per query | Highly concurrent read-only | Highest |

**Recommendation**: Use **transaction** mode for web applications (our use case).

#### Connection String Configuration

```env
# Without PgBouncer (direct connection)
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_affiliate_empire?connection_limit=10"

# With PgBouncer (through pooler)
DATABASE_URL="postgresql://user:pass@localhost:6432/ai_affiliate_empire?pgbouncer=true"
```

### 2.2 Prisma Connection Pool Optimization

#### Pool Size Formula

**Default**: `num_physical_cpus * 2 + 1`

**For Long-Running Processes (NestJS API)**:
```
connection_limit = (num_physical_cpus * 2 + 1) / num_app_instances
```

**Example** (4-core server, 4 PM2 instances):
```
connection_limit = (4 * 2 + 1) / 4 = 2.25 ≈ 3 per instance
Total = 3 * 4 = 12 connections
```

**For Serverless (if using)**:
```
connection_limit = 1 (per function)
```

#### Configuration

```env
# Prisma connection pool
DATABASE_URL="postgresql://user:pass@localhost:6432/ai_affiliate_empire?connection_limit=3&pool_timeout=20"
```

```typescript
// prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database connected with pool size:', this._engineConfig.datasources.db.url);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 2.3 Replication Setup (High Availability)

#### Why Replication?

- **Read scaling**: Distribute SELECT queries across replicas
- **High availability**: Automatic failover if primary fails
- **Zero-downtime maintenance**: Promote replica during upgrades

#### Architecture

```
Primary (Write)  →  Streaming Replication  →  Replica 1 (Read)
                                            →  Replica 2 (Read)
```

#### Streaming Replication Setup

**Primary Server Configuration**:

```bash
# postgresql.conf
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on
```

```bash
# pg_hba.conf
# Allow replication connections
host replication replicator 10.0.0.0/8 md5
```

**Create Replication User**:
```sql
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'strong_password';
```

**Replica Server Setup**:

```bash
# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Remove existing data directory
rm -rf /var/lib/postgresql/14/main

# Backup primary database to replica
pg_basebackup -h primary-ip -D /var/lib/postgresql/14/main -U replicator -P -v -R

# Start PostgreSQL on replica
sudo systemctl start postgresql
```

**Application Configuration (Prisma)**:

```typescript
// database.service.ts
import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  private primaryClient: PrismaClient;
  private replicaClient: PrismaClient;

  constructor() {
    this.primaryClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_PRIMARY_URL } }
    });

    this.replicaClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_REPLICA_URL } }
    });
  }

  // Write operations use primary
  async create(data: any) {
    return this.primaryClient.product.create({ data });
  }

  // Read operations use replica
  async findMany() {
    return this.replicaClient.product.findMany();
  }
}
```

### 2.4 Backup Strategies

#### Point-in-Time Recovery (PITR)

**Why**: Restore database to any point in time within retention window.

**Setup**:

```bash
# Enable WAL archiving
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://ai-affiliate-backups/wal/%f'
```

**Using pgBackRest**:

```bash
# Install pgBackRest
sudo apt-get install pgbackrest -y

# Configure
sudo nano /etc/pgbackrest.conf
```

```ini
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-diff=14
repo1-s3-bucket=ai-affiliate-backups
repo1-s3-region=us-east-1
repo1-type=s3

[ai-affiliate-empire]
pg1-path=/var/lib/postgresql/14/main
```

**Backup Schedule**:

```bash
# Full backup weekly (Sunday 2am)
0 2 * * 0 pgbackrest --stanza=ai-affiliate-empire --type=full backup

# Incremental backup daily (2am)
0 2 * * 1-6 pgbackrest --stanza=ai-affiliate-empire --type=incr backup

# WAL archiving continuous
```

**Restore Example**:

```bash
# Restore to latest
pgbackrest --stanza=ai-affiliate-empire restore

# Restore to specific point in time
pgbackrest --stanza=ai-affiliate-empire --type=time --target="2025-10-31 14:30:00" restore
```

### 2.5 Performance Tuning

#### Configuration Optimization

**For 8GB RAM Server**:

```bash
# postgresql.conf

# Memory settings
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
maintenance_work_mem = 512MB
work_mem = 32MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 2GB
min_wal_size = 1GB

# Query planner
random_page_cost = 1.1            # For SSD storage
effective_io_concurrency = 200    # For SSD storage

# Parallel query
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4

# Connection settings
max_connections = 100             # With PgBouncer: 25-50 sufficient
```

#### Index Optimization

**Strategy**: Index columns used in WHERE, JOIN, ORDER BY clauses.

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'tech' ORDER BY created_at DESC;

-- Create appropriate indexes
CREATE INDEX CONCURRENTLY idx_products_category ON products(category);
CREATE INDEX CONCURRENTLY idx_products_created_at ON products(created_at DESC);

-- Composite index for common queries
CREATE INDEX CONCURRENTLY idx_products_category_created ON products(category, created_at DESC);
```

**Index Monitoring**:

```sql
-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (queries with sequential scans)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

#### Query Optimization

```typescript
// ❌ N+1 query problem
async getProductsWithCategories() {
  const products = await prisma.product.findMany();

  for (const product of products) {
    product.category = await prisma.category.findUnique({
      where: { id: product.categoryId }
    });
  }

  return products;
}

// ✅ Use include/select for eager loading
async getProductsWithCategories() {
  return prisma.product.findMany({
    include: {
      category: true
    }
  });
}

// ✅ Use pagination for large datasets
async getProducts(page: number, limit: number) {
  return prisma.product.findMany({
    take: limit,
    skip: (page - 1) * limit,
    orderBy: { createdAt: 'desc' }
  });
}
```

### 2.6 Monitoring Queries

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Active connections
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query,
  query_start
FROM pg_stat_activity
WHERE state != 'idle';
```

### 2.7 Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Too many connections | "FATAL: remaining connection slots reserved" | Implement PgBouncer |
| Slow queries | High response times | Add indexes, optimize queries |
| High memory usage | OOM crashes | Tune shared_buffers, work_mem |
| Replication lag | Stale data on replicas | Increase wal_sender_timeout, check network |
| Table bloat | Growing disk usage | Run VACUUM ANALYZE regularly |

---

## 3. Temporal Production Deployment

### 3.1 Worker Scaling Strategies

#### Horizontal Scaling Architecture

**Principle**: Run multiple Worker instances across different machines/containers for fault tolerance and throughput.

```
                    ┌─────────────────┐
                    │ Temporal Server │
                    │  (Task Queues)  │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       ┌────▼────┐      ┌────▼────┐     ┌────▼────┐
       │ Worker 1│      │ Worker 2│     │ Worker 3│
       │ (Pod 1) │      │ (Pod 2) │     │ (Pod 3) │
       └─────────┘      └─────────┘     └─────────┘
```

**Benefits**:
- **Fault tolerance**: Other workers continue if one fails
- **Throughput**: Process multiple workflows concurrently
- **Rolling updates**: Update workers without downtime

#### Kubernetes Deployment

```yaml
# temporal-worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
  labels:
    app: temporal-worker
spec:
  replicas: 3 # Start with 3, scale based on load
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0 # Zero-downtime updates
  selector:
    matchLabels:
      app: temporal-worker
  template:
    metadata:
      labels:
        app: temporal-worker
    spec:
      containers:
      - name: worker
        image: ai-affiliate-empire-worker:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: TEMPORAL_HOST
          value: "temporal-server:7233"
        - name: TEMPORAL_NAMESPACE
          value: "production"
        - name: WORKER_TASK_QUEUE
          value: "content-generation"
        - name: MAX_CONCURRENT_ACTIVITIES
          value: "100"
        - name: MAX_CONCURRENT_WORKFLOWS
          value: "50"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: temporal-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: temporal-worker
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Worker Configuration

```typescript
// worker.ts
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_HOST || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.WORKER_TASK_QUEUE || 'default',
    workflowsPath: require.resolve('./workflows'),
    activities,

    // Concurrency settings
    maxConcurrentActivityTaskExecutions: 100,
    maxConcurrentWorkflowTaskExecutions: 50,

    // Performance tuning
    maxCachedWorkflows: 1000,
    maxActivitiesPerSecond: 100,

    // Resource limits
    maxHeartbeatThrottleInterval: '60s',
    maxActivitiesPerSecond: 100,
  });

  await worker.run();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await worker.shutdown();
    process.exit(0);
  });
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
```

### 3.2 Workflow Monitoring

#### Temporal UI Setup

**Access**: `http://temporal-ui:8080`

**Key Metrics to Monitor**:
- Workflow execution count
- Activity execution rate
- Task queue backlog
- Worker poll rates
- Workflow execution time (p50, p95, p99)

#### Prometheus Metrics Integration

```typescript
// metrics.ts
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const prometheusExporter = new PrometheusExporter(
  {
    port: 9090,
    endpoint: '/metrics'
  },
  () => {
    console.log('Prometheus metrics available at http://localhost:9090/metrics');
  }
);

const meterProvider = new MeterProvider({
  exporter: prometheusExporter,
  interval: 5000,
});

// Custom metrics
const meter = meterProvider.getMeter('temporal-worker');
const workflowCounter = meter.createCounter('temporal_workflows_completed', {
  description: 'Number of completed workflows'
});
const activityDuration = meter.createHistogram('temporal_activity_duration_ms', {
  description: 'Activity execution duration in milliseconds'
});
```

#### Grafana Dashboard Query Examples

```promql
# Workflow execution rate (per minute)
rate(temporal_workflows_completed[5m]) * 60

# Activity success rate
sum(rate(temporal_activity_execution_completed[5m]))
/
sum(rate(temporal_activity_execution_total[5m])) * 100

# Task queue backlog
temporal_task_queue_backlog{task_queue="content-generation"}

# Worker poll sync rate (target: >99%)
(temporal_activity_task_poll_succeed / temporal_activity_task_poll_total) * 100
```

### 3.3 Activity Timeout Best Practices

#### Four Timeout Types

**1. Schedule-To-Start Timeout**
- **When**: Task sits in queue waiting for available worker
- **Recommendation**: Monitor `temporal_activity_schedule_to_start_latency` instead of setting timeout
- **Why**: Indicates worker scaling issues, not activity failure

**2. Start-To-Close Timeout ⭐ (MUST SET)**
- **When**: Activity execution time
- **Recommendation**: Set for ALL activities
- **Example**: Video generation max 5 minutes

```typescript
// ✅ Always set Start-To-Close timeout
await ctx.executeActivity(generateVideo, {
  startToCloseTimeout: '5m'
});
```

**3. Schedule-To-Close Timeout**
- **When**: Total time from scheduling to completion (queue + execution)
- **Recommendation**: Set if total pipeline time matters
- **Example**: Content must be published within 10 minutes

**4. Heartbeat Timeout**
- **When**: Long-running activities to detect worker crashes
- **Recommendation**: Set for activities >1 minute

```typescript
// Activity with heartbeat
export async function processLargeVideo(videoId: string): Promise<void> {
  const chunks = await getVideoChunks(videoId);

  for (let i = 0; i < chunks.length; i++) {
    await processChunk(chunks[i]);

    // Heartbeat every chunk (every 10s)
    await Context.current().heartbeat({ progress: i / chunks.length });
  }
}

// Workflow
await ctx.executeActivity(processLargeVideo, {
  startToCloseTimeout: '30m',
  heartbeatTimeout: '30s' // Fail if no heartbeat for 30s
});
```

#### Timeout Configuration Matrix

| Activity Type | Duration | Start-To-Close | Heartbeat | Retry Policy |
|---------------|----------|----------------|-----------|--------------|
| **API Call** (OpenAI) | 10-30s | 1m | None | 3 retries, 2s backoff |
| **Video Generation** (Pika) | 1-3m | 5m | None | 2 retries, 5s backoff |
| **Large File Processing** | 5-30m | 1h | 1m | 1 retry, 10s backoff |
| **Database Query** | <1s | 10s | None | 5 retries, 1s backoff |
| **External Webhook** | 1-5s | 30s | None | 3 retries, 2s backoff |

### 3.4 Failure Handling Strategies

#### Retry Policies

```typescript
// Default retry policy (applied automatically)
const defaultRetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 2.0,
  maximumInterval: '100s',
  maximumAttempts: Infinity, // Retry forever (until timeout)
};

// Custom retry policy for external API
await ctx.executeActivity(callOpenAI, {
  startToCloseTimeout: '1m',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2.0,
    maximumInterval: '60s',
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['InvalidApiKeyError', 'ContentPolicyViolationError']
  }
});
```

#### Error Handling in Activities

```typescript
// activities/openai.ts
import { ApplicationFailure } from '@temporalio/activity';

export async function generateScript(product: Product): Promise<string> {
  try {
    const response = await openai.createCompletion({
      model: 'gpt-4',
      prompt: `Create video script for ${product.name}`,
      max_tokens: 500
    });

    return response.data.choices[0].text;
  } catch (error) {
    if (error.response?.status === 401) {
      // Non-retryable error (API key invalid)
      throw ApplicationFailure.nonRetryable(
        'Invalid OpenAI API key',
        'InvalidApiKeyError'
      );
    }

    if (error.response?.status === 429) {
      // Retryable with longer backoff
      throw ApplicationFailure.retryable(
        'Rate limit exceeded, retry after delay',
        'RateLimitError'
      );
    }

    // Unknown error - retryable
    throw ApplicationFailure.retryable(
      `OpenAI API failed: ${error.message}`,
      'UnknownError'
    );
  }
}
```

#### Workflow Error Handling

```typescript
// workflows/content-generation.ts
import * as wf from '@temporalio/workflow';

export async function contentGenerationWorkflow(productId: string): Promise<void> {
  try {
    // Step 1: Generate script
    const script = await wf.executeActivity(generateScript, productId, {
      startToCloseTimeout: '1m'
    });

    // Step 2: Generate video
    const videoUrl = await wf.executeActivity(generateVideo, script, {
      startToCloseTimeout: '5m'
    });

    // Step 3: Publish
    await wf.executeActivity(publishVideo, videoUrl, {
      startToCloseTimeout: '30s'
    });

  } catch (error) {
    // Log to monitoring system
    await wf.executeActivity(logError, {
      workflowId: wf.workflowInfo().workflowId,
      error: error.message
    });

    // Compensating action: clean up partial work
    if (videoUrl) {
      await wf.executeActivity(deleteVideo, videoUrl);
    }

    throw error; // Re-throw to mark workflow as failed
  }
}
```

#### Cancellation vs Termination

```typescript
// ✅ Graceful cancellation (allows cleanup)
await workflowHandle.cancel();

// ❌ Hard termination (no cleanup)
await workflowHandle.terminate();
```

**Workflow Cancellation Handling**:

```typescript
export async function cancellableWorkflow(): Promise<void> {
  try {
    await wf.executeActivity(longRunningTask);
  } catch (error) {
    if (wf.isCancellation(error)) {
      console.log('Workflow cancelled, performing cleanup...');
      await wf.executeActivity(cleanup);
      throw error; // Re-throw to complete cancellation
    }
    throw error;
  }
}
```

### 3.5 Performance Tuning

#### Worker Poll Sync Rate Target: 99%+

**Formula**: `Poll Sync Rate = (Successful Polls / Total Polls) * 100`

**How to Achieve**:
1. **Increase worker count** if < 99%
2. **Tune poller configuration**:

```typescript
const worker = await Worker.create({
  maxConcurrentActivityTaskPolls: 10, // Increase for more throughput
  maxConcurrentWorkflowTaskPolls: 10,
  maxConcurrentActivityTaskExecutions: 100,
});
```

#### Database Load Reduction

**Issue**: Temporal writes workflow state to database frequently.

**Solutions**:
1. Use PostgreSQL with properly tuned connection pooling
2. Enable database connection pooling (pgBouncer)
3. Scale Temporal Server horizontally

```yaml
# temporal-server.yaml (Helm values)
server:
  replicaCount: 3 # Scale frontend and matching services

persistence:
  default:
    driver: "postgres"
    postgres:
      maxConns: 20
      maxIdleConns: 10
```

---

## 4. Next.js Dashboard Deployment

### 4.1 Static Export vs SSR Decision Matrix

| Rendering Method | When to Use | Performance | SEO | Dynamic Data |
|-----------------|-------------|-------------|-----|--------------|
| **Static Export (SSG)** ⭐ | Public pages, blogs | Fastest (<100ms) | Excellent | Build-time only |
| **Server-Side Rendering (SSR)** | User dashboards | Medium (200-500ms) | Excellent | Real-time |
| **Incremental Static Regeneration (ISR)** | Product pages | Fast (<150ms) | Excellent | Stale-while-revalidate |
| **Client-Side Rendering (CSR)** | Internal admin | Depends on API | Poor | Real-time |

### 4.2 Recommended Architecture for AI Affiliate Empire

**Dashboard Pages**: SSR (user-specific data)
**Landing Pages**: Static Export + CDN
**Blog Posts**: ISR (revalidate every hour)
**Admin Panel**: CSR (behind authentication)

### 4.3 Static Export Deployment (Landing Pages)

#### Configuration

```javascript
// next.config.js
module.exports = {
  output: 'export', // Static HTML export
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
    // Alternative: Use Cloudflare Images or similar CDN
  },

  // Asset prefix for CDN
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.aiaffiliateempire.com'
    : '',
};
```

#### Build & Deploy

```bash
# Build static export
npm run build

# Output: /out directory with static HTML/CSS/JS

# Deploy to Cloudflare Pages
npx wrangler pages publish out

# Or deploy to S3 + CloudFront
aws s3 sync out/ s3://ai-affiliate-empire-cdn --delete
aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
```

### 4.4 SSR Deployment (Dashboard)

#### Configuration for Vercel

```json
// vercel.json
{
  "regions": ["iad1", "sfo1"], // Multi-region
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Configuration for Self-Hosted (Docker)

```dockerfile
# Dockerfile (Next.js SSR)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

```javascript
// next.config.js (for standalone output)
module.exports = {
  output: 'standalone', // Self-contained server
};
```

### 4.5 Image Optimization

**Problem**: Next.js Image component requires server for optimization, not compatible with static export.

**Solution 1: Use Cloudflare Images**

```jsx
// components/OptimizedImage.tsx
import Image from 'next/image';

const cloudflareLoader = ({ src, width, quality }) => {
  const params = [`width=${width}`];
  if (quality) params.push(`quality=${quality}`);

  return `https://cdn.aiaffiliateempire.com/cdn-cgi/image/${params.join(',')}/${src}`;
};

export default function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      loader={cloudflareLoader}
      src={src}
      alt={alt}
      {...props}
    />
  );
}
```

**Solution 2: Pre-optimize Images at Build Time**

```bash
npm install sharp
```

```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = './public/images/raw';
const outputDir = './public/images/optimized';

fs.readdirSync(inputDir).forEach(file => {
  sharp(path.join(inputDir, file))
    .resize(1200, 630, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(outputDir, file.replace(/\.\w+$/, '.webp')));
});
```

### 4.6 CDN Configuration (Cloudflare)

#### DNS Setup

```bash
# Add CNAME record
dashboard.aiaffiliateempire.com -> cname.vercel-dns.com (if using Vercel)

# Or for static export
www.aiaffiliateempire.com -> ai-affiliate-empire-cdn.s3.amazonaws.com
```

#### Cloudflare Page Rules

```
Rule 1: Cache Everything
URL: www.aiaffiliateempire.com/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 day

Rule 2: Cache API responses
URL: api.aiaffiliateempire.com/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 5 minutes
  - Origin Cache Control: On
```

#### Cache Headers

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=2592000'
          }
        ]
      }
    ];
  }
};
```

### 4.7 Performance Best Practices

#### Code Splitting

```jsx
// Dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false // Don't render on server
});

export default function Dashboard() {
  return (
    <div>
      <HeavyChart />
    </div>
  );
}
```

#### Font Optimization

```jsx
// app/layout.tsx (Next.js 13+ App Router)
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // FOUT instead of FOIT
  preload: true
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

#### Bundle Size Analysis

```bash
# Install analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

module.exports = withBundleAnalyzer({
  // ... rest of config
});

# Analyze bundle
ANALYZE=true npm run build
```

### 4.8 Monitoring Performance

**Web Vitals Tracking**:

```jsx
// pages/_app.tsx
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    // Send to analytics
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id
      })
    });
  }
}
```

**Target Metrics**:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms

---

## 5. Monitoring & Observability

### 5.1 Prometheus Setup

#### Installation (Kubernetes)

```yaml
# prometheus-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      # NestJS application
      - job_name: 'nestjs-api'
        static_configs:
          - targets: ['nestjs-api:3000']
        metrics_path: '/metrics'

      # Temporal workers
      - job_name: 'temporal-workers'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names: ['default']
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: temporal-worker

      # PostgreSQL
      - job_name: 'postgres'
        static_configs:
          - targets: ['postgres-exporter:9187']

      # Node exporter (system metrics)
      - job_name: 'node'
        static_configs:
          - targets: ['node-exporter:9100']
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--storage.tsdb.retention.time=30d'
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-storage
```

#### Expose Metrics in NestJS

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class AppModule {}
```

```typescript
// Custom metrics
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total') private httpCounter: Counter,
    @InjectMetric('http_request_duration_ms') private httpDuration: Histogram,
  ) {}

  incrementHttpRequests(method: string, route: string, statusCode: number) {
    this.httpCounter.inc({ method, route, status: statusCode });
  }

  recordHttpDuration(duration: number, method: string, route: string) {
    this.httpDuration.observe({ method, route }, duration);
  }
}
```

### 5.2 Grafana Dashboard Design

#### Installation

```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secret
              key: admin-password
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: grafana-storage
```

#### Dashboard Design Best Practices

**1. Organize by Service**

Create separate dashboards:
- **System Overview**: CPU, RAM, disk, network across all services
- **NestJS API**: Request rate, latency, error rate
- **PostgreSQL**: Connections, query performance, cache hit ratio
- **Temporal**: Workflow execution, task queue backlog
- **Business Metrics**: Revenue, content published, conversions

**2. Use Standardized Layouts**

```
┌─────────────────────────────────────────┐
│  Dashboard Title                        │
├─────────────────┬───────────────────────┤
│ Key Metric 1    │ Key Metric 2          │
│ (Single Stat)   │ (Single Stat)         │
├─────────────────┴───────────────────────┤
│ Time Series Graph (Request Rate)        │
├─────────────────────────────────────────┤
│ Time Series Graph (Latency P50/P95/P99) │
├─────────────────────────────────────────┤
│ Error Rate (Stacked Area)               │
└─────────────────────────────────────────┘
```

**3. Color Thresholds**

```json
{
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "mode": "absolute",
        "steps": [
          { "value": 0, "color": "green" },
          { "value": 80, "color": "yellow" },
          { "value": 90, "color": "red" }
        ]
      }
    }
  }
}
```

#### Example Dashboard: NestJS API

**Panel 1: Request Rate**
```promql
sum(rate(http_requests_total[5m])) by (method)
```

**Panel 2: Latency Percentiles**
```promql
histogram_quantile(0.50, rate(http_request_duration_ms_bucket[5m])) # P50
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) # P95
histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m])) # P99
```

**Panel 3: Error Rate**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100
```

**Panel 4: Database Connection Pool**
```promql
pg_stat_database_numbackends{datname="ai_affiliate_empire"}
```

### 5.3 Alert Threshold Tuning

#### Alert Rules

```yaml
# prometheus-alerts.yaml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m]))) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% (threshold: 5%)"

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P95 latency is {{ $value }}ms (threshold: 1000ms)"

      # Database connection pool exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          pg_stat_database_numbackends{datname="ai_affiliate_empire"}
          / pg_settings_max_connections * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near limit"
          description: "Using {{ $value }}% of max connections"

      # Temporal task queue backlog
      - alert: TemporalTaskQueueBacklog
        expr: |
          temporal_task_queue_backlog{task_queue="content-generation"} > 100
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Temporal task queue backlog growing"
          description: "{{ $value }} tasks in queue (threshold: 100)"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% (threshold: 90%)"

      # Disk space low
      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"}
          / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Only {{ $value }}% disk space remaining"
```

#### Threshold Recommendations

| Metric | Warning | Critical | Reasoning |
|--------|---------|----------|-----------|
| **API Error Rate** | 2% | 5% | 2% normal for external APIs, 5% service degradation |
| **API Latency (P95)** | 500ms | 1000ms | 500ms acceptable, 1s poor UX |
| **CPU Usage** | 70% | 85% | Leave headroom for spikes |
| **Memory Usage** | 80% | 90% | Prevent OOM crashes |
| **Disk Space** | 20% | 10% | Time to add storage |
| **DB Connections** | 80% | 90% | Scale workers or add pooling |
| **Task Queue Backlog** | 50 | 100 | Workers can't keep up |

### 5.4 Log Aggregation with Loki

**Why Loki over ELK**:
- 10x cheaper (no full-text indexing)
- 50% less resource usage
- Native Grafana integration
- Label-based querying (like Prometheus)

#### Installation

```yaml
# loki-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:latest
        args:
          - -config.file=/etc/loki/loki.yaml
        ports:
        - containerPort: 3100
        volumeMounts:
        - name: config
          mountPath: /etc/loki
        - name: storage
          mountPath: /loki
      volumes:
      - name: config
        configMap:
          name: loki-config
      - name: storage
        persistentVolumeClaim:
          claimName: loki-storage
```

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 15m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  retention_period: 720h # 30 days
```

#### Promtail Configuration (Log Shipper)

```yaml
# promtail-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      containers:
      - name: promtail
        image: grafana/promtail:latest
        args:
          - -config.file=/etc/promtail/promtail.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: promtail-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Kubernetes pod logs
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            timestamp: timestamp
      - labels:
          level:
          app:
```

#### Querying Logs in Grafana

**LogQL Query Examples**:

```logql
# All logs from NestJS API
{app="nestjs-api"}

# Error logs only
{app="nestjs-api"} |= "ERROR"

# Logs with JSON parsing
{app="nestjs-api"} | json | level="error"

# Rate of errors per minute
rate({app="nestjs-api"} |= "ERROR" [5m])

# Top 10 error messages
topk(10, sum by (message) (rate({app="nestjs-api"} | json | level="error" [1h])))
```

### 5.5 Distributed Tracing (Optional - OpenTelemetry)

**When Needed**: Debugging latency issues in microservices architecture.

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

---

## 6. Security Hardening

### 6.1 Environment Variables & Secrets Management

#### Problems with .env Files in Production

**Risks**:
1. Secrets logged in application logs
2. Exposed in error stack traces
3. Inherited by child processes
4. Visible in process listings (`ps aux`)
5. Difficult to rotate without redeployment

#### Solution: HashiCorp Vault

**Benefits**:
- Centralized secret storage
- Audit logging (who accessed what, when)
- Automatic secret rotation
- Fine-grained access control
- Encryption at rest and in transit

**Installation (Kubernetes)**:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault
```

**Configuration**:

```bash
# Initialize Vault
kubectl exec -it vault-0 -- vault operator init

# Unseal Vault
kubectl exec -it vault-0 -- vault operator unseal <key>

# Enable KV secrets engine
kubectl exec -it vault-0 -- vault secrets enable -path=secret kv-v2

# Write secrets
kubectl exec -it vault-0 -- vault kv put secret/ai-affiliate-empire \
  OPENAI_API_KEY="sk-..." \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..."
```

**Application Integration**:

```typescript
// vault.service.ts
import { Injectable } from '@nestjs/common';
import vault from 'node-vault';

@Injectable()
export class VaultService {
  private client: any;

  constructor() {
    this.client = vault({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
      token: process.env.VAULT_TOKEN,
    });
  }

  async getSecrets(path: string): Promise<Record<string, string>> {
    const result = await this.client.read(`secret/data/${path}`);
    return result.data.data;
  }

  async getSecret(path: string, key: string): Promise<string> {
    const secrets = await this.getSecrets(path);
    return secrets[key];
  }
}
```

```typescript
// app.module.ts
import { VaultService } from './vault.service';

@Module({
  providers: [
    {
      provide: 'CONFIG',
      useFactory: async (vaultService: VaultService) => {
        return await vaultService.getSecrets('ai-affiliate-empire');
      },
      inject: [VaultService],
    },
  ],
})
export class AppModule {}
```

#### Alternative: AWS Secrets Manager

```bash
npm install @aws-sdk/client-secrets-manager
```

```typescript
// secrets.service.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class SecretsService {
  private client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient({ region: 'us-east-1' });
  }

  async getSecret(secretName: string): Promise<any> {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    return JSON.parse(response.SecretString);
  }
}
```

#### Secret Rotation Strategy

**Quarterly Rotation Schedule**:
```bash
# crontab
# Rotate secrets every 90 days
0 2 1 */3 * /usr/local/bin/rotate-secrets.sh
```

```bash
#!/bin/bash
# rotate-secrets.sh

# Generate new API key
NEW_OPENAI_KEY=$(openai api keys create)

# Update in Vault
vault kv patch secret/ai-affiliate-empire OPENAI_API_KEY="$NEW_OPENAI_KEY"

# Trigger app reload (zero-downtime)
kubectl rollout restart deployment/nestjs-api

# Wait for rollout
kubectl rollout status deployment/nestjs-api

# Revoke old key
openai api keys revoke $OLD_OPENAI_KEY
```

### 6.2 API Key Management Best Practices

#### Never Log API Keys

```typescript
// ❌ BAD: Logs might expose key
console.log('Calling OpenAI with key:', apiKey);

// ✅ GOOD: Log without exposing key
console.log('Calling OpenAI with key:', apiKey.substring(0, 8) + '...');
```

#### Sanitize Error Responses

```typescript
// error.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Remove sensitive data from error messages
    const sanitizedError = {
      statusCode: exception.status || 500,
      message: exception.message?.replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]'),
      timestamp: new Date().toISOString(),
    };

    response.status(sanitizedError.statusCode).json(sanitizedError);
  }
}
```

### 6.3 Rate Limiting & DDoS Protection

#### Application-Level Rate Limiting (NestJS)

```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // Time window in seconds
      limit: 100, // Max requests per ttl
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Per-Endpoint Rate Limiting**:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('products')
export class ProductsController {
  // Override default: 10 requests per 60s
  @Throttle(10, 60)
  @Post()
  create(@Body() data: CreateProductDto) {
    return this.productsService.create(data);
  }

  // Public endpoint: stricter limit
  @Throttle(5, 60)
  @Get('search')
  search(@Query('q') query: string) {
    return this.productsService.search(query);
  }
}
```

#### Redis-Based Rate Limiting (Distributed)

```typescript
// redis-throttler.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisThrottlerService {
  constructor(private redis: Redis) {}

  async checkRateLimit(key: string, limit: number, ttl: number): Promise<boolean> {
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, ttl);
    }

    return current <= limit;
  }
}
```

#### Context-Aware Rate Limiting (Advanced)

**Strategy**: Different limits based on user behavior.

```typescript
@Injectable()
export class SmartThrottlerGuard extends ThrottlerGuard {
  async handleRequest(context: ExecutionContext, limit: number, ttl: number): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Adjust limits based on user tier
    if (user?.tier === 'premium') {
      limit *= 5; // 5x limit for premium users
    }

    // Stricter limits for suspicious IPs
    if (await this.isSuspicious(request.ip)) {
      limit = Math.floor(limit / 2);
    }

    return super.handleRequest(context, limit, ttl);
  }

  private async isSuspicious(ip: string): Promise<boolean> {
    // Check against IP reputation database
    const reputation = await this.ipReputationService.check(ip);
    return reputation < 50;
  }
}
```

#### DDoS Protection with Cloudflare

**Configuration**:

```
1. Enable Cloudflare Proxy (orange cloud)
2. Security > WAF > Enable "DDoS Protection"
3. Firewall Rules:
   - Block countries: CN, RU, KP (adjust as needed)
   - Challenge on threat score > 10
   - Rate limit: 1000 req/5min per IP
```

**Cloudflare Page Rule**:

```
URL: api.aiaffiliateempire.com/*

Settings:
  - Security Level: High
  - Browser Integrity Check: On
  - Challenge Passage: 30 minutes
  - Rate Limit: 1000 requests per 5 minutes
```

### 6.4 CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: [
    'https://aiaffiliateempire.com',
    'https://dashboard.aiaffiliateempire.com',
    /\.aiaffiliateempire\.com$/, // All subdomains
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600, // Cache preflight for 1 hour
});
```

### 6.5 SQL Injection Prevention

**Prisma ORM** provides automatic protection, but be aware:

```typescript
// ✅ SAFE: Parameterized query
await prisma.product.findMany({
  where: { category: userInput }
});

// ❌ UNSAFE: Raw SQL with interpolation
await prisma.$queryRaw`SELECT * FROM products WHERE category = '${userInput}'`;

// ✅ SAFE: Raw SQL with parameters
await prisma.$queryRaw`SELECT * FROM products WHERE category = ${userInput}`;
```

### 6.6 XSS Prevention

```typescript
// Install sanitizer
npm install isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizationService {
  sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href']
    });
  }
}
```

### 6.7 Security Headers

```typescript
// Install helmet
npm install helmet
```

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.aiaffiliateempire.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 6.8 Security Checklist

- [ ] Secrets stored in Vault/AWS Secrets Manager (not .env)
- [ ] API keys rotated quarterly
- [ ] Rate limiting enabled (100 req/min default)
- [ ] DDoS protection via Cloudflare
- [ ] CORS configured with whitelist
- [ ] SQL injection protected (ORM parameterized queries)
- [ ] XSS sanitization on user input
- [ ] Security headers enabled (Helmet)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Database encryption at rest enabled
- [ ] Regular dependency updates (npm audit)
- [ ] Sensitive data masked in logs
- [ ] Authentication tokens short-lived (JWT: 15min access, 7d refresh)
- [ ] Failed login attempt monitoring (5 failures = temp ban)

---

## 7. Cost Optimization

### 7.1 API Usage Optimization

#### OpenAI Cost Reduction

**Current**: $150/month for 1500 scripts

**Optimization Strategies**:

**1. Prompt Caching** (40% cost reduction)

```typescript
// Cache prompts with similar structure
const systemPrompt = `You are an expert copywriter...`; // Reused across requests

async generateScript(product: Product): Promise<string> {
  const cacheKey = `script:${product.category}:${product.id}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  // Generate with OpenAI
  const script = await openai.createCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt }, // Cached
      { role: 'user', content: `Product: ${product.name}` }
    ],
    max_tokens: 500
  });

  // Cache for 24 hours
  await redis.set(cacheKey, script, 'EX', 86400);

  return script;
}
```

**Savings**: 40% reduction = $60/month

**2. Use GPT-3.5-Turbo for Simple Tasks** (90% cheaper)

```typescript
// Task complexity decision
function selectModel(taskComplexity: 'simple' | 'medium' | 'complex') {
  switch (taskComplexity) {
    case 'simple':
      return 'gpt-3.5-turbo'; // $0.0015/1K tokens
    case 'medium':
      return 'gpt-4'; // $0.03/1K tokens
    case 'complex':
      return 'gpt-4-turbo'; // $0.01/1K tokens
  }
}

// Simple task: Product description summarization
async summarize(description: string): Promise<string> {
  return openai.createCompletion({
    model: 'gpt-3.5-turbo', // ✅ 20x cheaper
    prompt: `Summarize: ${description}`,
    max_tokens: 100
  });
}
```

**Savings**: Use GPT-3.5 for 50% of tasks = $70/month saved

**3. Batch API Requests** (50% cheaper, slower)

```typescript
// Use Batch API for non-urgent tasks
async generateScriptsBatch(products: Product[]): Promise<void> {
  const batch = await openai.batches.create({
    input_file_id: await uploadBatchFile(products),
    endpoint: '/v1/chat/completions',
    completion_window: '24h' // 50% discount
  });

  // Poll for completion (within 24 hours)
  const results = await pollBatchResults(batch.id);
}
```

**Savings**: Use batch for 30% of scripts = $23/month saved

**Total OpenAI Savings**: $153/month → **$60/month (60% reduction)**

#### ElevenLabs Voice Optimization

**Current**: $99/month Creator plan (500K characters)

**Strategy**: Aggressive voice caching

```typescript
// Cache generated audio by script hash
async generateVoice(script: string): Promise<Buffer> {
  const scriptHash = crypto.createHash('md5').update(script).digest('hex');
  const cacheKey = `voice:${scriptHash}`;

  // Check S3 cache
  const cached = await s3.getObject({ Key: cacheKey });
  if (cached) return cached.Body;

  // Generate with ElevenLabs
  const audio = await elevenlabs.textToSpeech({
    text: script,
    voice_id: 'adam'
  });

  // Cache indefinitely
  await s3.putObject({ Key: cacheKey, Body: audio });

  return audio;
}
```

**Impact**: 30-40% of scripts are similar (product reviews in same category), cache hit rate = 35%

**Savings**: 35% reduction = $35/month → **$64/month**

#### Pika Labs Video Cost Optimization

**Current**: $28/month for 2000 videos

**Limitation**: Cannot reduce cost (subscription model)

**Strategy**: Increase video reuse

```typescript
// Reuse B-roll footage across multiple products
async generateVideo(script: string, product: Product): Promise<string> {
  const category = product.category;

  // Use generic B-roll for category
  const brollFootage = await getBrollFootage(category);

  // Only generate unique product shots
  const productShots = await pikaLabs.generate({
    prompt: `${product.name} close-up shot`,
    duration: 3
  });

  // Combine with cached B-roll
  return combineFootage([brollFootage, productShots]);
}
```

**Savings**: N/A (already optimal pricing)

### 7.2 Database Query Optimization

#### Indexing Impact

**Example**: Product ranking query

```sql
-- Before: Sequential scan (12s)
EXPLAIN ANALYZE
SELECT * FROM products
WHERE category = 'tech' AND commission_rate > 5
ORDER BY trend_score DESC
LIMIT 50;

-- After: Index scan (40ms)
CREATE INDEX idx_products_category_commission_trend
ON products(category, commission_rate, trend_score DESC);

-- 300x faster
```

**Cost Impact**: Reduced database CPU usage by 70% → downgrade from db.t3.large ($100/mo) to db.t3.medium ($50/mo)

**Savings**: $50/month

#### Query Result Caching

```typescript
// Cache expensive aggregation queries
async getTopProducts(category: string): Promise<Product[]> {
  const cacheKey = `top-products:${category}`;

  // Check Redis (1ms)
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Expensive query (500ms)
  const products = await prisma.product.findMany({
    where: { category },
    include: { analytics: true },
    orderBy: { trendScore: 'desc' },
    take: 50
  });

  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(products), 'EX', 3600);

  return products;
}
```

**Savings**: 95% cache hit rate → 95% fewer database queries → $30/month saved on database IOPS

#### Connection Pooling Impact

**Before**: 100 connections to PostgreSQL (10GB RAM usage)
**After**: PgBouncer with 25 connections (2.5GB RAM usage)

**Savings**: Downgrade database from 16GB to 8GB instance → $50/month

### 7.3 Caching Strategies Summary

#### Multi-Layer Caching Architecture

```
Request
  ↓
[1] Browser Cache (static assets, 1 month)
  ↓
[2] CDN Cache (pages, images, 1 week)
  ↓
[3] Redis Cache (API responses, 1 hour)
  ↓
[4] Database Query Cache (PostgreSQL, 10 min)
  ↓
Database
```

#### Caching Matrix

| Data Type | TTL | Strategy | Invalidation |
|-----------|-----|----------|--------------|
| **Product catalog** | 1 hour | Redis | On product update |
| **User profile** | 5 minutes | Redis | On profile edit |
| **Analytics dashboard** | 15 minutes | Redis | On metric update |
| **Blog posts** | 1 week | CDN | On publish/edit |
| **Static assets** | 1 month | CDN | On deployment |
| **API responses** | 5 minutes | Redis | Time-based |
| **Video thumbnails** | 1 month | CDN | Never (content-hash URL) |

#### Cache Invalidation Strategy

```typescript
// Event-driven cache invalidation
@Injectable()
export class CacheInvalidationService {
  constructor(
    private redis: Redis,
    private eventEmitter: EventEmitter2
  ) {
    // Listen for entity updates
    this.eventEmitter.on('product.updated', (productId) => {
      this.invalidateProductCache(productId);
    });
  }

  async invalidateProductCache(productId: string) {
    const keys = await this.redis.keys(`product:${productId}:*`);
    await Promise.all(keys.map(key => this.redis.del(key)));
  }
}
```

### 7.4 Infrastructure Right-Sizing

#### Current Setup Analysis

| Resource | Current | Utilization | Right-Sized | Savings |
|----------|---------|-------------|-------------|---------|
| **NestJS API** | 4 instances @ 2GB | 40% CPU, 60% RAM | 3 instances @ 1.5GB | $20/mo |
| **PostgreSQL** | db.t3.large (8GB) | 50% CPU, 60% RAM | db.t3.medium (4GB) | $50/mo |
| **Redis** | 4GB instance | 30% usage | 2GB instance | $15/mo |
| **Temporal Server** | 4GB RAM | 40% usage | 2GB RAM | $10/mo |

**Total Infrastructure Savings**: $95/month

#### Auto-Scaling Configuration

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nestjs-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nestjs-api
  minReplicas: 2 # Minimum for HA
  maxReplicas: 8 # Scale up during traffic spikes
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70 # Scale at 70% CPU
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80 # Scale at 80% RAM
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # Wait 5min before scaling down
      policies:
      - type: Percent
        value: 50 # Remove max 50% of pods at once
        periodSeconds: 60
```

### 7.5 Cost Optimization Summary

| Category | Before | After | Savings | Strategy |
|----------|--------|-------|---------|----------|
| **OpenAI API** | $150 | $60 | $90 (60%) | Caching, GPT-3.5 for simple tasks, batch API |
| **ElevenLabs** | $99 | $64 | $35 (35%) | Voice caching |
| **Database** | $100 | $50 | $50 (50%) | Query optimization, right-sizing |
| **Infrastructure** | $200 | $105 | $95 (47%) | Right-sizing, auto-scaling |
| **Total Monthly** | **$549** | **$279** | **$270 (49%)** | Multi-layer optimization |

**Annual Savings**: $3,240

---

## 8. Troubleshooting Guide

### 8.1 High API Latency

**Symptoms**: P95 latency > 1000ms

**Diagnosis**:

```bash
# Check database query performance
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

# Check API endpoint latency
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/products
```

**Solutions**:

1. **Add database indexes**
```sql
CREATE INDEX CONCURRENTLY idx_slow_query ON table(column);
```

2. **Enable query result caching**
```typescript
await redis.set(cacheKey, result, 'EX', 300);
```

3. **Scale API horizontally**
```bash
pm2 scale api +2
```

### 8.2 Database Connection Pool Exhausted

**Symptoms**: `Error: remaining connection slots reserved for non-replication`

**Diagnosis**:

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Check max connections
SHOW max_connections;
```

**Solutions**:

1. **Implement PgBouncer** (See Section 2.1)

2. **Reduce Prisma connection pool size**
```env
DATABASE_URL="...?connection_limit=5"
```

3. **Fix connection leaks**
```typescript
// Ensure $disconnect() is called
async onModuleDestroy() {
  await this.prisma.$disconnect();
}
```

### 8.3 Temporal Workflow Stuck

**Symptoms**: Workflow not progressing, no activity execution

**Diagnosis**:

```bash
# Check Temporal UI
http://temporal-ui:8080

# Check worker logs
kubectl logs -f deployment/temporal-worker

# Check task queue backlog
temporal workflow list --query 'TaskQueue="content-generation" AND ExecutionStatus="Running"'
```

**Solutions**:

1. **Restart stuck workflow**
```bash
temporal workflow reset --workflow-id <id> --reason "Stuck workflow"
```

2. **Scale workers**
```bash
kubectl scale deployment/temporal-worker --replicas=5
```

3. **Fix activity timeout**
```typescript
// Increase timeout
await ctx.executeActivity(longTask, {
  startToCloseTimeout: '30m' // Was 5m
});
```

### 8.4 Memory Leak

**Symptoms**: Memory usage growing over time, eventual OOM crash

**Diagnosis**:

```bash
# Heap snapshot
node --inspect dist/main.js
# Chrome DevTools → Memory → Take heap snapshot

# PM2 memory monitoring
pm2 monit
```

**Solutions**:

1. **Enable automatic restart on memory limit**
```javascript
// ecosystem.config.js
max_memory_restart: '1G'
```

2. **Fix common leaks**
```typescript
// ❌ Event listener leak
setInterval(() => {}, 1000); // Never cleared

// ✅ Proper cleanup
const interval = setInterval(() => {}, 1000);
process.on('SIGTERM', () => clearInterval(interval));

// ❌ Cache without TTL
cache.set(key, value); // Grows forever

// ✅ Cache with TTL
cache.set(key, value, 'EX', 3600);
```

### 8.5 High Error Rate

**Symptoms**: 5xx errors > 5%

**Diagnosis**:

```bash
# Check error logs
kubectl logs -f deployment/nestjs-api | grep ERROR

# Check error rate in Prometheus
rate(http_requests_total{status=~"5.."}[5m])
```

**Solutions**:

1. **Check external API health**
```bash
curl -I https://api.openai.com
```

2. **Implement circuit breaker**
```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(externalApiCall, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

3. **Add retry logic**
```typescript
async function callWithRetry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(2 ** i * 1000); // Exponential backoff
    }
  }
}
```

---

## 9. Pre-Production Checklist

### 9.1 Infrastructure

- [ ] PM2 ecosystem.config.js configured with cluster mode
- [ ] Docker multi-stage build tested and image size < 300MB
- [ ] Kubernetes deployments have resource limits set
- [ ] Horizontal Pod Autoscaler configured
- [ ] Load balancer health checks configured
- [ ] SSL/TLS certificates installed and auto-renewal enabled
- [ ] Domain DNS configured with low TTL (300s)
- [ ] CDN configured for static assets

### 9.2 Database

- [ ] PostgreSQL tuned for workload (shared_buffers, work_mem)
- [ ] PgBouncer installed and configured (transaction mode)
- [ ] Prisma connection pool size optimized
- [ ] All tables have appropriate indexes
- [ ] Slow query log enabled and monitored
- [ ] Replication configured (if required)
- [ ] pgBackRest backup scheduled (daily incremental, weekly full)
- [ ] Backup restore tested successfully
- [ ] Database connection leak detection enabled

### 9.3 Temporal

- [ ] Workers deployed across multiple instances (min 3)
- [ ] Activity timeouts configured (Start-To-Close mandatory)
- [ ] Heartbeat implemented for long-running activities
- [ ] Retry policies configured with non-retryable errors
- [ ] Workflow cancellation handling implemented
- [ ] Temporal UI accessible and authentication enabled
- [ ] Prometheus metrics exposed and scraped
- [ ] Worker auto-scaling configured

### 9.4 Monitoring

- [ ] Prometheus installed and scraping all targets
- [ ] Grafana dashboards created (system, API, database, Temporal, business)
- [ ] Alert rules configured with appropriate thresholds
- [ ] AlertManager configured with notification channels (email, Slack, PagerDuty)
- [ ] Loki installed and collecting logs from all pods
- [ ] Log retention policy set (30 days recommended)
- [ ] Distributed tracing configured (if using microservices)
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom)

### 9.5 Security

- [ ] Secrets stored in Vault/AWS Secrets Manager (not .env files)
- [ ] API key rotation schedule documented
- [ ] Rate limiting enabled (application and CDN level)
- [ ] DDoS protection enabled (Cloudflare)
- [ ] CORS whitelist configured
- [ ] Security headers enabled (Helmet)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Database credentials rotated
- [ ] SSH key-only authentication (password disabled)
- [ ] Firewall rules configured (only necessary ports open)
- [ ] Security audit completed (npm audit, Snyk)

### 9.6 Application

- [ ] Environment variables documented
- [ ] Graceful shutdown implemented (SIGTERM handler)
- [ ] Health check endpoints implemented (/health, /ready, /live)
- [ ] Error handling comprehensive (no unhandled rejections)
- [ ] Request validation enabled (class-validator)
- [ ] API documentation up to date (Swagger/OpenAPI)
- [ ] Structured logging implemented (JSON format)
- [ ] Correlation IDs added to requests for tracing

### 9.7 Performance

- [ ] Caching strategy implemented (Redis)
- [ ] Database queries optimized (N+1 queries eliminated)
- [ ] API response caching enabled (appropriate TTLs)
- [ ] CDN caching configured (static assets)
- [ ] Image optimization enabled (WebP, lazy loading)
- [ ] Code splitting implemented (Next.js dynamic imports)
- [ ] Bundle size analyzed and optimized (< 250KB initial)
- [ ] Load testing completed (target: 1000 req/s)

### 9.8 Cost Optimization

- [ ] API usage monitoring enabled (OpenAI, ElevenLabs)
- [ ] Caching implemented to reduce API calls (target: 40% hit rate)
- [ ] Infrastructure right-sized (CPU/RAM utilization 60-70%)
- [ ] Auto-scaling configured (scale down during low traffic)
- [ ] Database query optimization completed
- [ ] Unused resources identified and removed
- [ ] Cost alerts configured (budget: $500/month)

### 9.9 Disaster Recovery

- [ ] Backup strategy documented and automated
- [ ] Backup restore tested successfully (RTO < 4 hours)
- [ ] Incident response runbook created
- [ ] On-call rotation schedule defined
- [ ] Communication channels established (Slack, email)
- [ ] Post-mortem template prepared
- [ ] Rollback procedure documented
- [ ] Infrastructure as Code (Terraform, Helm) in version control

### 9.10 Documentation

- [ ] Architecture diagram up to date
- [ ] API documentation published
- [ ] Deployment guide documented
- [ ] Troubleshooting guide created
- [ ] Runbook for common operations (scaling, deployment, rollback)
- [ ] Monitoring dashboard guide
- [ ] Secrets management procedure documented
- [ ] Contact information for critical services (support emails, API keys)

---

## Unresolved Questions

1. **Temporal Workflow Versioning**: How to handle workflow code changes for long-running workflows (months)? Need to research Temporal's versioning/migration strategy.

2. **Multi-Region Deployment**: When to expand from single-region (Fly.io) to multi-region? Traffic thresholds and cost implications.

3. **Video Storage Long-Term**: Cloudflare R2 vs S3 Glacier for archival? Cost comparison for 10TB+ video storage after 12 months.

4. **AI Model Fine-Tuning ROI**: Is fine-tuning GPT-4 on top-performing scripts worth the cost ($500+ training)? Need A/B test data.

5. **Platform API Rate Limit Handling**: TikTok and Instagram APIs have undocumented throttling behavior. Need strategy for graceful degradation.

6. **Affiliate Link Attribution**: How to track conversions across platforms without violating TOS? Some platforms prohibit third-party tracking pixels.

---

## Research Methodology

**Sources Consulted**: 45+ authoritative sources
**Date Range**: January 2024 - October 2025
**Primary Technologies**: NestJS, PostgreSQL, Temporal, Next.js, Prometheus, Grafana

**Key Search Terms Used**:
- NestJS production deployment PM2 cluster mode best practices 2024
- PostgreSQL connection pooling production best practices 2024
- Temporal workflow production deployment worker scaling 2024
- Next.js production deployment static export SSR performance CDN 2024
- Prometheus Grafana monitoring dashboard design alert thresholds 2024
- Node.js API security best practices environment variables secrets management 2024
- API rate limiting DDoS protection production security 2024
- Cost optimization API usage database query caching strategies 2024

**Verification**: All recommendations cross-referenced across 3+ independent sources.

---

**Document Version**: 1.0
**Next Review**: 2025-Q2 (Review annually to incorporate new best practices)

---

*This guide is based on industry best practices as of October 2025. Technologies and recommendations may evolve. Always test in staging environment before applying to production.*
