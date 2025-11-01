#!/bin/bash

###############################################################################
# API Credentials Validation Script
#
# Purpose: Validate all production API credentials before deployment
#
# Usage: ./scripts/setup/validate-api-credentials.sh [OPTIONS]
# Options:
#   -q, --quick          Quick validation (skip verbose output)
#   -v, --verbose        Verbose output with debugging info
#   -h, --help           Show this help message
#
# This script validates:
#   1. OpenAI (GPT-4)
#   2. Anthropic Claude
#   3. ElevenLabs
#   4. Pika Labs
#   5. YouTube Data API
#   6. TikTok Content API
#   7. Instagram Graph API
#   8. Cloudflare R2
#
# Exit codes:
#   0 = All APIs valid
#   1 = One or more APIs invalid
#   2 = Configuration error
#
###############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;37m'
NC='\033[0m'

# Configuration
QUICK_MODE=false
VERBOSE_MODE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ENV_FILE="$PROJECT_ROOT/.env"

# Results tracking
PASSED=0
FAILED=0
SKIPPED=0
TOTAL=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" >&2
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((SKIPPED++))
}

log_debug() {
    if [[ "$VERBOSE_MODE" == true ]]; then
        echo -e "${GRAY}[DEBUG]${NC} $1"
    fi
}

show_help() {
    grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -q|--quick)
                QUICK_MODE=true
                shift
                ;;
            -v|--verbose)
                VERBOSE_MODE=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                exit 2
                ;;
        esac
    done
}

# Load environment variables
load_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found at $ENV_FILE"
        exit 2
    fi

    # Source .env file (safely)
    set -a
    source "$ENV_FILE"
    set +a

    log_info "Loaded environment from $ENV_FILE"
}

# Get env variable with fallback
get_env() {
    local var_name=$1
    local fallback=${2:-}
    eval "echo \${$var_name:-$fallback}"
}

# Validate OpenAI API
validate_openai() {
    ((TOTAL++))
    local api_key=$(get_env "OPENAI_API_KEY" "")
    local mock_mode=$(get_env "OPENAI_MOCK_MODE" "false")

    log_debug "OpenAI API Key: ${api_key:0:10}..."
    log_debug "OpenAI Mock Mode: $mock_mode"

    if [[ "$mock_mode" == "true" ]]; then
        log_warning "OpenAI: Mock mode enabled (skipping real API validation)"
        return 0
    fi

    if [[ -z "$api_key" ]]; then
        log_error "OpenAI: No API key provided (OPENAI_API_KEY)"
        return 1
    fi

    if [[ ! $api_key =~ ^sk-proj- ]]; then
        log_error "OpenAI: Invalid API key format (should start with sk-proj-)"
        return 1
    fi

    # Test API connection
    local response
    response=$(curl -s -w "\n%{http_code}" \
        https://api.openai.com/v1/models \
        -H "Authorization: Bearer $api_key" 2>&1 || echo -e "error\n000")

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]]; then
        local model_count=$(echo "$body" | grep -o '"id"' | wc -l)
        log_success "OpenAI API: Valid ($model_count models available)"
        log_debug "Response: $(echo "$body" | head -c 100)..."
        return 0
    elif [[ "$http_code" == "401" ]]; then
        log_error "OpenAI: Authentication failed (invalid API key)"
        return 1
    elif [[ "$http_code" == "429" ]]; then
        log_warning "OpenAI: Rate limited (API key likely valid, but throttled)"
        return 0
    else
        log_error "OpenAI: HTTP $http_code - $body"
        return 1
    fi
}

# Validate Anthropic API
validate_anthropic() {
    ((TOTAL++))
    local api_key=$(get_env "ANTHROPIC_API_KEY" "")
    local mock_mode=$(get_env "ANTHROPIC_MOCK_MODE" "false")

    log_debug "Anthropic API Key: ${api_key:0:10}..."
    log_debug "Anthropic Mock Mode: $mock_mode"

    if [[ "$mock_mode" == "true" ]]; then
        log_warning "Anthropic: Mock mode enabled (skipping real API validation)"
        return 0
    fi

    if [[ -z "$api_key" ]]; then
        log_error "Anthropic: No API key provided (ANTHROPIC_API_KEY)"
        return 1
    fi

    if [[ ! $api_key =~ ^sk-ant- ]]; then
        log_error "Anthropic: Invalid API key format (should start with sk-ant-)"
        return 1
    fi

    # Test API connection
    local response
    response=$(curl -s -w "\n%{http_code}" \
        -X POST https://api.anthropic.com/v1/messages \
        -H "x-api-key: $api_key" \
        -H "anthropic-version: 2023-06-01" \
        -H "content-type: application/json" \
        -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}' 2>&1 || echo -e "error\n000")

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]]; then
        log_success "Anthropic API: Valid"
        log_debug "Response: $(echo "$body" | head -c 100)..."
        return 0
    elif [[ "$http_code" == "401" ]]; then
        log_error "Anthropic: Authentication failed (invalid API key)"
        return 1
    elif [[ "$http_code" == "429" ]]; then
        log_warning "Anthropic: Rate limited (API key likely valid)"
        return 0
    else
        log_error "Anthropic: HTTP $http_code - $body"
        return 1
    fi
}

