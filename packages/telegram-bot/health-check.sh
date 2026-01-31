#!/bin/bash
# Elio Bot Health Check
# Run: ./health-check.sh
# Returns: 0 if healthy, 1 if unhealthy

HEALTH_FILE="/tmp/elio-bot.health"
LOCK_FILE="/tmp/elio-bot.lock"
PID_FILE="/tmp/elio-bot.pid"
MAX_POLL_ERRORS=5

# Check if service is running
if ! systemctl is-active --quiet elio-bot; then
    echo "UNHEALTHY: elio-bot service not running"
    exit 1
fi

# Check if lock file exists
if [ ! -f "$LOCK_FILE" ]; then
    echo "UNHEALTHY: No lock file found"
    exit 1
fi

# Check if PID in lock file matches running process
LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('pid',''))" 2>/dev/null)
if [ -z "$LOCK_PID" ] || ! kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "UNHEALTHY: Lock PID ($LOCK_PID) not running"
    exit 1
fi

# Check health file if exists
if [ -f "$HEALTH_FILE" ]; then
    STATUS=$(cat "$HEALTH_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
    ERRORS=$(cat "$HEALTH_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('pollErrors',0))" 2>/dev/null)
    UPTIME=$(cat "$HEALTH_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('uptime',0))" 2>/dev/null)
    MESSAGES=$(cat "$HEALTH_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('messagesProcessed',0))" 2>/dev/null)

    echo "Status: $STATUS"
    echo "Poll Errors: $ERRORS"
    echo "Uptime: ${UPTIME}s"
    echo "Messages: $MESSAGES"

    if [ "$STATUS" = "unhealthy" ] || [ "$ERRORS" -ge "$MAX_POLL_ERRORS" ]; then
        echo "UNHEALTHY: Too many poll errors"
        exit 1
    fi
fi

# Quick API check
API_RESULT=$(curl -s --max-time 5 "https://api.telegram.org/bot8505548315:AAHcRouYBU_V2DecXgzmIfbx0qJXeiEj06g/getMe")
if ! echo "$API_RESULT" | grep -q '"ok":true'; then
    echo "UNHEALTHY: Telegram API check failed"
    exit 1
fi

echo "HEALTHY: Bot is running normally"
exit 0
