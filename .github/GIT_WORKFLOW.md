# Git Workflow Guide

This document outlines the recommended Git workflow for contributing to AI Affiliate Empire.

## Overview

```
Main Branch (Production)
        ↑
    Merges
        ↑
Feature/Fix Branches
        ↑
Local Development
```

## Branch Naming Conventions

### Feature Branches
```
feature/short-description
Example: feature/add-youtube-automation
```

### Bug Fix Branches
```
fix/short-description
Example: fix/youtube-upload-timeout
```

### Documentation Branches
```
docs/short-description
Example: docs/update-api-guide
```

### Refactoring Branches
```
refactor/short-description
Example: refactor/optimize-ranking-algorithm
```

### Performance Branches
```
perf/short-description
Example: perf/reduce-database-queries
```

## Workflow Steps

### 1. Setting Up

```bash
# Clone repository
git clone https://github.com/yourusername/ai-affiliate-empire.git
cd ai-affiliate-empire

# Configure user (if not already done)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add upstream remote
git remote add upstream https://github.com/original-owner/ai-affiliate-empire.git

# Verify remotes
git remote -v
# origin    https://github.com/yourusername/ai-affiliate-empire.git (fetch)
# origin    https://github.com/yourusername/ai-affiliate-empire.git (push)
# upstream  https://github.com/original-owner/ai-affiliate-empire.git (fetch)
# upstream  https://github.com/original-owner/ai-affiliate-empire.git (push)
```

### 2. Creating a Feature Branch

```bash
# Update main branch first
git checkout main
git pull upstream main

# Create and checkout new branch
git checkout -b feature/your-feature-name

# Verify you're on the right branch
git branch -v
# * feature/your-feature-name abc123 Initial commit
#   main                          def456 Latest upstream commit
```

### 3. Making Changes

```bash
# Make your code changes
# Edit files as needed

# Check status
git status
# On branch feature/your-feature-name
# Changes not staged for commit:
#   modified:   src/file1.ts
#   modified:   src/file2.ts
# Untracked files:
#   src/file3.ts

# Stage specific files (preferred - more control)
git add src/file1.ts
git add src/file2.ts

# Or stage all changes
git add .

# Verify staged changes
git diff --cached
```

### 4. Committing Changes

Follow conventional commit format:

```bash
# Single line commit for small changes
git commit -m "feat: add new affiliate network integration"

# Detailed commit for complex changes
git commit -m "feat: add new affiliate network integration

- Add support for CJ Affiliate API
- Implement product sync workflow
- Add comprehensive error handling
- Include integration tests

Fixes #123"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic changes)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### 5. Pushing Changes

```bash
# Push to your fork (origin)
git push origin feature/your-feature-name

# Setup upstream tracking (optional, for future pushes)
git push -u origin feature/your-feature-name

# Verify push
git branch -vv
# * feature/your-feature-name abc123 [origin/feature/your-feature-name] Commit message
```

### 6. Creating a Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request" button
3. Verify:
   - Base: `main` (or `develop` if applicable)
   - Compare: `yourusername:feature/your-feature-name`
4. Fill in PR template with:
   - Clear description
   - Related issues (#123)
   - Type of change
   - Testing completed
5. Click "Create pull request"

### 7. Responding to Feedback

```bash
# Make requested changes
# Edit files as needed

# Stage and commit changes
git add .
git commit -m "refactor: address code review feedback"

# Push updated commit
git push origin feature/your-feature-name
# No need to create new PR - it auto-updates

# Resolve conversations in GitHub
# Mark conversations as resolved after addressing feedback
```

### 8. Keeping Branch Updated

If main branch has updates:

```bash
# Fetch latest from upstream
git fetch upstream

# Rebase your branch on top of latest main
git rebase upstream/main

# If conflicts occur, resolve them
# Then continue rebase
git rebase --continue

# Force push to update your PR
git push origin feature/your-feature-name --force-with-lease
```

**Alternative using merge** (simpler, less clean history):
```bash
git merge upstream/main
git push origin feature/your-feature-name
```

### 9. Merge and Cleanup

Once PR is approved and merged:

```bash
# Delete local branch
git branch -d feature/your-feature-name

# Delete remote branch
git push origin --delete feature/your-feature-name

# Or use GitHub web interface (auto-delete is enabled)

# Update local main
git fetch upstream
git checkout main
git pull upstream main
```

## Common Scenarios

### Undo Last Commit (not pushed)
```bash
git reset --soft HEAD~1
# Changes are now staged, can re-commit
```

### Undo Pushed Commit
```bash
# Create a revert commit (safer)
git revert HEAD
git push origin feature/your-feature-name

# OR force reset (only if branch not merged)
git reset --hard HEAD~1
git push origin feature/your-feature-name --force-with-lease
```

### Cherry-pick Commit
```bash
# Pick a specific commit from another branch
git cherry-pick commit-hash
git push origin feature/your-feature-name
```

### View History
```bash
# Compact log view
git log --oneline -10

# Detailed view
git log --format=fuller -5

# Visual branch graph
git log --all --graph --decorate --oneline
```

### Squash Commits
```bash
# Squash last 3 commits
git rebase -i HEAD~3
# Mark 2nd and 3rd commits as 'squash' in editor

git push origin feature/your-feature-name --force-with-lease
```

## Best Practices

### Commit Hygiene
- Commit frequently (logical units)
- Write clear commit messages
- Never commit secrets or large files
- Review changes before committing (`git diff`)

### Branch Management
- Keep branches focused (one feature per branch)
- Delete branches after merging
- Keep branches updated with main
- Don't work directly on main/develop

### Pull Request Etiquette
- Create PR early (for feedback)
- Keep PRs focused and manageable
- Respond promptly to reviews
- Thank reviewers for feedback

### Code Quality
- Run tests before pushing
- Follow linting standards
- Add tests for new features
- Update documentation

## Security

### Never Commit
- Passwords or API keys
- Private keys or certificates
- Database credentials
- Personal information
- Large binary files

### Use .gitignore
```bash
# Add sensitive files to .gitignore
echo ".env" >> .gitignore
echo "secrets.json" >> .gitignore

# Verify file is ignored
git check-ignore -v .env
```

### If You Accidentally Committed Secrets
1. Stop and don't push
2. Remove from staging: `git reset HEAD~1`
3. Update .gitignore
4. Commit again: `git commit`
5. Report security issue (if pushed)

## Tools and Commands Reference

```bash
# Status and history
git status                    # Current state
git log --oneline             # Commit history
git diff                      # Unstaged changes
git diff --cached             # Staged changes
git show HEAD                 # Latest commit details

# Staging
git add .                     # Stage all changes
git add file.ts               # Stage specific file
git restore file.ts           # Discard changes
git restore --staged file.ts  # Unstage file

# Branches
git branch                    # List local branches
git branch -r                 # List remote branches
git branch -a                 # List all branches
git checkout -b feat/name     # Create and switch branch
git switch main               # Switch to existing branch
git branch -d branch-name     # Delete branch

# Remote
git fetch upstream            # Fetch from upstream
git pull upstream main        # Fetch and merge
git push origin branch-name   # Push to origin

# Stashing
git stash                     # Save work in progress
git stash pop                 # Restore stashed changes
git stash list                # View all stashes
```

## Getting Help

```bash
# Git help
git help <command>
# Example: git help commit

# Show commit log help
git log --help

# Interactive help
git <command> -h
```

---

**Last Updated**: 2025-10-31
**Version**: 1.0
