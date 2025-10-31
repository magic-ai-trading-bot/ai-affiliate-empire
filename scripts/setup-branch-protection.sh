#!/bin/bash

# Branch Protection Setup Script
# Configures GitHub branch protection rules for main branch

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "=================================="
    print_message "$BLUE" "$1"
    print_message "$BLUE" "=================================="
    echo ""
}

print_success() {
    print_message "$GREEN" "✅ $1"
}

print_error() {
    print_message "$RED" "❌ $1"
}

print_warning() {
    print_message "$YELLOW" "⚠️  $1"
}

print_info() {
    print_message "$BLUE" "ℹ️  $1"
}

# Check if GitHub CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        print_info "Install with: brew install gh (macOS) or visit https://cli.github.com"
        exit 1
    fi
    print_success "GitHub CLI is installed"
}

# Check if authenticated with GitHub
check_gh_auth() {
    if ! gh auth status &> /dev/null; then
        print_error "Not authenticated with GitHub"
        print_info "Run: gh auth login"
        exit 1
    fi
    print_success "Authenticated with GitHub"
}

# Get repository info
get_repo_info() {
    if ! git rev-parse --git-dir &> /dev/null; then
        print_error "Not in a git repository"
        exit 1
    fi

    REPO_URL=$(git config --get remote.origin.url)
    REPO_OWNER=$(echo "$REPO_URL" | sed -n 's/.*github.com[:/]\([^/]*\)\/.*/\1/p')
    REPO_NAME=$(echo "$REPO_URL" | sed -n 's/.*github.com[:/][^/]*\/\(.*\)\.git/\1/p')

    if [ -z "$REPO_NAME" ]; then
        REPO_NAME=$(echo "$REPO_URL" | sed -n 's/.*github.com[:/][^/]*\/\(.*\)/\1/p')
    fi

    if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
        print_error "Could not determine repository owner/name from: $REPO_URL"
        exit 1
    fi

    print_success "Repository: $REPO_OWNER/$REPO_NAME"
}

# Setup main branch protection
setup_main_protection() {
    print_header "Configuring Main Branch Protection"

    print_info "Applying protection rules to main branch..."

    # Create protection configuration
    PROTECTION_CONFIG=$(cat <<EOF
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
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
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
)

    if gh api -X PUT "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" \
        --input - <<< "$PROTECTION_CONFIG" > /dev/null 2>&1; then
        print_success "Main branch protection configured"
    else
        print_error "Failed to configure main branch protection"
        print_info "You may need admin permissions for this repository"
        return 1
    fi
}

# Setup tag protection
setup_tag_protection() {
    print_header "Configuring Tag Protection"

    print_info "Protecting version tags (v*)..."

    if gh api -X POST "/repos/$REPO_OWNER/$REPO_NAME/tags/protection" \
        -f pattern='v*' > /dev/null 2>&1; then
        print_success "Tag protection configured for v* pattern"
    else
        print_warning "Tag protection may already exist or failed to configure"
    fi
}

# Display current protection settings
display_protection() {
    print_header "Current Branch Protection Settings"

    echo ""
    print_info "Main branch protection:"
    gh api "/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection" | jq '{
        required_status_checks: .required_status_checks.contexts,
        required_reviews: .required_pull_request_reviews.required_approving_review_count,
        dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews,
        linear_history: .required_linear_history,
        force_push: .allow_force_pushes,
        enforce_admins: .enforce_admins
    }'

    echo ""
    print_info "Tag protection:"
    gh api "/repos/$REPO_OWNER/$REPO_NAME/tags/protection" | jq '.[].pattern' || echo "No tag protection configured"
}

# Main setup flow
main() {
    print_header "GitHub Branch Protection Setup"

    # Check prerequisites
    print_info "Checking prerequisites..."
    check_gh_cli
    check_gh_auth
    get_repo_info

    echo ""
    print_success "All prerequisites met!"

    # Setup protection
    echo ""
    if setup_main_protection; then
        setup_tag_protection

        echo ""
        print_success "Branch protection setup complete!"

        # Display current settings
        if command -v jq &> /dev/null; then
            display_protection
        else
            print_warning "Install jq to view formatted protection settings: brew install jq"
        fi

        echo ""
        print_info "Review settings in GitHub:"
        echo "  https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
        echo ""

        print_info "Test the protection by:"
        echo "  1. Creating a test branch"
        echo "  2. Opening a pull request"
        echo "  3. Verifying status checks are required"
        echo "  4. Verifying review is required"
        echo ""
    else
        print_error "Branch protection setup failed"
        print_info "Manual setup required via GitHub UI:"
        echo "  https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
        exit 1
    fi
}

# Run main function
main "$@"
