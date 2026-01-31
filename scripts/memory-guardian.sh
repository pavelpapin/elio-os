#!/bin/bash
# Memory Guardian - Comprehensive Memory Protection System
# Run every 2 minutes via cron
#
# ACTIONS:
# 1. Monitor RAM and SWAP usage
# 2. Kill zombie/duplicate processes
# 3. Clear caches when needed
# 4. Notify on critical levels
#
# Thresholds (4GB RAM, 2GB SWAP):
# - WARNING: RAM > 70% or SWAP > 50%
# - HIGH:    RAM > 80% or SWAP > 70%
# - CRITICAL:RAM > 90% or SWAP > 85%

set -euo pipefail

LOG="/root/.claude/logs/memory-guardian.log"
TELEGRAM_BOT="8505548315:AAHcRouYBU_V2DecXgzmIfbx0qJXeiEj06g"
TELEGRAM_CHAT="93916379"

# Thresholds
RAM_WARNING=70
RAM_HIGH=80
RAM_CRITICAL=90
SWAP_WARNING=50
SWAP_HIGH=70
SWAP_CRITICAL=85

# Cooldown file (prevent spam)
COOLDOWN_FILE="/tmp/memory-guardian-notified"
COOLDOWN_SEC=900  # 15 minutes

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

send_telegram() {
    # Check cooldown
    if [ -f "$COOLDOWN_FILE" ]; then
        LAST_NOTIFY=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
        NOW=$(date +%s)
        if [ $((NOW - LAST_NOTIFY)) -lt $COOLDOWN_SEC ]; then
            log "Notification skipped (cooldown)"
            return
        fi
    fi

    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT" \
        -d text="$1" \
        -d parse_mode="HTML" > /dev/null 2>&1 || true

    date +%s > "$COOLDOWN_FILE"
}

# Get memory stats
RAM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
RAM_USED=$(free -m | awk '/Mem:/ {print $3}')
RAM_AVAIL=$(free -m | awk '/Mem:/ {print $7}')
RAM_PCT=$((RAM_USED * 100 / RAM_TOTAL))

SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
SWAP_USED=$(free -m | awk '/Swap:/ {print $3}')
SWAP_PCT=$((SWAP_USED * 100 / (SWAP_TOTAL + 1)))  # +1 to avoid div by 0

log "Check: RAM ${RAM_PCT}% (${RAM_USED}/${RAM_TOTAL}MB), SWAP ${SWAP_PCT}% (${SWAP_USED}/${SWAP_TOTAL}MB)"

# === ACTION 1: Kill zombie/duplicate processes ===
kill_zombies() {
    local PATTERN=$1
    local MAX_ALLOWED=$2
    local COUNT=$(pgrep -f "$PATTERN" 2>/dev/null | wc -l)

    if [ "$COUNT" -gt "$MAX_ALLOWED" ]; then
        log "ACTION: Killing excess $PATTERN processes ($COUNT > $MAX_ALLOWED)"
        # Keep newest, kill older ones
        pgrep -f "$PATTERN" | head -n -"$MAX_ALLOWED" | xargs -r kill -TERM 2>/dev/null || true
        sleep 1
        pgrep -f "$PATTERN" | head -n -"$MAX_ALLOWED" | xargs -r kill -KILL 2>/dev/null || true
        return 0
    fi
    return 1
}

# Check for zombie processes
ZOMBIES_KILLED=0
kill_zombies "system-loop.ts" 2 && ZOMBIES_KILLED=1
kill_zombies "system-loop/index" 2 && ZOMBIES_KILLED=1
kill_zombies "tsx.*system-loop" 2 && ZOMBIES_KILLED=1

