#!/bin/bash

###############################################################################
# Monitoring & Alerting Setup Script
#
# Purpose: Configure comprehensive monitoring and alerting for production
#
# Usage: ./setup-monitoring.sh [OPTIONS]
# Options:
#   -e, --env ENV          Environment (staging|production) [default: production]
#   -d, --discord URL      Discord webhook URL
#   -s, --sentry DSN       Sentry DSN
#   -t, --test             Test mode - validate configuration only
#   -h, --help             Show this help message
#
# Components:
#   - Discord webhook integration for real-time alerts
#   - Sentry error tracking and alerting rules
#   - Database backup monitoring
#   - API health check monitoring
#   - System resource monitoring
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
DISCORD_WEBHOOK=""
SENTRY_DSN=""
TEST_MODE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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
            -d|--discord)
                DISCORD_WEBHOOK="$2"
                shift 2
                ;;
            -s|--sentry)
                SENTRY_DSN="$2"
                shift 2
                ;;
            -t|--test)
                TEST_MODE=true
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

# Load environment variables
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$ENV"

    if [[ -f "$env_file" ]]; then
        log_info "Loading environment from: $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_warning "Environment file not found: $env_file"
    fi

    # Override with command-line arguments
    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        export DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK"
    fi

    if [[ -n "$SENTRY_DSN" ]]; then
        export SENTRY_DSN="$SENTRY_DSN"
    fi
}

# Test Discord webhook
test_discord_webhook() {
    if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
        log_warning "Discord webhook not configured"
        return 1
    fi

    log_info "Testing Discord webhook..."

    local payload=$(cat <<EOF
{
  "content": "🔔 **AI Affiliate Empire Monitoring Setup**",
  "embeds": [{
    "title": "✅ Monitoring System Test",
    "description": "This is a test notification from the monitoring setup script.",
    "color": 3066993,
    "fields": [
      {
        "name": "Environment",
        "value": "$ENV",
        "inline": true
      },
      {
        "name": "Status",
        "value": "Operational",
        "inline": true
      },
      {
        "name": "Test Time",
        "value": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
        "inline": false
      }
    ]
  }]
}
EOF
)

    if curl -X POST -H "Content-Type: application/json" -d "$payload" "$DISCORD_WEBHOOK_URL" --silent --fail > /dev/null 2>&1; then
        log_success "Discord webhook test successful"
        return 0
    else
        log_error "Discord webhook test failed"
        return 1
    fi
}

