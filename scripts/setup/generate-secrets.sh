#!/bin/bash

###############################################################################
# Production Secrets Generator
#
# Purpose: Generate cryptographically secure secrets for production deployment
#
# Usage: ./generate-secrets.sh [OPTIONS]
# Options:
#   -e, --env ENV       Environment (staging|production) [default: production]
#   -o, --output FILE   Output file [default: .env.{ENV}.secrets]
#   -f, --force         Overwrite existing secrets file
#   -h, --help          Show this help message
#
# Security: This script generates secrets locally. For production, consider
#           using AWS Secrets Manager or similar secret management system.
###############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
ENV="production"
OUTPUT_FILE=""
FORCE=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Show help
show_help() {
    grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENV="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Generate secure random string
generate_secret() {
    local length=$1
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Generate secrets
generate_secrets() {
    log_info "Generating production secrets for environment: $ENV"

    # Set default output file if not specified
    if [[ -z "$OUTPUT_FILE" ]]; then
        OUTPUT_FILE=".env.${ENV}.secrets"
    fi

    # Check if file exists
    if [[ -f "$OUTPUT_FILE" ]] && [[ "$FORCE" != true ]]; then
        log_error "Secrets file already exists: $OUTPUT_FILE"
        log_error "Use --force to overwrite"
        exit 1
    fi

    log_info "Generating secure secrets..."

    # Generate JWT secrets (64 characters for strong security)
    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)

    # Generate encryption key (32 characters for AES-256)
    ENCRYPTION_KEY=$(generate_secret 32)

    # Generate database password (32 characters)
    DB_PASSWORD=$(generate_secret 32)

    # Generate Redis password (32 characters)
    REDIS_PASSWORD=$(generate_secret 32)

    log_success "All secrets generated"

    # Create secrets file
    log_info "Writing secrets to: $OUTPUT_FILE"

    cat > "$OUTPUT_FILE" << EOF
###############################################################################
# AI AFFILIATE EMPIRE - PRODUCTION SECRETS
# Environment: $ENV
# Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
#
# IMPORTANT SECURITY NOTES:
# 1. NEVER commit this file to git
# 2. Store securely in AWS Secrets Manager or similar
# 3. Rotate these secrets every 90 days
# 4. Use different secrets for each environment
# 5. Restrict file permissions: chmod 600 $OUTPUT_FILE
###############################################################################

# Security - JWT Authentication
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security - Data Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Database - Production Password
# Update your DATABASE_URL with this password:
# postgresql://user:${DB_PASSWORD}@host:5432/dbname
DB_PASSWORD_GENERATED=$DB_PASSWORD

# Redis - Production Password
REDIS_PASSWORD=$REDIS_PASSWORD

###############################################################################
# NEXT STEPS:
# 1. Store these secrets in AWS Secrets Manager:
#    aws secretsmanager create-secret --name ai-affiliate-empire/$ENV/jwt-secret --secret-string "$JWT_SECRET"
#
# 2. Update your .env.$ENV file to reference these secrets
#
# 3. Set proper file permissions:
#    chmod 600 $OUTPUT_FILE
#
# 4. For production, enable AWS Secrets Manager in .env:
#    AWS_SECRETS_MANAGER_ENABLED=true
#    SECRET_NAME_PREFIX=ai-affiliate-empire/$ENV
###############################################################################
EOF

    # Set restrictive permissions
    chmod 600 "$OUTPUT_FILE"

    log_success "Secrets file created: $OUTPUT_FILE"
    log_success "File permissions set to 600 (owner read/write only)"

    # Display summary
    echo ""
    log_info "=========================================="
    log_info "SECRETS GENERATION SUMMARY"
    log_info "=========================================="
    log_info "Environment: $ENV"
    log_info "Output file: $OUTPUT_FILE"
    log_info ""
    log_info "Secrets generated:"
    log_info "  ✓ JWT Secret (64 chars)"
    log_info "  ✓ JWT Refresh Secret (64 chars)"
    log_info "  ✓ Encryption Key (32 chars)"
    log_info "  ✓ Database Password (32 chars)"
    log_info "  ✓ Redis Password (32 chars)"
    log_info ""
    log_warning "IMPORTANT: Store these secrets securely!"
    log_warning "Consider using AWS Secrets Manager for production"
    log_info "=========================================="
}

# Main execution
main() {
    parse_arguments "$@"

    # Check for openssl
    if ! command -v openssl &> /dev/null; then
        log_error "openssl is required but not installed"
        exit 1
    fi

    generate_secrets

    exit 0
}

main "$@"
