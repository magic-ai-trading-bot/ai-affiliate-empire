# Branch Protection Rules

This document outlines the branch protection configuration for the AI Affiliate Empire repository.

## Protected Branches

### Main Branch (`main`)

The `main` branch represents production-ready code and is protected with the following rules:

#### Required Status Checks
- All CI/CD checks must pass:
  - ESLint (code style)
  - TypeScript compiler (type safety)
  - Unit tests (functionality)
  - Integration tests (module interaction)
  - E2E tests (user workflows)
  - Build process (artifact generation)
  - Security audit (vulnerability scanning)

#### Code Review Requirements
- **Required reviewers**: 1-2 approvals minimum
- **Dismiss stale PR approvals**: Enabled
- **Require review from CODEOWNERS**: Enabled
- **Require status checks to pass before merging**: Enabled

#### Merge Strategy
- **Allow merge commits**: Enabled (for documentation)
- **Allow squash merging**: Enabled (preferred for feature squashing)
- **Allow rebase merging**: Enabled (for clean history)
- **Require branches to be up to date**: Enabled
- **Require conversation resolution**: Enabled

#### Additional Protections
- **Restrict who can push to matching branches**: Admins only
- **Require signed commits**: Recommended
- **Require deployments to succeed**: Yes (for production branch)
- **Require linear history**: No (allows merge commits for documentation)
- **Auto-delete head branches**: Enabled (cleanup merged branches)

### Develop Branch (`develop`) - If Used

Used for integration of feature branches:

#### Requirements
- 1 approval minimum
- All CI checks must pass
- Update branch before merging
- Conversation resolution required
- CODEOWNERS review required

## Pull Request Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/feature-name
# or
git checkout -b fix/bug-name
git checkout -b docs/documentation-change
```

### 2. Make Changes
- Follow code standards
- Add tests for new features
- Update documentation

### 3. Create Pull Request
- Use PR template
- Link related issues
- Add descriptive title and description

### 4. Code Review
- Address reviewer feedback
- Run status checks
- Keep branch up to date

### 5. Merge
- Use squash merge for features (clean history)
- Use merge commit for releases (preserve history)
- Delete branch after merge

## Automation Rules

### Auto-merge Configuration
- Not enabled (requires manual review)
- Prefer explicit approval and merge process

### Auto-update Branches
- Enabled via GitHub Actions
- Automatically updates branches with protected branches

### Stale PR Cleanup
- Consider closing PRs inactive for 30+ days
- Comment before closing for contributor awareness

## Bypass Procedures

### Emergency Fixes
For critical production issues:

1. **Get emergency approval** from 2+ maintainers
2. **Document the emergency** in PR description
3. **Create post-incident review** after merge
4. **Plan prevention** to avoid future bypasses

### Bypass Audit Log
All branch protection bypasses are logged and audited.

## Webhook Integrations

### GitHub Integrations
- **Discord notifications**: PR reviews, merges, failures
- **Codecov integration**: Coverage tracking
- **Status checks**: All CI/CD pipelines

## Enforcement Policy

### Pull Request Standards
- All PRs must follow conventional commit format
- Minimum commit message quality
- Proper code organization

### Review Standards
- Constructive feedback expected
- Timely responses to reviewers
- Collaborative problem-solving

### Violation Handling
1. First violation: Warning and guidance
2. Repeated violations: Temporary merge restrictions
3. Persistent violations: Access review

## Configuration Commands

### To Setup Branch Protection (Admin Only)

```bash
# Using GitHub CLI
gh api repos/OWNER/REPO/branches/main/protection \
  -X PUT \
  -F required_status_checks.strict=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F require_code_owner_reviews=true \
  -F enforce_admins=false \
  -F dismiss_stale_reviews=true \
  -F allow_deletion_headref=true
```

## Compliance and Monitoring

- All branch protection settings are regularly audited
- Changes to branch protection require admin approval
- Violation reports generated monthly
- Compliance dashboard available to maintainers

---

**Last Updated**: 2025-10-31
**Status**: Active
