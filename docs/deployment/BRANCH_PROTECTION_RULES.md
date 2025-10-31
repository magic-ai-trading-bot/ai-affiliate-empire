# Branch Protection Rules

Comprehensive guide for configuring GitHub branch protection rules to ensure code quality and deployment safety.

## Overview

Branch protection rules prevent accidental or unauthorized changes to critical branches. This guide covers recommended settings for the AI Affiliate Empire repository.

## Quick Setup

### Using GitHub CLI

```bash
# Install GitHub CLI (if not already installed)
brew install gh

# Authenticate
gh auth login

# Apply branch protection rules (see script below)
./scripts/setup-branch-protection.sh
```

### Using GitHub Web UI

1. Navigate to repository Settings
2. Click "Branches" in left sidebar
3. Click "Add branch protection rule"
4. Configure settings as described below

## Main Branch Protection

### Required Settings

```bash
# Via GitHub API
gh api -X PUT /repos/:owner/:repo/branches/main/protection \
  -f required_status_checks='{"strict":true,"contexts":["lint","type-check","test","security-audit","build"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  -f restrictions=null \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

### Detailed Configuration

#### 1. Require Pull Request Reviews

**Settings**:
- ✅ Require a pull request before merging
- ✅ Require approvals: **1** (minimum)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (optional, if CODEOWNERS file exists)
- ⚠️ Restrict who can dismiss pull request reviews (optional)
- ❌ Allow specified actors to bypass required pull requests (not recommended)

**Rationale**: Ensures code is reviewed before merging to main branch.

**Configuration**:
```json
{
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  }
}
```

#### 2. Require Status Checks

**Settings**:
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required Status Checks**:
- `lint` - ESLint must pass
- `type-check` - TypeScript compilation must pass
- `test` (Node 18.x and 20.x) - All tests must pass
- `security-audit` - Security scan must pass
- `build` - Production build must succeed
- `all-checks-passed` - Meta check ensuring all above passed

**Configuration**:
```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint",
      "type-check",
      "test (18.x)",
      "test (20.x)",
      "security-audit",
      "build",
      "all-checks-passed"
    ]
  }
}
```

**Rationale**: Prevents merging broken code to main branch.

#### 3. Require Linear History

**Settings**:
- ✅ Require linear history

**Configuration**:
```json
{
  "required_linear_history": true
}
```

**Rationale**:
- Prevents merge commits
- Enforces squash and merge or rebase
- Keeps git history clean and easy to follow

#### 4. Require Signed Commits (Optional)

**Settings**:
- ⚠️ Require signed commits

**Configuration**:
```json
{
  "required_signatures": true
}
```

**Rationale**: Ensures commit authenticity (recommended for security-sensitive projects).

**Setup GPG Signing**:
```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-secret-keys --keyid-format=long

# Export public key
gpg --armor --export YOUR_KEY_ID

# Add to GitHub: Settings → SSH and GPG keys → New GPG key

# Configure git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

#### 5. Enforce for Administrators

**Settings**:
- ❌ Do not include administrators (allows emergency fixes)

**Configuration**:
```json
{
  "enforce_admins": false
}
```

**Rationale**:
- Allows administrators to bypass rules in emergencies
- Still requires administrator to explicitly override
- Logged for audit purposes

**When to Override**:
- Critical production hotfixes
- Emergency security patches
- Infrastructure emergencies

#### 6. Restrict Push Access

**Settings**:
- ⚠️ Restrict who can push to matching branches (optional)

**Configuration**:
```json
{
  "restrictions": {
    "users": ["deployment-bot"],
    "teams": ["core-team"],
    "apps": ["github-actions"]
  }
}
```

**Rationale**: Limits direct pushes to specific users/teams/apps.

#### 7. Force Push Settings

**Settings**:
- ❌ Allow force pushes (disabled)
- ❌ Allow deletions (disabled)

**Configuration**:
```json
{
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

**Rationale**: Prevents accidental history rewriting or branch deletion.

#### 8. Require Conversation Resolution

**Settings**:
- ✅ Require conversation resolution before merging

**Rationale**: Ensures all PR comments are addressed before merging.

## Develop Branch Protection (Optional)

For teams using GitFlow or similar branching strategies:

### Settings for Develop Branch

```bash
gh api -X PUT /repos/:owner/:repo/branches/develop/protection \
  -f required_status_checks='{"strict":true,"contexts":["lint","type-check","test"]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":1}' \
  -f required_linear_history=false \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

