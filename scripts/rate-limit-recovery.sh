#!/bin/bash
#
# Rate Limit Recovery - Check if Claude API limits are restored
# Runs every hour at X:01 to check if limits recovered
#
# Usage: ./scripts/rate-limit-recovery.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="/tmp/claude-rate-limited"
LOG_FILE="/root/.claude/logs/rate-limit-recovery.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_telegram() {
    local message="$1"
    cd /root/.claude/mcp-server
    npx tsx -e "
        import { sendNotification } from '@elio/clients/telegram';
        sendNotification(\`$message\`).catch(e => console.error(e.message));
    " 2>/dev/null || true
}

# Check if we were previously rate limited
if [ ! -f "$STATE_FILE" ]; then
    log "No rate limit state file found, skipping check"
    exit 0
fi

log "Rate limit state file exists, checking if limits restored..."

# Try a minimal Claude request
RESPONSE=$(timeout 30 claude -p "respond with only: ok" --model haiku 2>&1) || true

if echo "$RESPONSE" | grep -qi "ok"; then
    log "✅ Limits restored! Claude responded successfully"

    # Remove state file
    rm -f "$STATE_FILE"

    # Get last session info
    LAST_SESSION=$(cat "$STATE_FILE.session" 2>/dev/null || echo "unknown")

    # Send notification
    send_telegram "🟢 Claude limits restored!

Session can be resumed.
Time: $(date '+%H:%M UTC')

Use: claude --resume $LAST_SESSION"

    rm -f "$STATE_FILE.session"

    log "Notification sent"

elif echo "$RESPONSE" | grep -qi "rate\|limit\|quota\|429"; then
    log "⏳ Still rate limited: $RESPONSE"

elif echo "$RESPONSE" | grep -qi "error\|timeout"; then
    log "⚠️ Error checking limits: $RESPONSE"

else
    log "🤔 Unknown response: $RESPONSE"
fi