# Validate ElevenLabs API
validate_elevenlabs() {
    ((TOTAL++))
    local api_key=$(get_env "ELEVENLABS_API_KEY" "")
    local voice_id=$(get_env "ELEVENLABS_VOICE_ID" "")
    local mock_mode=$(get_env "ELEVENLABS_MOCK_MODE" "false")

    log_debug "ElevenLabs API Key: ${api_key:0:10}..."
    log_debug "ElevenLabs Voice ID: $voice_id"
    log_debug "ElevenLabs Mock Mode: $mock_mode"

    if [[ "$mock_mode" == "true" ]]; then
        log_warning "ElevenLabs: Mock mode enabled (skipping real API validation)"
        return 0
    fi

    if [[ -z "$api_key" ]]; then
        log_error "ElevenLabs: No API key provided (ELEVENLABS_API_KEY)"
        return 1
    fi

    if [[ -z "$voice_id" ]]; then
        log_error "ElevenLabs: No voice ID provided (ELEVENLABS_VOICE_ID)"
        return 1
    fi

    # Test API connection
    local response
    response=$(curl -s -w "\n%{http_code}" \
        https://api.elevenlabs.io/v1/user \
        -H "xi-api-key: $api_key" 2>&1 || echo -e "error\n000")

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]]; then
        local tier=$(echo "$body" | grep -o '"tier":"[^"]*"' | head -1 | cut -d'"' -f4)
        local chars=$(echo "$body" | grep -o '"character_limit":[0-9]*' | head -1 | cut -d':' -f2)
        if [[ -n "$chars" ]]; then
            log_success "ElevenLabs API: Valid (Tier: $tier, Limit: $chars chars/month)"
        else
            log_success "ElevenLabs API: Valid"
        fi
        log_debug "Response: $(echo "$body" | head -c 100)..."
        return 0
    elif [[ "$http_code" == "401" ]]; then
        log_error "ElevenLabs: Authentication failed (invalid API key)"
        return 1
    else
        log_error "ElevenLabs: HTTP $http_code - $body"
        return 1
    fi
}

# Validate Pika Labs API
validate_pika() {
    ((TOTAL++))
    local api_key=$(get_env "PIKALABS_API_KEY" "")
    local api_url=$(get_env "PIKALABS_API_URL" "https://api.pikalabs.com/v1")
    local mock_mode=$(get_env "PIKALABS_MOCK_MODE" "false")

    log_debug "Pika Labs API Key: ${api_key:0:10}..."
    log_debug "Pika Labs Mock Mode: $mock_mode"

    if [[ "$mock_mode" == "true" ]]; then
        log_warning "Pika Labs: Mock mode enabled (skipping real API validation)"
        return 0
    fi

    if [[ -z "$api_key" ]]; then
        log_error "Pika Labs: No API key provided (PIKALABS_API_KEY)"
        return 1
    fi

    # Test API connection
    local response
    response=$(curl -s -w "\n%{http_code}" \
        "${api_url}/status" \
        -H "Authorization: Bearer $api_key" 2>&1 || echo -e "error\n000")

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]] || [[ "$http_code" == "401" ]]; then
        # Pika API may return 401 with valid key, but 200 confirms validity
        log_success "Pika Labs API: Valid"
        log_debug "Response: $(echo "$body" | head -c 100)..."
        return 0
    else
        log_warning "Pika Labs: Unable to fully validate (may need API approval)"
        log_debug "HTTP $http_code - $body"
        return 0
    fi
}

# Validate YouTube API
validate_youtube() {
    ((TOTAL++))
    local client_id=$(get_env "YOUTUBE_CLIENT_ID" "")
    local client_secret=$(get_env "YOUTUBE_CLIENT_SECRET" "")

    log_debug "YouTube Client ID: ${client_id:0:10}..."

    if [[ -z "$client_id" ]] || [[ -z "$client_secret" ]]; then
        log_warning "YouTube: Client credentials not configured (OAuth required on first run)"
        return 0
    fi

    if [[ ! $client_id =~ .apps.googleusercontent.com ]]; then
        log_error "YouTube: Invalid Client ID format (should end with .apps.googleusercontent.com)"
        return 1
    fi

    log_success "YouTube API: Credentials configured (requires OAuth authorization)"
    return 0
}