**Differences from Main**:
- Linear history not required (allows merge commits)
- Fewer required status checks (build not required)
- Same review requirements

## Feature Branch Naming Conventions

Enforce branch naming conventions using additional tools:

### Recommended Naming Pattern

```
feature/*    - New features
bugfix/*     - Bug fixes
hotfix/*     - Emergency production fixes
release/*    - Release preparation
docs/*       - Documentation updates
refactor/*   - Code refactoring
test/*       - Test additions
chore/*      - Maintenance tasks
```

### Enforce with GitHub Actions

Create `.github/workflows/branch-naming.yml`:

```yaml
name: Branch Naming Convention

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check-branch-name:
    runs-on: ubuntu-latest
    steps:
      - name: Check branch name
        run: |
          BRANCH_NAME="${{ github.head_ref }}"
          PATTERN="^(feature|bugfix|hotfix|release|docs|refactor|test|chore)\/[a-z0-9-]+$"

          if [[ ! $BRANCH_NAME =~ $PATTERN ]]; then
            echo "❌ Invalid branch name: $BRANCH_NAME"
            echo "Branch name must match pattern: feature|bugfix|hotfix|release|docs|refactor|test|chore/lowercase-with-hyphens"
            exit 1
          fi

          echo "✅ Branch name is valid: $BRANCH_NAME"
```

## Rulesets (GitHub's New Feature)

GitHub Rulesets provide more granular control. Consider upgrading from branch protection rules.

### Create Ruleset

```bash
# Via GitHub Web UI: Settings → Rules → Rulesets → New ruleset

# Target branches: main, develop
# Enforcement: Active

# Rules:
# - Require pull request before merging
# - Require status checks to pass
# - Block force pushes
# - Require signed commits (optional)
# - Require deployment to succeed before merge (optional)
```

### Bypass List

Allow specific actors to bypass rules:

- Deployment bots
- Repository administrators (for emergencies)
- GitHub Apps (with proper authentication)

## Tag Protection Rules

Protect release tags from deletion or overwriting:

```bash
# Via GitHub API
gh api -X POST /repos/:owner/:repo/tags/protection \
  -f pattern='v*'

# Via Web UI: Settings → Tags → Add rule
# Pattern: v*
```

**Protected Tag Patterns**:
- `v*` - All version tags (v1.0.0, v2.1.3, etc.)
- `release/*` - Release tags
- `production/*` - Production deployment tags

## CODEOWNERS File

Define code ownership for automatic review assignment:

Create `.github/CODEOWNERS`:

```bash
# Global owners
* @tech-lead @senior-dev

# Backend
src/modules/**/*.ts @backend-team
src/services/**/*.ts @backend-team

# Database
prisma/** @database-admin
src/database/** @database-admin

# Infrastructure
deploy/** @devops-team
.github/workflows/** @devops-team
Dockerfile @devops-team
docker-compose.yml @devops-team

# Frontend (if applicable)
src/frontend/** @frontend-team
public/** @frontend-team

# Documentation
docs/** @tech-writer @tech-lead
*.md @tech-writer

# Security-sensitive
src/security/** @security-team
src/auth/** @security-team

# CI/CD
.github/workflows/cd.yml @devops-team @tech-lead
scripts/deploy-*.sh @devops-team @tech-lead
```

**How it works**:
- PRs modifying files automatically request review from owners
- Ensures domain experts review relevant changes
- Can be combined with "Require review from Code Owners" setting

## Status Check Configuration

Ensure GitHub Actions workflows have correct job names:

### CI Workflow Status Checks

In `.github/workflows/ci.yml`, job names must match protection rules:

```yaml
jobs:
  lint:
    name: Lint  # Must match status check requirement
    # ...

  type-check:
    name: Type Check  # Must match status check requirement
    # ...

  test:
    name: Test (Node ${{ matrix.node-version }})  # Must match status check requirement
    # ...

  security-audit:
    name: Security Audit  # Must match status check requirement
    # ...

  build:
    name: Build  # Must match status check requirement
    # ...

  all-checks-passed:
    name: All Checks Passed  # Meta check
    needs: [lint, type-check, test, security-audit, build]
    # ...
```

## Automated Setup Script

Create `scripts/setup-branch-protection.sh`:

```bash
#!/bin/bash

set -e

REPO_OWNER="yourusername"
REPO_NAME="ai-affiliate-empire"

echo "Setting up branch protection for $REPO_OWNER/$REPO_NAME..."

# Main branch protection
gh api -X PUT "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint",
      "type-check",
      "test (18.x)",
      "test (20.x)",
      "security-audit",
      "build",
      "all-checks-passed"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF

echo "✅ Branch protection configured for main branch"

# Tag protection
gh api -X POST "/repos/$REPO_OWNER/$REPO_NAME/tags/protection" \
  -f pattern='v*' || echo "Tag protection may already exist"

echo "✅ Tag protection configured for v* pattern"

echo ""
echo "Branch protection setup complete!"
echo "Review settings at: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
```

Make executable:
```bash
chmod +x scripts/setup-branch-protection.sh
./scripts/setup-branch-protection.sh
```

## Verification Checklist

After configuring branch protection:

- [ ] **Verify Main Branch Protection**
  ```bash
  gh api /repos/:owner/:repo/branches/main/protection | jq
  ```

- [ ] **Test PR Requirements**
  - Create test branch
  - Make small change
  - Open PR
  - Verify status checks are required
  - Verify review is required

- [ ] **Test Force Push Prevention**
  ```bash
  git push --force origin main
  # Expected: Error - force push not allowed
  ```

- [ ] **Test Direct Push Prevention**
  ```bash
  git checkout main
  git commit --allow-empty -m "test"
  git push origin main
  # Expected: Error - must use pull request
  ```

- [ ] **Review Settings in Web UI**
  - Visit: `https://github.com/:owner/:repo/settings/branches`
  - Verify all settings match configuration

## Best Practices

### 1. Progressive Enforcement

Start with minimal rules and increase as team adapts:

**Phase 1** (Week 1-2):
- Require status checks
- Require 1 review

**Phase 2** (Week 3-4):
- Require linear history
- Dismiss stale reviews

**Phase 3** (Month 2+):
- Require code owner reviews
- Add more status checks
- Consider signed commits

### 2. Emergency Procedures

Document how to bypass protection in emergencies:

```bash
# Only for administrators
# 1. Temporarily disable enforcement
gh api -X PUT /repos/:owner/:repo/branches/main/protection \
  -f enforce_admins=true

# 2. Make emergency change
git push origin main

# 3. Re-enable enforcement
gh api -X PUT /repos/:owner/:repo/branches/main/protection \
  -f enforce_admins=false
```

### 3. Regular Audits

Review branch protection quarterly:

```bash
# Generate audit report
gh api /repos/:owner/:repo/branches/main/protection > protection-audit-$(date +%Y%m%d).json

# Review settings
jq '.required_status_checks.contexts' protection-audit-*.json
```

### 4. Team Communication

Document rules in repository:

Create `.github/CONTRIBUTING.md`:
```markdown
# Contributing Guidelines

## Branch Protection Rules

Our main branch is protected with the following rules:

1. All pull requests require 1 approval
2. All status checks must pass (lint, test, build)
3. Linear history required (use squash and merge)
4. Conversations must be resolved before merge

## Workflow

1. Create feature branch: `feature/your-feature-name`
2. Make changes and commit
3. Push to GitHub and open pull request
4. Wait for CI checks to pass
5. Request review from team member
6. Address review comments
7. Squash and merge after approval
```

## Common Issues & Solutions

### Issue: "Required status check 'X' is not present"

**Cause**: Job name in workflow doesn't match required status check

**Solution**:
```yaml
# In .github/workflows/ci.yml, ensure job names match exactly
jobs:
  lint:
    name: lint  # Must match required status check (case-sensitive)
```

### Issue: "Administrator bypass not working"

**Cause**: `enforce_admins` is set to `true`

**Solution**:
```bash
# Disable enforcement for admins
gh api -X PUT /repos/:owner/:repo/branches/main/protection \
  -f enforce_admins=false
```

### Issue: "Cannot merge: reviews required"

**Cause**: No approving review on PR

**Solution**:
- Request review from team member
- Or configure automatic review assignment
- Or (emergency only) temporarily disable rule

### Issue: "Branches must be up to date before merge"

**Cause**: Base branch has new commits since PR was opened

**Solution**:
```bash
# Update feature branch with latest main
git checkout feature-branch
git merge origin/main
git push
```

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-required-status-checks)

## Next Steps

After configuring branch protection:
1. ✅ Review [First Deployment Guide](./FIRST_DEPLOYMENT.md)
2. ✅ Test protection rules with a sample PR
3. ✅ Document any custom rules in CONTRIBUTING.md
4. ✅ Train team on new workflow