if [ "$ZOMBIES_KILLED" -eq 1 ]; then
    log "Zombies killed, rechecking memory..."
    sleep 2
    RAM_USED=$(free -m | awk '/Mem:/ {print $3}')
    RAM_PCT=$((RAM_USED * 100 / RAM_TOTAL))
    SWAP_USED=$(free -m | awk '/Swap:/ {print $3}')
    SWAP_PCT=$((SWAP_USED * 100 / (SWAP_TOTAL + 1)))
    log "After cleanup: RAM ${RAM_PCT}%, SWAP ${SWAP_PCT}%"
fi

# === ACTION 2: Determine severity ===
SEVERITY="OK"
ACTIONS_TAKEN=""

if [ "$RAM_PCT" -gt "$RAM_CRITICAL" ] || [ "$SWAP_PCT" -gt "$SWAP_CRITICAL" ]; then
    SEVERITY="CRITICAL"
elif [ "$RAM_PCT" -gt "$RAM_HIGH" ] || [ "$SWAP_PCT" -gt "$SWAP_HIGH" ]; then
    SEVERITY="HIGH"
elif [ "$RAM_PCT" -gt "$RAM_WARNING" ] || [ "$SWAP_PCT" -gt "$SWAP_WARNING" ]; then
    SEVERITY="WARNING"
fi

# === ACTION 3: Take action based on severity ===
if [ "$SEVERITY" = "CRITICAL" ]; then
    log "🔴 CRITICAL memory situation!"

    # Clear caches aggressively
    sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    ACTIONS_TAKEN="Cleared caches"

    # Find and kill top memory consumer (if it's node/claude)
    TOP_PROC=$(ps aux --sort=-%mem | awk 'NR==2 {print $2, $4, $11}')
    TOP_PID=$(echo "$TOP_PROC" | awk '{print $1}')
    TOP_MEM=$(echo "$TOP_PROC" | awk '{print $2}')
    TOP_CMD=$(echo "$TOP_PROC" | awk '{print $3}')

    if [[ "$TOP_CMD" == *"node"* ]] || [[ "$TOP_CMD" == *"claude"* ]] || [[ "$TOP_CMD" == *"tsx"* ]]; then
        # Don't kill cursor-server or MCP
        if [[ "$TOP_CMD" != *"cursor-server"* ]] && [[ "$TOP_CMD" != *"mcp-server"* ]]; then
            log "Killing top consumer: PID $TOP_PID ($TOP_CMD, ${TOP_MEM}%)"
            kill -TERM "$TOP_PID" 2>/dev/null || true
            sleep 2
            kill -KILL "$TOP_PID" 2>/dev/null || true
            ACTIONS_TAKEN="$ACTIONS_TAKEN, Killed $TOP_CMD"
        fi
    fi

    # Notify
    MSG="🔴 <b>MEMORY CRITICAL</b>%0A%0ARAM: ${RAM_PCT}% (${RAM_AVAIL}MB free)%0ASWAP: ${SWAP_PCT}%%0A%0AActions: ${ACTIONS_TAKEN}"
    send_telegram "$MSG"

elif [ "$SEVERITY" = "HIGH" ]; then
    log "🟠 HIGH memory usage"

    # Clear caches
    sync && echo 1 > /proc/sys/vm/drop_caches 2>/dev/null || true
    ACTIONS_TAKEN="Cleared page cache"

    # Notify
    MSG="🟠 <b>MEMORY HIGH</b>%0A%0ARAM: ${RAM_PCT}% (${RAM_AVAIL}MB free)%0ASWAP: ${SWAP_PCT}%%0A%0AAction: ${ACTIONS_TAKEN}"
    send_telegram "$MSG"

elif [ "$SEVERITY" = "WARNING" ]; then
    log "🟡 Memory warning (no action needed yet)"
fi

# === ACTION 4: Clear swap if very high but RAM is ok ===
if [ "$SWAP_PCT" -gt 60 ] && [ "$RAM_PCT" -lt 60 ]; then
    log "Swap high but RAM ok, attempting swap clear"
    # This moves swap contents back to RAM
    swapoff -a && swapon -a 2>/dev/null || true
    log "Swap cleared"
fi

log "Done (severity: $SEVERITY)"
