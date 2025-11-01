# Repository Setup and Collaboration Guide

## Repository Organization Status

### Current State (Optimized)

#### Version Control
- ✅ Clean git history with semantic versioning
- ✅ Conventional commits implemented
- ✅ Automated releases configured
- ✅ Git hooks enabled (pre-commit, pre-push, commit-msg)
- ✅ Comprehensive .gitignore with security patterns

#### Code Quality
- ✅ ESLint configured
- ✅ TypeScript strict mode enabled
- ✅ Jest testing framework with 85%+ coverage
- ✅ Prettier code formatting
- ✅ Security audit integrated in CI/CD

#### Collaboration
- ✅ CODEOWNERS file for accountability
- ✅ GitHub issue templates (bug, feature, security)
- ✅ PR template with standardized format
- ✅ GitHub Actions CI/CD pipeline
- ✅ Automated security scanning (TruffleHog)

#### Documentation
- ✅ CONTRIBUTING.md with development guidelines
- ✅ Branch protection documentation
- ✅ Git workflow guide
- ✅ API documentation via Swagger/OpenAPI
- ✅ Architecture documentation

## Setup Instructions for New Contributors

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/magic-ai-trading-bot/ai-affiliate-empire.git
cd ai-affiliate-empire

# Configure Git user (if not done globally)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add upstream for keeping fork updated
git remote add upstream https://github.com/original-repo/ai-affiliate-empire.git
```

### 2. Environment Setup

```bash
# Install dependencies
npm install

# Setup Husky git hooks
npm run prepare

# Create .env file from example
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run prisma:migrate:dev

# Verify setup
npm run lint
npm test
npm run build
```

### 3. Development Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run start:dev

# Run checks before commit
npm run lint:fix
npm test
npm run build

# Commit following conventional format
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Key Files and Directories

### Configuration Files
| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template |
| `.eslintrc.json` | ESLint configuration |
| `tsconfig.json` | TypeScript configuration |
| `jest.config.js` | Jest testing configuration |
| `.releaserc.json` | Semantic release configuration |
| `package.json` | Project dependencies and scripts |

### Git Configuration
| File | Purpose |
|------|---------|
| `.gitignore` | Files to exclude from version control |
| `.github/CODEOWNERS` | Code ownership and review requirements |
| `.husky/` | Git hooks for quality checks |
| `.github/workflows/` | GitHub Actions CI/CD pipelines |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `CONTRIBUTING.md` | Contribution guidelines |
| `.github/BRANCH_PROTECTION.md` | Branch protection rules |
| `.github/GIT_WORKFLOW.md` | Git workflow guide |
| `docs/` | Technical documentation |

### Issue and PR Templates
| File | Purpose |
|------|---------|
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |
| `.github/ISSUE_TEMPLATE/security.md` | Security vulnerability template |
| `.github/pull_request_template.md` | PR template |

## Security Measures

### Secrets Management
- Never commit `.env` files with real credentials
- Use `.env.example` as template
- AWS Secrets Manager for production
- GitHub Secrets for CI/CD variables

### Pre-commit Security Checks
```bash
# Automatically checks for:
- Potential secrets (passwords, API keys, tokens)
- Large files (>5MB) that should use Git LFS
- Code style violations
- Missing test coverage
```

### CI/CD Security
```bash
# Automated checks in GitHub Actions:
- npm audit (dependency vulnerabilities)
- TruffleHog (secret scanning)
- SAST (static application security testing)
- Code coverage validation
```

## Workflow Automation

### Automated Releases
- Semantic versioning based on commit types
- Automatic CHANGELOG generation
- GitHub release creation
- Optional: NPM package publishing

### Status Checks
```
All PRs must pass:
✓ ESLint (code quality)
✓ TypeScript (type safety)
✓ Unit Tests (functionality)
✓ Integration Tests (module interaction)
✓ E2E Tests (user workflows)
✓ Build (artifact generation)
✓ Security Audit (vulnerability scanning)
```

### Code Review Requirements
- Minimum 1-2 approvals required
- CODEOWNERS automatic review requests
- Stale approvals dismissed on new commits
- Status checks must pass before merge

## Best Practices

### For Maintainers

1. **Review Quality**
   - Provide constructive feedback
   - Explain why changes are needed
   - Suggest alternatives
   - Be respectful and collaborative

2. **Merge Strategy**
   - Use squash merge for features (clean history)
   - Use merge commit for releases (preserve history)
   - Delete branches after merge (auto-enabled)
   - Require linear history

3. **Release Management**
   - Follow semantic versioning
   - Use conventional commits
   - Generate changelogs automatically
   - Tag releases appropriately

### For Contributors

1. **Code Quality**
   - Run linter and tests before pushing
   - Follow code standards
   - Write meaningful commit messages
   - Add tests for new features

2. **Collaboration**
   - Keep PRs focused and small
   - Respond promptly to reviews
   - Ask questions if unclear
   - Help review other PRs

3. **Communication**
   - Link related issues
   - Provide context in PRs
   - Update on progress
   - Escalate blockers early

## Troubleshooting

### Git Hooks Issues

**Problem**: Pre-commit hook failing
```bash
# Bypass for emergency (only if necessary)
git commit --no-verify

# Re-install hooks
npm run prepare
```

**Problem**: Pre-push validation slow
```bash
# Check which hook is slow
# Temporarily disable for investigation
git push --no-verify

# Then investigate and re-enable
```

### Merge Conflicts

```bash
# If branch is behind main
git fetch upstream
git rebase upstream/main
# Resolve conflicts in editor
git add .
git rebase --continue
git push origin feature-name --force-with-lease
```

### Accidental Secret Commit

```bash
# If not pushed yet:
git reset HEAD~1
# Remove from staging
git restore file.ts
# Update .gitignore
git add .gitignore
git commit -m "chore: add file to gitignore"

# If already pushed:
# Notify maintainers immediately
# Create new secret in service
# Follow secret rotation procedure
```

## Resources

- **Git Documentation**: https://git-scm.com/doc
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Semantic Versioning**: https://semver.org/
- **GitHub Flow**: https://guides.github.com/introduction/flow/

## Support

- **Questions**: Open GitHub Discussion
- **Issues**: Create GitHub Issue
- **Security**: Email security@example.com
- **Documentation**: See `/docs` directory

---

**Last Updated**: 2025-10-31
**Status**: Active and Maintained
