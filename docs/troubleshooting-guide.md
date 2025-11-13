# Troubleshooting Guide - AI Affiliate Empire

**Last Updated**: 2025-11-01
**Status**: Complete
**Purpose**: Diagnose and resolve common issues

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Setup Issues](#setup-issues)
3. [Runtime Issues](#runtime-issues)
4. [API Issues](#api-issues)
5. [Database Issues](#database-issues)
6. [External Service Issues](#external-service-issues)
7. [Performance Issues](#performance-issues)
8. [Deployment Issues](#deployment-issues)
9. [Security Issues](#security-issues)
10. [When to Escalate](#when-to-escalate)

---

## Quick Diagnostics

### System Health Check

Run this command to diagnose your system:

```bash
# Check Node version (requires 18+)
node --version

# Check Docker
docker --version
docker-compose --version

# Check database
docker-compose exec postgres pg_isready

# Check services
curl http://localhost:3000/health

# Check logs
docker-compose logs
```

### Quick Fix Checklist

Before diving deeper:

- [ ] Is Docker running? (`docker ps`)
- [ ] Are all services running? (`docker-compose ps`)
- [ ] Is `.env` file properly configured?
- [ ] Did you run migrations? (`npm run prisma:migrate:dev`)
- [ ] Did you restart the dev server after changes? (Ctrl+C, then `npm run start:dev`)

---

## Setup Issues

### Issue: "npm ERR! code ERESOLVE"

**Symptom**: Dependency conflict during `npm install`

**Solution**:
```bash
# Method 1: Use legacy dependency resolution
npm install --legacy-peer-deps

# Method 2: Update npm
npm install -g npm@latest
npm ci

# Method 3: Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Issue: "command not found: npm"

**Symptom**: npm command not available

**Solution**:
```bash
# Install Node.js with npm
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Windows
# Download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

### Issue: "Docker daemon is not running"

**Symptom**: "Cannot connect to the Docker daemon"

**Solution**:
```bash
# macOS
open /Applications/Docker.app

# Linux
sudo systemctl start docker

# Windows
# Open Docker Desktop from Start menu

# Verify
docker --version
docker ps
```

### Issue: "docker-compose: command not found"

**Symptom**: docker-compose not available

**Solution**:
```bash
# Install Docker Compose
# macOS (if using Docker Desktop, it's included)
docker-compose --version

# If not included, install via Homebrew
brew install docker-compose

# Linux
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Issue: "Port 5432 already in use"

**Symptom**: Cannot start PostgreSQL container

**Solution**:
```bash
# Find what's using port 5432
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or use a different port
# Edit docker-compose.yml:
# ports:
#   - "5433:5432"

# Then update DATABASE_URL
DATABASE_URL="postgresql://postgres:password@localhost:5433/affiliate_empire"
```

### Issue: ".env file not found"

**Symptom**: Application won't start without `.env`

**Solution**:
```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env

# Verify required variables are set
```

---

## Runtime Issues

### Issue: "Cannot find module '@nestjs/core'"

**Symptom**: Module not installed

**Solution**:
```bash
# Reinstall dependencies
npm install

# Or install specific package
npm install @nestjs/core

# Verify installation
npm ls @nestjs/core
```

### Issue: "EADDRINUSE: address already in use :::3000"

**Symptom**: Port 3000 already in use

**Solution**:
```bash
# Method 1: Kill process using port 3000
lsof -i :3000
kill -9 <PID>

# Method 2: Use different port
PORT=3002 npm run start:dev

# Method 3: Wait for port to be released
# Sometimes takes a minute after previous process exit
sleep 10 && npm run start:dev
```

### Issue: "Prisma Client not generated"

**Symptom**: "Cannot find module '@prisma/client'"

**Solution**:
```bash
# Generate Prisma client
npm run prisma:generate

# Verify generation
ls node_modules/.prisma/client/

# If still fails, reinstall
npm install @prisma/client
npm run prisma:generate
```

### Issue: "TypeScript compilation error"

**Symptom**: "error TS2339: Property 'x' does not exist"

**Solution**:
```bash
# Run type check
npm run type-check

# Fix errors based on output
# Most common:
# - Missing type annotations
# - Typos in property names
# - Using any type

# Rebuild if needed
npm run build

# Clear TypeScript cache
rm -rf dist/
npm run build
```

### Issue: "Application crashes on startup"

**Symptom**: Application starts but immediately exits

**Solution**:
```bash
# Check logs for error message
npm run start:dev 2>&1 | tail -100

# Common causes:
# 1. Missing environment variable
#    Solution: Add to .env file

# 2. Database connection failed
#    Solution: Check DATABASE_URL and docker-compose status

# 3. Missing migration
#    Solution: npm run prisma:migrate:dev

# 4. Port already in use
#    Solution: Kill process or use different port
```

### Issue: "Health check endpoint returns 500"

**Symptom**: `curl http://localhost:3000/health` returns error

**Solution**:
```bash
# Check logs
docker-compose logs app

# Check database connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check Redis connection (if needed)
docker-compose exec redis redis-cli ping

# Restart services
docker-compose restart
```

---

## API Issues

### Issue: "401 Unauthorized"

**Symptom**: API endpoints return 401

**Causes & Solutions**:

1. **Missing token**:
   ```bash
   # Get token first
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@ai-affiliate-empire.com","password":"password"}'

   # Use token in requests
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/products
   ```

2. **Expired token**:
   ```bash
   # Refresh token
   curl -X POST http://localhost:3000/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
   ```

3. **Invalid token**:
   ```bash
   # Check token format
   # Should be: Bearer eyJhbGc...
   # Not: eyJhbGc...
   ```

### Issue: "403 Forbidden"

**Symptom**: User lacks permissions

**Solution**:
```bash
# Check user role
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/auth/me

# User must have ADMIN role for most endpoints
# Contact admin to update user role
```

### Issue: "404 Not Found"

**Symptom**: Endpoint returns 404

**Solution**:
```bash
# Check endpoint URL
# API routes should be under /api/

# Valid: http://localhost:3000/api/products
# Invalid: http://localhost:3000/products

# List available endpoints
curl http://localhost:3000/api

# Check documentation
# /docs/api-reference.md
```

### Issue: "422 Unprocessable Entity"

**Symptom**: Request validation fails

**Solution**:
```bash
# Check request body matches schema
# Example request:
curl -X POST http://localhost:3000/api/content/scripts \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-123",
    "tone": "enthusiastic",
    "language": "en"
  }'

# Common issues:
# - Missing required field
# - Wrong data type
# - Invalid enum value
```

### Issue: "429 Too Many Requests"

**Symptom**: Rate limit exceeded

**Solution**:
```bash
# Check rate limit headers
curl -I http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN"

# Headers show:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1635784200

# Wait until X-RateLimit-Reset timestamp
# Or reduce request frequency

# Default limits:
# - General endpoints: 100 req/min
# - Login: 10 attempts/min
# - Publishing: 20 req/hour
```

### Issue: "500 Internal Server Error"

**Symptom**: Server error on valid request

**Solution**:
```bash
# Check server logs
docker-compose logs app | tail -100

# Common issues:
# 1. Database error
#    Solution: Check database connection

# 2. External API failure
#    Solution: Check external service status

# 3. Unhandled exception
#    Solution: Check logs for stack trace

# Restart server
docker-compose restart app
npm run start:dev
```

---

## Database Issues

### Issue: "Database connection refused"

**Symptom**: "connect ECONNREFUSED 127.0.0.1:5432"

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Start if not running
docker-compose up -d postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL is correct
echo $DATABASE_URL
# Should be: postgresql://postgres:password@localhost:5432/affiliate_empire
```

### Issue: "relation 'public.product' does not exist"

**Symptom**: Database table not found

**Solution**:
```bash
# Check if migrations were run
npm run prisma:migrate:dev

# View current schema
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run prisma:migrate:reset

# Verify tables exist
docker-compose exec postgres psql -U postgres affiliate_empire -c "\dt"
```

### Issue: "permission denied for schema public"

**Symptom**: User lacks database permissions

**Solution**:
```bash
# Grant permissions
docker-compose exec postgres psql -U postgres -c "
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
"

# Or reset database
npm run prisma:migrate:reset
```

### Issue: "Deadlock in database transaction"

**Symptom**: Query hangs or times out

**Solution**:
```bash
# Check active connections
docker-compose exec postgres psql -U postgres -c "
SELECT pid, usename, application_name, state
FROM pg_stat_activity;"

# Kill blocking queries
docker-compose exec postgres psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction';"

# Restart database
docker-compose restart postgres
```

### Issue: "Disk space full"

**Symptom**: "no space left on device"

**Solution**:
```bash
# Check disk usage
docker system df

# Clean up Docker
docker system prune

# Remove old database backups
rm -rf backups/*.sql.gz

# Check database size
docker-compose exec postgres psql -U postgres -c "
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database;"
```

---

## External Service Issues

### Issue: "OpenAI API key invalid"

**Symptom**: "Incorrect API key provided"

**Solution**:
```bash
# Verify API key format
# Should start with: sk-proj-

echo $OPENAI_API_KEY

# Check key in .env file
grep OPENAI_API_KEY .env

# Use mock mode in development
OPENAI_MOCK_MODE=true

# Test API connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```


### Issue: "Temporal server not responding"

**Symptom**: "Error connecting to Temporal"

**Solution**:
```bash
# Check if Temporal is running
docker-compose ps temporal

# Start Temporal
docker-compose up -d temporal

# Check Temporal UI
open http://localhost:8233

# Check logs
docker-compose logs temporal

# Restart Temporal
docker-compose restart temporal
```

### Issue: "AWS Secrets Manager not accessible"

**Symptom**: "AccessDenied" when fetching secrets

**Solution**:
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check IAM permissions
# Need: secretsmanager:GetSecretValue

# Verify secret name
aws secretsmanager list-secrets

# Use fallback .env
AWS_SECRETS_MANAGER_ENABLED=false

# Check AWS region
echo $AWS_REGION  # Should be: us-east-1
```

### Issue: "YouTube upload fails"

**Symptom**: "401 Unauthorized" when publishing

**Solution**:
```bash
# Verify YouTube API key
grep YOUTUBE_API_KEY .env

# Check API is enabled in Google Cloud Console
# https://console.cloud.google.com/

# Verify channel is linked
# Run: npm run setup:youtube

# Check quota
curl -H "Authorization: Bearer YOUTUBE_TOKEN" \
  https://www.youtube.com/youtube/v3/quotas

# Use mock mode
YOUTUBE_MOCK_MODE=true
```

---

## Performance Issues

### Issue: "Application is slow"

**Symptom**: API responses take >1s

**Solution**:

1. **Check database queries**:
   ```bash
   # Enable query logging
   echo "DEBUG='prisma:query'" >> .env

   # Check for N+1 queries
   # Solution: Use include/select in Prisma queries
   ```

2. **Check external API calls**:
   ```bash
   # Monitor external API latency
   curl -w "Time: %{time_total}s" -o /dev/null \
     -s https://api.openai.com/v1/models
   ```

3. **Check memory usage**:
   ```bash
   # Monitor memory
   docker stats app

   # If high, restart
   docker-compose restart app
   ```

4. **Enable caching**:
   ```bash
   # Check Redis is running
   docker-compose exec redis redis-cli ping

   # Implement caching for frequently accessed data
   ```

### Issue: "Memory leak"

**Symptom**: Memory usage increases over time

**Solution**:
```bash
# Monitor memory
docker stats app

# Check for event listener leaks
# Review recent code changes

# Restart application
docker-compose restart app

# Check for circular references in code
# Run: npm run lint
```

### Issue: "Database queries are slow"

**Symptom**: Database operations take >500ms

**Solution**:
```bash
# Analyze slow queries
# Enable query logging in PostgreSQL
docker-compose exec postgres psql -U postgres affiliate_empire -c "
  SET log_min_duration_statement = 500;
"

# Check indexes
npm run prisma:studio
# Look for queries without indexes

# Add missing indexes in schema.prisma
# Example:
# @@index([createdAt])
# @@index([status, trendScore])

# Rebuild indexes
npm run prisma:migrate:dev
```

---

## Deployment Issues

### Issue: "Deployment fails with 'out of memory'"

**Symptom**: Docker build fails

**Solution**:
```bash
# Increase Docker memory limit
# Docker Desktop: Settings → Resources → Memory

# Clean Docker cache
docker system prune -a

# Build with less parallelism
docker build --cpus 1 -t app:latest .
```

### Issue: "Health check fails after deployment"

**Symptom**: Application crashes after deployment

**Solution**:
```bash
# Check deployment logs
fly logs  # If using Fly.io
docker-compose logs -f

# Verify environment variables
fly config show  # If using Fly.io

# Rollback to previous version
git revert HEAD
git push

# Or manually stop and restart
docker-compose down
docker-compose up -d
```

### Issue: "Database migrations fail"

**Symptom**: "Migration already applied" or schema mismatch

**Solution**:
```bash
# Check migration status
npm run prisma:migrate:status

# Skip problematic migration
npm run prisma:migrate:deploy --skip-generate

# Or reset and reapply (WARNING: data loss)
npm run prisma:migrate:reset

# Verify schema matches
npm run prisma:validate
```

---

## Security Issues

### Issue: "Credentials exposed in logs"

**Symptom**: API keys visible in logs

**Solution**:
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# Remove from git history (if already committed)
git rm --cached .env
git commit -m "Remove .env from version control"

# Rotate exposed credentials
# Regenerate API keys

# Review logs for sensitive data
docker-compose logs | grep -i "key\|token\|password"
```

### Issue: "SSL certificate error"

**Symptom**: "CERTIFICATE_VERIFY_FAILED"

**Solution**:
```bash
# Verify certificate is valid
openssl s_client -connect api.example.com:443

# Update certificate bundle
npm config set cafile /path/to/certificate.pem

# Or disable verification (NOT recommended for production)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start
```

### Issue: "SQL injection vulnerability"

**Symptom**: Suspicious query patterns in logs

**Solution**:
```bash
# Always use parameterized queries (Prisma does this)
# Good:
await prisma.product.findUnique({
  where: { id: userInput }
});

# Bad (never do this):
await prisma.$queryRaw(`SELECT * FROM product WHERE id = '${userInput}'`);

# Validate and sanitize inputs
# Use input validation middleware
```

---

## When to Escalate

Contact the team if you encounter:

1. **Data loss or corruption**:
   - Database won't start
   - Cannot recover data
   - Migrations failing repeatedly

2. **Security issues**:
   - Suspicious activity in logs
   - Credentials compromised
   - Unauthorized access

3. **Production outage**:
   - Application completely down
   - Database inaccessible
   - Multiple services failing

4. **Unresolved issues**:
   - Spent >1 hour troubleshooting
   - Not in this guide
   - Unsure about impact

### How to Report

1. **Gather information**:
   ```bash
   # Save logs
   docker-compose logs > logs.txt

   # Save system info
   node --version > system-info.txt
   docker --version >> system-info.txt
   ```

2. **Create GitHub issue** with:
   - Error message
   - Steps to reproduce
   - Logs (redacted if sensitive)
   - Expected vs actual behavior

3. **Alert team on Slack**:
   - In #ai-affiliate-empire channel
   - Include issue link
   - Mark as critical if production is down

---

## Useful Resources

- **Logs**: `docker-compose logs -f`
- **Database UI**: `npm run prisma:studio`
- **Temporal UI**: http://localhost:8233
- **API Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

---

**Last Updated**: 2025-11-01
**Version**: 1.0.0
**Maintainer**: Development Team

For additional help, refer to:
- `/docs/api-reference.md` - API endpoints
- `/docs/developer-onboarding.md` - Setup guide
- `/docs/system-architecture.md` - Architecture overview
