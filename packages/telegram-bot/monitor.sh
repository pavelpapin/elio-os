#!/bin/bash
# Read token from secrets
SECRETS_FILE="/root/.claude/secrets/telegram.json"
BOT_TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SECRETS_FILE')).bot_token || '')" 2>/dev/null)

if [ -z "$BOT_TOKEN" ]; then
    echo "Error: Could not read bot token from $SECRETS_FILE"
    exit 1
fi

CHAT_ID="$1"
THRESHOLD_MEM=80
THRESHOLD_CPU=80

while true; do
    # Memory usage
    MEM_USED=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    
    # CPU usage (1 min load avg vs cores)
    CPU_LOAD=$(cat /proc/loadavg | awk '{print $1}')
    CORES=$(nproc)
    CPU_PERCENT=$(echo "$CPU_LOAD $CORES" | awk '{printf "%.0f", ($1/$2) * 100}')
    
    if [ "$MEM_USED" -gt "$THRESHOLD_MEM" ]; then
        curl -s "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d "chat_id=$CHAT_ID&text=⚠️ Elio Server: Memory ${MEM_USED}%" > /dev/null
    fi
    
    if [ "$CPU_PERCENT" -gt "$THRESHOLD_CPU" ]; then
        curl -s "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d "chat_id=$CHAT_ID&text=⚠️ Elio Server: CPU ${CPU_PERCENT}%" > /dev/null
    fi
    
    sleep 60
done
