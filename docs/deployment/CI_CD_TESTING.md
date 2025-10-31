# CI/CD Testing Guide

Comprehensive guide for testing GitHub Actions workflows locally and validating CI/CD pipeline before pushing changes.

## Overview

Testing CI/CD pipelines locally prevents deployment failures and reduces iteration time. This guide covers local testing tools, validation procedures, and troubleshooting.

## Prerequisites

### Required Tools

```bash
# Install act (GitHub Actions local runner)
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (via scoop)
scoop install act

# Install Docker (required by act)
# macOS
brew install --cask docker

# Verify installation
act --version
docker --version
```

### Additional Tools

```bash
# Install actionlint (workflow syntax validator)
brew install actionlint

# Install yamllint (YAML validator)
pip install yamllint

# Install GitHub CLI (for secrets testing)
brew install gh
```

## Local Testing with Act

### Basic Usage

```bash
# List all workflows and jobs
act -l

# Run specific workflow
act -W .github/workflows/ci.yml

# Run specific job
act -j test

# Run on specific event
act push
act pull_request
```

### Testing CI Workflow

```bash
# Test the entire CI pipeline
cd /path/to/ai-affiliate-empire
act -W .github/workflows/ci.yml

# Test specific jobs
act -j lint          # Run linting only
act -j type-check    # Run TypeScript type checking
act -j test          # Run test suite
act -j security-audit # Run security audit
act -j build         # Run build process
```

### Testing CD Workflow

```bash
# Test staging deployment (dry-run)
act -W .github/workflows/cd.yml -j deploy-staging --dry-run

# Test production deployment (dry-run)
act -W .github/workflows/cd.yml -j deploy-production --dry-run

# Note: Actual deployments require secrets and should not be run locally
```

### Testing Docker Build

```bash
# Test Docker build workflow
act -W .github/workflows/docker-build.yml

# Test specific Docker job
act -j build-and-push --dry-run
act -j test-image
```

## Using Secrets in Local Tests

### Create Secrets File

```bash
# Create .secrets file (DO NOT commit this)
cat > .secrets <<EOF
FLY_API_TOKEN=your_fly_token_here
CODECOV_TOKEN=your_codecov_token
SNYK_TOKEN=your_snyk_token
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SENTRY_AUTH_TOKEN=your_sentry_token
EOF

# Add to .gitignore
echo ".secrets" >> .gitignore
```

### Use Secrets with Act

```bash
# Run with secrets file
act --secret-file .secrets

# Run specific workflow with secrets
act -W .github/workflows/ci.yml --secret-file .secrets

# Set individual secret
act --secret CODECOV_TOKEN=your_token

# Use environment variable as secret
export FLY_API_TOKEN=your_token
act --env FLY_API_TOKEN
```

## Workflow Validation

### Syntax Validation

```bash
# Validate workflow syntax with actionlint
actionlint .github/workflows/ci.yml
actionlint .github/workflows/cd.yml
actionlint .github/workflows/docker-build.yml

# Validate all workflows
actionlint .github/workflows/*.yml

# YAML syntax validation
yamllint .github/workflows/ci.yml
yamllint .github/workflows/cd.yml
```

### Common Validation Errors

```bash
# Fix YAML indentation
yamllint -f parsable .github/workflows/*.yml | grep "trailing spaces"

# Check for undefined secrets
grep -r "secrets\." .github/workflows/ | grep -v "GITHUB_TOKEN"

# Verify job dependencies
grep -A 5 "needs:" .github/workflows/*.yml
```

## Testing Strategies

### 1. Test Individual Jobs

Test each job in isolation before running full workflow:

```bash
# Test lint job
act -j lint

# Verify output
# Expected: ✅ Linting passed

# Test type-check job
act -j type-check

# Verify output
# Expected: ✅ Type check passed
```

### 2. Test Job Dependencies

Verify job execution order and dependencies:

```bash
# Jobs that should run in parallel
act -j lint -j type-check -j security-audit

# Jobs that require dependencies (will run prerequisites)
act -j build  # Should run lint, type-check, test, security-audit first
```

### 3. Test With Different Events

Test workflow behavior on different GitHub events:

```bash
# Push event (triggers CI and CD)
act push

# Pull request event (triggers CI only)
act pull_request

# Workflow dispatch (manual trigger)
act workflow_dispatch
```

### 4. Test Matrix Builds

Test different Node.js versions:

```bash
# Test with specific matrix value
act -j test --matrix node-version:18.x
act -j test --matrix node-version:20.x
```

## Database Testing

### Setup Test Database

```bash
# Start PostgreSQL container for testing
docker run -d \
  --name postgres-test \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=test_db \
  -p 5432:5432 \
  postgres:14-alpine

# Verify database is running
docker ps | grep postgres-test

# Test connection
psql postgresql://test_user:test_password@localhost:5432/test_db -c "SELECT 1"
```

### Run Tests with Database

```bash
# Set database URL for act
cat > .env.test <<EOF
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db
NODE_ENV=test
EOF

# Run tests with environment
act -j test --env-file .env.test

# Cleanup
docker stop postgres-test
docker rm postgres-test
```

## Performance Testing

### Measure Workflow Duration

```bash
# Time workflow execution
time act -W .github/workflows/ci.yml

# Expected duration:
# - Lint: ~30s
# - Type-check: ~45s
# - Test: ~2-3min
# - Build: ~1-2min
# Total: ~5-7min
```

### Optimize Slow Jobs

```bash
# Identify slow steps
act -j test --verbose 2>&1 | grep "took"

# Enable cache for faster runs
act --use-gitignore=false --cache-server-addr=localhost:8080
```

## Common Issues and Solutions

### Issue: "Unable to find image"

