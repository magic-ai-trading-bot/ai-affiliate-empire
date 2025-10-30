# Deployment Guide - AI Affiliate Empire

**Production deployment strategies and best practices**

---

## 🎯 Deployment Options

### Option 1: Fly.io (Recommended)

**Pros:**
- Global edge deployment
- Automatic SSL
- PostgreSQL included
- Affordable ($20-50/month)
- Easy scaling

**Setup:**

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Initialize app
fly launch --name ai-affiliate-empire

# Provision PostgreSQL
fly postgres create --name ai-affiliate-empire-db

# Attach database
fly postgres attach ai-affiliate-empire-db

# Set environment variables
fly secrets set \
  OPENAI_API_KEY="sk-..." \
  ANTHROPIC_API_KEY="sk-ant-..." \
  ELEVENLABS_API_KEY="..." \
  PIKALABS_API_KEY="..." \
  AMAZON_ACCESS_KEY="..." \
  AMAZON_SECRET_KEY="..." \
  AMAZON_PARTNER_TAG="..." \
  YOUTUBE_CLIENT_ID="..." \
  YOUTUBE_CLIENT_SECRET="..." \
  TIKTOK_CLIENT_KEY="..." \
  TIKTOK_CLIENT_SECRET="..." \
  INSTAGRAM_ACCESS_TOKEN="..." \
  INSTAGRAM_BUSINESS_ACCOUNT_ID="..."

# Deploy
fly deploy

# Run migrations
fly ssh console -C "npm run prisma:migrate:prod"
```

### Option 2: Railway

**Pros:**
- Simple deployment from GitHub
- Built-in PostgreSQL
- Automatic HTTPS
- Free tier available

**Setup:**

1. Connect GitHub repo to Railway
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy automatically on push

### Option 3: AWS (ECS/EC2)

**Pros:**
- Full control
- Scalable
- Professional infrastructure
- AWS ecosystem integration

**Cons:**
- More complex setup
- Higher cost

### Option 4: Digital Ocean App Platform

**Pros:**
- Simple deployment
- Managed database
- Affordable ($12-25/month)

---

## 📦 Dockerfile

```dockerfile
# Multi-stage build for smaller image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["npm", "run", "start:prod"]
```

---

## 🔐 Security Best Practices

### 1. Environment Variables

- **Never commit `.env` file**
- Use secrets management (Vault, AWS Secrets Manager)
- Rotate API keys regularly
- Use different keys for dev/staging/prod

### 2. Database Security

```bash
# Use connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=30"

# Enable SSL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

### 3. API Rate Limiting

Already configured in application with throttling guards.

### 4. CORS Configuration

```typescript
// src/main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['https://yourdomain.com'],
  credentials: true,
});
```

---

## 📊 Monitoring Setup

### 1. Application Logs

```bash
# View logs on Fly.io
fly logs

# Stream logs
fly logs -f
```

### 2. Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/node

# Add to .env
SENTRY_DSN="https://..."
```

```typescript
// src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 3. Performance Monitoring

Use Grafana + Prometheus for metrics:
- Request duration
- Database query performance
- API call success rates
- Video generation queue

---

## 🔄 CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master

      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## 🗄️ Database Management

### Backup Strategy

```bash
# Manual backup
fly ssh console -C "pg_dump $DATABASE_URL > backup.sql"

# Automated daily backups (cron)
0 2 * * * pg_dump $DATABASE_URL | gzip > backup-$(date +\%Y\%m\%d).sql.gz
```

### Restore

```bash
psql $DATABASE_URL < backup.sql
```

### Migrations

```bash
# Create migration
npm run prisma:migrate dev --name migration_name

# Deploy migration to production
npm run prisma:migrate:prod
```

---

## 📈 Scaling Strategy

### Horizontal Scaling

```bash
# Scale to 3 instances on Fly.io
fly scale count 3

# Auto-scaling
fly autoscale set min=2 max=10
```

### Database Scaling

```bash
# Upgrade PostgreSQL instance
fly postgres update --vm-size shared-cpu-2x
```

### Caching Strategy

Implement Redis for:
- Product ranking cache (1 hour TTL)
- API response cache
- Rate limiting

---

## 💰 Cost Optimization

### Current Monthly Costs

| Service | Cost | Purpose |
|---------|------|---------|
| Fly.io Basic | $10 | Hosting |
| PostgreSQL | $10 | Database |
| OpenAI API | $20-50 | Script generation |
| Anthropic Claude | $20-50 | Blog generation |
| ElevenLabs | $28 | Voice synthesis |
| Pika Labs | $28 | Video generation |
| **Total** | **$116-176/month** | |

### Optimization Tips

1. **Cache aggressively**: Reduce API calls
2. **Batch operations**: Process multiple items together
3. **Use cheaper models**: GPT-3.5 for simple tasks
4. **Implement fallbacks**: Template generation when API unavailable
5. **Monitor usage**: Track API costs daily

---

## 🚨 Disaster Recovery

### 1. Database Backup

- Automated daily backups
- Keep 30 days of backups
- Test restore monthly

### 2. Application State

- Stateless design allows easy recovery
- Re-deploy from Git
- Restore environment variables

### 3. Data Recovery Plan

- Document all data sources
- Maintain API credentials in secure vault
- Keep infrastructure as code

---

## 📋 Pre-Launch Checklist

### Technical
- [ ] Database migrations applied
- [ ] All environment variables set
- [ ] SSL/HTTPS configured
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] CI/CD pipeline working

### API Credentials
- [ ] OpenAI API key valid
- [ ] Anthropic API key valid
- [ ] ElevenLabs subscription active
- [ ] Pika Labs API access approved
- [ ] Amazon Associates approved
- [ ] YouTube OAuth configured
- [ ] TikTok Content API approved
- [ ] Instagram API permissions granted

### Testing
- [ ] End-to-end flow tested
- [ ] Video generation working
- [ ] Publishing to all platforms tested
- [ ] Analytics tracking verified
- [ ] Error handling tested
- [ ] Load testing completed

### Documentation
- [ ] README updated
- [ ] API documentation generated
- [ ] Setup guide reviewed
- [ ] Deployment guide finalized

---

## 🎓 Best Practices

1. **Use staging environment**: Test changes before production
2. **Monitor continuously**: Set up alerts for errors
3. **Version control**: Tag releases (v1.0.0, v1.1.0)
4. **Document changes**: Keep CHANGELOG.md updated
5. **Security audits**: Review dependencies quarterly
6. **Performance testing**: Load test before major releases
7. **Rollback plan**: Document how to revert deployments

---

## 📞 Emergency Contacts

- **Fly.io Support**: https://fly.io/docs/about/support/
- **PostgreSQL Issues**: https://www.postgresql.org/support/
- **API Provider Support**: Check respective documentation

---

**Status**: Deployment Guide Complete ✅

**Next**: Production deployment and monitoring setup