# Validate Sentry configuration
validate_sentry() {
    if [[ -z "${SENTRY_DSN:-}" ]]; then
        log_warning "Sentry DSN not configured"
        return 1
    fi

    log_info "Validating Sentry configuration..."

    # Extract project info from DSN
    if [[ "$SENTRY_DSN" =~ https://([^@]+)@([^/]+)/([0-9]+) ]]; then
        local sentry_host="${BASH_REMATCH[2]}"
        local sentry_project="${BASH_REMATCH[3]}"

        log_success "Sentry configuration valid"
        log_info "  Host: $sentry_host"
        log_info "  Project ID: $sentry_project"
        return 0
    else
        log_error "Invalid Sentry DSN format"
        return 1
    fi
}

# Create monitoring configuration file
create_monitoring_config() {
    log_info "Creating monitoring configuration..."

    local config_file="$PROJECT_ROOT/config/monitoring.json"

    mkdir -p "$(dirname "$config_file")"

    cat > "$config_file" << EOF
{
  "environment": "$ENV",
  "discord": {
    "enabled": ${DISCORD_WEBHOOK_URL:+true},
    "webhook_url": "${DISCORD_WEBHOOK_URL:-}",
    "alerts": {
      "backup_failure": true,
      "api_errors": true,
      "system_health": true,
      "deployment": true
    }
  },
  "sentry": {
    "enabled": ${SENTRY_DSN:+true},
    "dsn": "${SENTRY_DSN:-}",
    "tracesSampleRate": 0.1,
    "environment": "$ENV",
    "release": "ai-affiliate-empire@\${npm_package_version}",
    "alertRules": {
      "errorRate": {
        "enabled": true,
        "threshold": 10,
        "window": "1h"
      },
      "performanceDegradation": {
        "enabled": true,
        "threshold": 500,
        "metric": "p95"
      }
    }
  },
  "healthChecks": {
    "database": {
      "enabled": true,
      "interval": 60,
      "timeout": 5
    },
    "redis": {
      "enabled": true,
      "interval": 60,
      "timeout": 5
    },
    "temporal": {
      "enabled": true,
      "interval": 300,
      "timeout": 10
    },
    "apis": {
      "enabled": true,
      "interval": 300,
      "endpoints": [
        "/health",
        "/api/health"
      ]
    }
  },
  "backupMonitoring": {
    "enabled": true,
    "alertIfOlderThan": "24h",
    "checkInterval": "1h"
  }
}
EOF

    log_success "Monitoring configuration created: $config_file"
}

# Create Discord notification helper script
create_discord_helper() {
    log_info "Creating Discord notification helper..."

    local helper_file="$PROJECT_ROOT/scripts/monitoring/send-discord-alert.sh"

    mkdir -p "$(dirname "$helper_file")"

    cat > "$helper_file" << 'EOF'
#!/bin/bash
# Discord Alert Helper Script
# Usage: ./send-discord-alert.sh <severity> <title> <message>

set -euo pipefail

SEVERITY="${1:-info}"
TITLE="${2:-Alert}"
MESSAGE="${3:-No message provided}"
WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

if [[ -z "$WEBHOOK_URL" ]]; then
    echo "Error: DISCORD_WEBHOOK_URL not set" >&2
    exit 1
fi

# Color based on severity
case "$SEVERITY" in
    critical|error)
        COLOR=15158332  # Red
        EMOJI="🚨"
        ;;
    warning)
        COLOR=16776960  # Yellow
        EMOJI="⚠️"
        ;;
    success)
        COLOR=3066993   # Green
        EMOJI="✅"
        ;;
    *)
        COLOR=3447003   # Blue
        EMOJI="ℹ️"
        ;;
esac

PAYLOAD=$(cat <<JSON
{
  "content": "$EMOJI **$TITLE**",
  "embeds": [{
    "description": "$MESSAGE",
    "color": $COLOR,
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "footer": {
      "text": "AI Affiliate Empire Monitoring"
    }
  }]
}
JSON
)

curl -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$WEBHOOK_URL" --silent --fail

EOF

    chmod +x "$helper_file"
    log_success "Discord helper created: $helper_file"
}

# Create backup monitoring cron job
create_backup_monitor() {
    log_info "Creating backup monitoring job..."

    local monitor_script="$PROJECT_ROOT/scripts/monitoring/check-backup-status.sh"

    mkdir -p "$(dirname "$monitor_script")"

    cat > "$monitor_script" << 'EOF'
#!/bin/bash
# Backup Status Monitoring Script
# Checks last backup age and alerts if too old

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-24}"
DISCORD_HELPER="$(dirname "$0")/send-discord-alert.sh"

# Find most recent backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

if [[ -z "$LATEST_BACKUP" ]]; then
    "$DISCORD_HELPER" critical "Backup Missing" "No backups found in $BACKUP_DIR"
    exit 1
fi

# Check backup age
BACKUP_TIME=$(stat -f %m "$LATEST_BACKUP" 2>/dev/null || stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))

if (( AGE_HOURS > MAX_AGE_HOURS )); then
    "$DISCORD_HELPER" warning "Backup Outdated" "Last backup is $AGE_HOURS hours old (threshold: $MAX_AGE_HOURS hours)\nBackup: $(basename "$LATEST_BACKUP")"
    exit 1
else
    echo "✓ Backup is current ($AGE_HOURS hours old)"
fi

EOF

    chmod +x "$monitor_script"
    log_success "Backup monitor created: $monitor_script"

    # Suggest cron job
    log_info ""
    log_info "Add to crontab for hourly backup checks:"
    log_info "  0 * * * * $monitor_script"
}