```bash
# Pull required images manually
docker pull catthehacker/ubuntu:act-latest

# Or specify image size
act -j test --container-architecture linux/amd64
```

### Issue: "Permission denied"

```bash
# Fix Docker socket permissions (Linux)
sudo chmod 666 /var/run/docker.sock

# Or run with sudo
sudo act -j test
```

### Issue: "Secret not found"

```bash
# Verify secrets file exists
cat .secrets

# Check secret is used correctly in workflow
grep "secrets.CODECOV_TOKEN" .github/workflows/ci.yml

# Pass secret explicitly
act --secret CODECOV_TOKEN=test_token
```

### Issue: "Service container not starting"

```bash
# Check service definition
grep -A 10 "services:" .github/workflows/ci.yml

# Manually start service
docker run -d --name postgres postgres:14-alpine

# Wait for service to be ready
docker exec postgres pg_isready
```

### Issue: "Workflow fails but works on GitHub"

```bash
# Common causes:
# 1. Different runner environments
# 2. Missing secrets in local setup
# 3. Network connectivity issues
# 4. Docker resource constraints

# Solutions:
# Use same runner image as GitHub
act --platform ubuntu-latest=catthehacker/ubuntu:act-latest

# Increase Docker resources (8GB RAM recommended)
# Docker Desktop → Preferences → Resources
```

## Pre-Push Validation Checklist

Run this checklist before pushing changes:

```bash
# 1. Validate workflow syntax
actionlint .github/workflows/*.yml
echo "✅ Workflow syntax valid"

# 2. Test linting locally
npm run lint
echo "✅ Linting passed"

# 3. Test type checking locally
npx tsc --noEmit
echo "✅ Type checking passed"

# 4. Run test suite locally
npm run test:all
echo "✅ Tests passed"

# 5. Test CI workflow with act
act -j build
echo "✅ CI workflow passed"

# 6. Verify secrets are configured
gh secret list
echo "✅ GitHub secrets configured"

# 7. Check commit messages
git log --oneline -n 5
echo "✅ Commit messages follow conventional commits"

# 8. Verify branch protection
gh api repos/:owner/:repo/branches/main/protection
echo "✅ Branch protection configured"
```

## Automated Pre-Push Script

Create a pre-push validation script:

```bash
#!/bin/bash
# scripts/pre-push-validation.sh

set -e

echo "🚀 Running pre-push validation..."

# Lint
echo "📋 Running linter..."
npm run lint

# Type check
echo "🔍 Running type checker..."
npx tsc --noEmit

# Tests
echo "🧪 Running tests..."
npm run test:all

# Workflow validation
echo "✅ Validating workflows..."
actionlint .github/workflows/*.yml

# Act test (quick jobs only)
echo "🎬 Testing CI workflow..."
act -j lint --dry-run

echo "✅ All pre-push validations passed!"
echo "🎉 Safe to push!"
```

```bash
# Make executable
chmod +x scripts/pre-push-validation.sh

# Run before pushing
./scripts/pre-push-validation.sh && git push
```

## Git Hooks Integration

### Setup Pre-Push Hook

```bash
# Create pre-push hook
cat > .git/hooks/pre-push <<'EOF'
#!/bin/bash

echo "Running pre-push validation..."

# Run validation script
./scripts/pre-push-validation.sh

if [ $? -ne 0 ]; then
    echo "❌ Pre-push validation failed!"
    echo "Fix errors before pushing"
    exit 1
fi

echo "✅ Pre-push validation passed"
EOF

# Make executable
chmod +x .git/hooks/pre-push
```

### Using Husky

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-push hook
npx husky add .husky/pre-push "./scripts/pre-push-validation.sh"
```

## Continuous Testing

### Watch Mode for Development

```bash
# Watch for workflow changes
watch -n 60 "actionlint .github/workflows/*.yml"

# Auto-test on file changes
nodemon --watch .github/workflows --exec "act -j lint"
```

### Automated Testing in CI

The workflows automatically test themselves:

1. **On Pull Requests**: Full CI runs before merge
2. **On Push to Main**: CI + CD to staging
3. **On Workflow Dispatch**: Manual testing of production deployment

## Debugging Failed Workflows

### Enable Debug Logging

```bash
# Local with act
act -j test --verbose

# On GitHub (set repository variable)
gh variable set ACTIONS_STEP_DEBUG --body "true"
gh variable set ACTIONS_RUNNER_DEBUG --body "true"
```

### Access Workflow Logs

```bash
# View recent workflow runs
gh run list

# View specific run logs
gh run view <run-id> --log

# Download run logs
gh run download <run-id>
```

### Re-run Failed Jobs

```bash
# Re-run failed jobs only
gh run rerun <run-id> --failed

# Re-run entire workflow
gh run rerun <run-id>
```

## Best Practices

### 1. Test Incrementally
- Test individual jobs before full workflow
- Validate syntax before running
- Use dry-run mode for destructive operations

### 2. Use Caching
- Cache npm dependencies
- Cache Docker layers
- Cache build artifacts

### 3. Fail Fast
- Run fastest jobs first
- Stop on first failure in development
- Continue on error in production monitoring

### 4. Secure Secrets
- Never commit .secrets file
- Use GitHub secrets for sensitive data
- Rotate secrets regularly

### 5. Monitor Performance
- Track workflow duration
- Optimize slow jobs
- Use matrix builds efficiently

## Additional Resources

- [Act Documentation](https://github.com/nektos/act)
- [Actionlint Documentation](https://github.com/rhysd/actionlint)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Debugging Guide](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)

## Next Steps

After validating CI/CD pipeline:
1. ✅ Complete [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
2. ✅ Configure [Branch Protection Rules](./BRANCH_PROTECTION_RULES.md)
3. ✅ Follow [First Deployment Guide](./FIRST_DEPLOYMENT.md)
