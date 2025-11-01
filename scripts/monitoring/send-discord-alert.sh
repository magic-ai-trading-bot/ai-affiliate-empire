#!/bin/bash

##############################################################################
# Discord Alert Sender Script
#
# Sends formatted alerts to Discord webhook
#
# Usage: ./send-discord-alert.sh <severity> <title> <message> [emoji]
# Example: ./send-discord-alert.sh critical "Database Error" "Connection timeout" "🚨"
##############################################################################

set -euo pipefail

# Color and emoji setup
SEVERITY="${1:-info}"
TITLE="${2:-Alert}"
MESSAGE="${3:-No message provided}"
CUSTOM_EMOJI="${4:-}"

WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Validate webhook is set
if [[ -z "$WEBHOOK_URL" ]]; then
    echo "Error: DISCORD_WEBHOOK_URL environment variable not set" >&2
    exit 1
fi

# Determine color and emoji based on severity
case "$SEVERITY" in
    critical|error)
        COLOR=15158332  # Red
        EMOJI="${CUSTOM_EMOJI:-🚨}"
        ;;
    warning)
        COLOR=16776960  # Yellow
        EMOJI="${CUSTOM_EMOJI:-⚠️}"
        ;;
    success|ok)
        COLOR=3066993   # Green
        EMOJI="${CUSTOM_EMOJI:-✅}"
        ;;
    info|information)
        COLOR=3447003   # Blue
        EMOJI="${CUSTOM_EMOJI:-ℹ️}"
        ;;
    *)
        COLOR=9807270   # Gray
        EMOJI="${CUSTOM_EMOJI:-📌}"
        ;;
esac

# Build timestamp
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)

# Build Discord payload
PAYLOAD=$(cat <<JSON
{
  "content": "$EMOJI **$TITLE**",
  "embeds": [
    {
      "title": "$TITLE",
      "description": "$MESSAGE",
      "color": $COLOR,
      "fields": [
        {
          "name": "Severity",
          "value": "$(echo $SEVERITY | tr '[:lower:]' '[:upper:]')",
          "inline": true
        },
        {
          "name": "Hostname",
          "value": "$(hostname)",
          "inline": true
        },
        {
          "name": "Timestamp",
          "value": "$TIMESTAMP",
          "inline": false
        }
      ],
      "footer": {
        "text": "AI Affiliate Empire Monitoring",
        "icon_url": "https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/src/assets/logo-small.svg"
      },
      "timestamp": "$TIMESTAMP"
    }
  ]
}
JSON
)

# Send to Discord
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$WEBHOOK_URL")

if [[ "$HTTP_STATUS" == "204" ]]; then
    echo "✓ Alert sent to Discord (status: $HTTP_STATUS)"
    exit 0
else
    echo "✗ Failed to send Discord alert (status: $HTTP_STATUS)" >&2
    exit 1
fi