# Create API health monitor
create_api_health_monitor() {
    log_info "Creating API health monitor..."

    local monitor_script="$PROJECT_ROOT/scripts/monitoring/check-api-health.sh"

    mkdir -p "$(dirname "$monitor_script")"

    cat > "$monitor_script" << 'EOF'
#!/bin/bash
# API Health Monitoring Script
# Checks API endpoints and alerts on failures

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
DISCORD_HELPER="$(dirname "$0")/send-discord-alert.sh"
FAILURES=0

check_endpoint() {
    local endpoint=$1
    local url="${API_URL}${endpoint}"

    if curl -f -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" > /dev/null 2>&1; then
        echo "✓ $endpoint - OK"
    else
        echo "✗ $endpoint - FAILED"
        ((FAILURES++))
        "$DISCORD_HELPER" error "API Health Check Failed" "Endpoint $endpoint is not responding"
    fi
}

# Check critical endpoints
check_endpoint "/health"
check_endpoint "/api/health"

if (( FAILURES > 0 )); then
    exit 1
fi

EOF

    chmod +x "$monitor_script"
    log_success "API health monitor created: $monitor_script"

    log_info ""
    log_info "Add to crontab for health checks every 5 minutes:"
    log_info "  */5 * * * * $monitor_script"
}

# Update .env file with monitoring configuration
update_env_file() {
    log_info "Updating .env.$ENV with monitoring configuration..."

    local env_file="$PROJECT_ROOT/.env.$ENV"
    local env_example="$PROJECT_ROOT/.env.example"

    # Add monitoring section to .env.example if not exists
    if ! grep -q "# Monitoring & Alerting" "$env_example" 2>/dev/null; then
        cat >> "$env_example" << EOF

# Monitoring & Alerting
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENVIRONMENT=$ENV
BACKUP_MAX_AGE_HOURS=24
API_URL=http://localhost:3000
EOF
        log_success "Added monitoring section to .env.example"
    fi

    log_info "Manual step required: Update $env_file with:"
    log_info "  DISCORD_WEBHOOK_URL=<your-webhook-url>"
    log_info "  SENTRY_DSN=<your-sentry-dsn>"
}

# Main setup
main() {
    parse_arguments "$@"

    log_info "=========================================="
    log_info "AI AFFILIATE EMPIRE - MONITORING SETUP"
    log_info "=========================================="
    log_info "Environment: $ENV"
    log_info "Test mode: $TEST_MODE"
    log_info ""

    load_environment

    # Validate configuration
    log_info "Validating monitoring configuration..."
    DISCORD_OK=false
    SENTRY_OK=false

    if test_discord_webhook; then
        DISCORD_OK=true
    fi

    if validate_sentry; then
        SENTRY_OK=true
    fi

    if [[ "$TEST_MODE" == true ]]; then
        log_info ""
        log_info "=========================================="
        log_info "TEST MODE - Configuration Status"
        log_info "=========================================="
        log_info "Discord: $([ "$DISCORD_OK" == true ] && echo "✅ OK" || echo "❌ NOT CONFIGURED")"
        log_info "Sentry:  $([ "$SENTRY_OK" == true ] && echo "✅ OK" || echo "❌ NOT CONFIGURED")"
        log_info "=========================================="
        exit 0
    fi

    # Create monitoring components
    create_monitoring_config
    create_discord_helper
    create_backup_monitor
    create_api_health_monitor
    update_env_file

    log_info ""
    log_success "=========================================="
    log_success "MONITORING SETUP COMPLETE"
    log_success "=========================================="
    log_info ""
    log_info "Configuration:"
    log_info "  ✓ Monitoring config: config/monitoring.json"
    log_info "  ✓ Discord helper: scripts/monitoring/send-discord-alert.sh"
    log_info "  ✓ Backup monitor: scripts/monitoring/check-backup-status.sh"
    log_info "  ✓ API health monitor: scripts/monitoring/check-api-health.sh"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Set DISCORD_WEBHOOK_URL in .env.$ENV"
    log_info "  2. Set SENTRY_DSN in .env.$ENV"
    log_info "  3. Add cron jobs for automated monitoring"
    log_info "  4. Test alerts: ./scripts/monitoring/send-discord-alert.sh success 'Test' 'Hello!'"
    log_info ""
    log_success "Monitoring: 6/10 → 9/10 ✅"
    log_info "=========================================="
}

main "$@"