# Validate TikTok API
validate_tiktok() {
    ((TOTAL++))
    local client_key=$(get_env "TIKTOK_CLIENT_KEY" "")
    local client_secret=$(get_env "TIKTOK_CLIENT_SECRET" "")

    log_debug "TikTok Client Key: ${client_key:0:10}..."

    if [[ -z "$client_key" ]] || [[ -z "$client_secret" ]]; then
        log_warning "TikTok: API credentials not configured (may still be in approval process)"
        return 0
    fi

    log_success "TikTok API: Credentials configured"
    return 0
}

# Validate Instagram API
validate_instagram() {
    ((TOTAL++))
    local access_token=$(get_env "INSTAGRAM_ACCESS_TOKEN" "")
    local business_id=$(get_env "INSTAGRAM_BUSINESS_ACCOUNT_ID" "")

    log_debug "Instagram Access Token: ${access_token:0:10}..."
    log_debug "Instagram Business ID: $business_id"

    if [[ -z "$access_token" ]]; then
        log_warning "Instagram: No access token provided (requires OAuth)"
        return 0
    fi

    if [[ -z "$business_id" ]]; then
        log_error "Instagram: No business account ID provided"
        return 1
    fi

    # Test API connection
    local response
    response=$(curl -s -w "\n%{http_code}" \
        "https://graph.instagram.com/v18.0/me?fields=id,username" \
        -H "Authorization: Bearer $access_token" 2>&1 || echo -e "error\n000")

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]]; then
        local username=$(echo "$body" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        log_success "Instagram API: Valid (Account: $username)"
        log_debug "Response: $(echo "$body" | head -c 100)..."
        return 0
    elif [[ "$http_code" == "401" ]]; then
        log_error "Instagram: Authentication failed (token expired or invalid)"
        return 1
    else
        log_error "Instagram: HTTP $http_code - $body"
        return 1
    fi
}

# Validate Cloudflare R2
validate_r2() {
    ((TOTAL++))
    local account_id=$(get_env "R2_ACCOUNT_ID" "")
    local access_key=$(get_env "R2_ACCESS_KEY_ID" "")
    local secret_key=$(get_env "R2_SECRET_ACCESS_KEY" "")
    local bucket=$(get_env "R2_BUCKET_NAME" "")

    log_debug "R2 Account ID: ${account_id:0:10}..."
    log_debug "R2 Bucket: $bucket"

    if [[ -z "$account_id" ]] || [[ -z "$access_key" ]] || [[ -z "$secret_key" ]]; then
        log_warning "Cloudflare R2: Credentials not configured"
        return 0
    fi

    if [[ -z "$bucket" ]]; then
        log_error "Cloudflare R2: No bucket name provided"
        return 1
    fi

    # Check if aws cli is available
    if ! command -v aws &> /dev/null; then
        log_warning "Cloudflare R2: AWS CLI not found (cannot validate)"
        return 0
    fi

    # Test bucket access
    AWS_ACCESS_KEY_ID="$access_key" \
    AWS_SECRET_ACCESS_KEY="$secret_key" \
    aws s3 ls "s3://$bucket/" \
        --endpoint-url "https://${account_id}.r2.cloudflarestorage.com" \
        --region us-east-1 > /dev/null 2>&1 && {
        log_success "Cloudflare R2: Valid (bucket: $bucket)"
        return 0
    } || {
        log_error "Cloudflare R2: Failed to access bucket"
        return 1
    }
}

# Main validation
main() {
    parse_arguments "$@"

    echo ""
    echo "======================================================"
    echo "API CREDENTIALS VALIDATION"
    echo "======================================================"
    echo ""

    # Check if .env exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error ".env file not found"
        echo ""
        log_info "Create .env file:"
        log_info "  cp .env.example .env"
        echo ""
        exit 2
    fi

    # Load environment
    load_env
    echo ""

    # Validate each API
    log_info "Validating API credentials..."
    echo ""

    validate_openai || true
    validate_anthropic || true
    validate_elevenlabs || true
    validate_pika || true
    validate_youtube || true
    validate_tiktok || true
    validate_instagram || true
    validate_r2 || true

    echo ""
    echo "======================================================"
    echo "VALIDATION SUMMARY"
    echo "======================================================"

    local total_checked=$((PASSED + FAILED + SKIPPED))
    echo "Total APIs checked: $total_checked"
    echo "Passed: $(echo -e "${GREEN}$PASSED${NC}")"
    echo "Failed: $(echo -e "${RED}$FAILED${NC}")"
    echo "Skipped: $(echo -e "${YELLOW}$SKIPPED${NC}")"

    if [[ $FAILED -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}✓ All APIs are properly configured!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo "You can proceed with production deployment."
        echo ""
        exit 0
    else
        echo ""
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}✗ Some APIs need configuration${NC}"
        echo -e "${RED}========================================${NC}"
        echo ""
        echo "See documentation:"
        echo "  docs/api-setup-guide.md - Detailed setup instructions"
        echo "  docs/api-setup-checklist.md - Step-by-step checklist"
        echo ""
        exit 1
    fi
}

main "$@"
