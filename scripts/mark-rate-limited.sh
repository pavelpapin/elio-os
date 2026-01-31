#!/bin/bash
#
# Mark Rate Limited - Call this when you hit rate limits
# Creates state file for recovery script to check
#
# Usage: ./scripts/mark-rate-limited.sh [session-id]
#

STATE_FILE="/tmp/claude-rate-limited"
SESSION_FILE="/tmp/claude-rate-limited.session"
LOG_FILE="/root/.claude/logs/rate-limit-recovery.log"

# Create marker file
touch "$STATE_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$STATE_FILE"

# Save session ID if provided
if [ -n "$1" ]; then
    echo "$1" > "$SESSION_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rate limit marked. Session: ${1:-none}" >> "$LOG_FILE"

# Send notification about rate limit
cd /root/.claude/mcp-server 2>/dev/null
npx tsx -e "
    import { sendNotification } from '@elio/clients/telegram';
    sendNotification('🔴 Claude rate limited!\n\nWill notify when limits restore.\nNext check: :01 of next hour').catch(e => console.error(e.message));
" 2>/dev/null || true

echo "Rate limit state saved. Recovery script will check at :01 each hour."
