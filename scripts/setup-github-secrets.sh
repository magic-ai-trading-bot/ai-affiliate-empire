#!/bin/bash

# GitHub Secrets Setup Script
# Interactive script to configure GitHub repository secrets for CI/CD

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Print colored message
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

# Check if in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir &> /dev/null; then
        print_error "Not in a git repository"
        exit 1
    fi
    print_success "Git repository detected"
}

# Validate secret value
validate_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -z "$secret_value" ]; then
        print_error "$secret_name cannot be empty"
        return 1
    fi

    # Specific validations
    case $secret_name in
        FLY_API_TOKEN)
            if [[ ! $secret_value =~ ^fo1_ ]]; then
                print_warning "$secret_name should start with 'fo1_'"
                read -p "Continue anyway? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    return 1
                fi
            fi
            ;;
        *_WEBHOOK_URL)
            if [[ ! $secret_value =~ ^https:// ]]; then
                print_warning "$secret_name should be a valid HTTPS URL"
                read -p "Continue anyway? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    return 1
                fi
            fi
            ;;
        CODECOV_TOKEN|SNYK_TOKEN|SENTRY_AUTH_TOKEN)
            if [ ${#secret_value} -lt 20 ]; then
                print_warning "$secret_name seems too short (minimum 20 characters recommended)"
                read -p "Continue anyway? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    return 1
                fi
            fi
            ;;
    esac

    return 0
}

# Set a GitHub secret
set_github_secret() {
    local secret_name=$1
    local secret_value=$2
    local is_required=$3

    if ! validate_secret "$secret_name" "$secret_value"; then
        return 1
    fi

    print_info "Setting $secret_name..."

    if echo "$secret_value" | gh secret set "$secret_name" 2>/dev/null; then
        print_success "$secret_name has been set"
        return 0
    else
        print_error "Failed to set $secret_name"
        if [ "$is_required" = "true" ]; then
            exit 1
        fi
        return 1
    fi
}

# Interactive secret setup
setup_secret_interactive() {
    local secret_name=$1
    local description=$2
    local is_required=$3
    local help_text=$4

    echo ""
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_message "$YELLOW" "Setting up: $secret_name"
    print_message "$NC" "$description"
    if [ -n "$help_text" ]; then
        print_info "$help_text"
    fi
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ "$is_required" = "true" ]; then
        print_message "$RED" "[REQUIRED]"
    else
        print_message "$YELLOW" "[OPTIONAL]"
        read -p "Do you want to set this secret? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping $secret_name"
            return 0
        fi
    fi

    # Special handling for different secret types
    case $secret_name in
        FLY_API_TOKEN)
            print_info "To get your Fly.io token:"
            echo "  1. Run: flyctl auth login"
            echo "  2. Run: flyctl auth token"
            ;;
        CODECOV_TOKEN)
            print_info "To get your Codecov token:"
            echo "  1. Visit: https://codecov.io"
            echo "  2. Sign in with GitHub"
            echo "  3. Select your repository"
            echo "  4. Copy token from Settings → General"
            ;;
        SNYK_TOKEN)
            print_info "To get your Snyk token:"
            echo "  1. Visit: https://snyk.io"
            echo "  2. Go to Account Settings → API Token"
            echo "  3. Generate or copy existing token"
            ;;
        *_WEBHOOK_URL)
            print_info "Enter the webhook URL (starts with https://)"
            ;;
    esac

    echo ""
    read -sp "Enter value for $secret_name (input hidden): " secret_value
    echo ""

    if [ -z "$secret_value" ]; then
        if [ "$is_required" = "true" ]; then
            print_error "$secret_name is required but no value provided"
            exit 1
        else
            print_info "Skipping $secret_name (no value provided)"
            return 0
        fi
    fi

    set_github_secret "$secret_name" "$secret_value" "$is_required"
}

# Test Fly.io token
test_fly_token() {
    local token=$1
    print_info "Testing Fly.io token..."

    response=$(curl -s -H "Authorization: Bearer $token" https://api.fly.io/graphql \
        -d '{"query":"{ personalOrganizations { nodes { name } } }"}')

    if echo "$response" | grep -q "personalOrganizations"; then
        print_success "Fly.io token is valid"
        return 0
    else
        print_error "Fly.io token validation failed"
        print_info "Response: $response"
        return 1
    fi
}

# List all configured secrets
list_secrets() {
    print_header "Configured GitHub Secrets"
    gh secret list
}

# Main setup flow
main() {
    print_header "GitHub Secrets Setup for AI Affiliate Empire"

    # Check prerequisites
    print_info "Checking prerequisites..."
    check_gh_cli
    check_gh_auth
    check_git_repo

    echo ""
    print_success "All prerequisites met!"

    # Handle command line arguments
    if [ "$1" = "--list" ]; then
        list_secrets
        exit 0
    fi

    if [ "$1" = "--secret" ] && [ -n "$2" ]; then
        # Set specific secret
        SECRET_NAME=$2
        setup_secret_interactive "$SECRET_NAME" "" "false" ""
        exit 0
    fi

    # Interactive mode - setup all secrets
    print_info "Starting interactive setup..."
    echo ""
    print_message "$YELLOW" "You will be prompted to enter values for each secret."
    print_message "$YELLOW" "Required secrets must be configured."
    print_message "$YELLOW" "Optional secrets can be skipped."
    echo ""

    read -p "Press Enter to continue..."

    # Required Secrets
    print_header "Required Secrets"

    setup_secret_interactive \
        "FLY_API_TOKEN" \
        "Fly.io API token for deployment" \
        "true" \
        "Required for deploying to Fly.io hosting platform"

    # Optional Secrets
    print_header "Optional Secrets"

    setup_secret_interactive \
        "CODECOV_TOKEN" \
        "Codecov token for coverage reports" \
        "false" \
        "Used to upload test coverage reports to Codecov"

    setup_secret_interactive \
        "SNYK_TOKEN" \
        "Snyk token for security scanning" \
        "false" \
        "Used for container security vulnerability scanning"

    setup_secret_interactive \
        "SLACK_WEBHOOK_URL" \
        "Slack webhook URL for deployment notifications" \
        "false" \
        "Sends deployment status to Slack channel"

    setup_secret_interactive \
        "DISCORD_WEBHOOK_URL" \
        "Discord webhook URL for deployment notifications" \
        "false" \
        "Sends deployment status to Discord channel"

    setup_secret_interactive \
        "SENTRY_AUTH_TOKEN" \
        "Sentry auth token for release tracking" \
        "false" \
        "Creates Sentry releases and tracks deployments"

    # Summary
    print_header "Setup Complete"
    echo ""
    list_secrets
    echo ""

    print_success "GitHub secrets configuration complete!"
    print_info "Next steps:"
    echo "  1. Review docs/deployment/CI_CD_TESTING.md for testing guide"
    echo "  2. Complete docs/deployment/DEPLOYMENT_CHECKLIST.md"
    echo "  3. Follow docs/deployment/FIRST_DEPLOYMENT.md for first deployment"
    echo ""

    # Verify Fly.io token if set
    FLY_TOKEN=$(gh secret list | grep FLY_API_TOKEN || echo "")
    if [ -n "$FLY_TOKEN" ]; then
        print_info "To verify your Fly.io setup:"
        echo "  flyctl auth whoami"
        echo "  flyctl apps list"
    fi
}

# Run main function
main "$@"
