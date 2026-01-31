#!/bin/bash
# Memory watchdog - автоматическая реакция на высокое потребление памяти
# Запускается каждые 5 минут через cron

set -e

THRESHOLD=85  # % использования RAM
LOG="/root/.claude/logs/memory-watchdog.log"
TELEGRAM_BOT="8505548315:AAHcRouYBU_V2DecXgzmIfbx0qJXeiEj06g"
TELEGRAM_CHAT="93916379"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"
}

send_telegram() {
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT" \
        -d text="$1" \
        -d parse_mode="HTML" > /dev/null 2>&1 || true
}

# Получаем % использования RAM
MEM_USED=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
MEM_AVAILABLE=$(free -h | awk '/Mem:/ {print $7}')

log "Memory check: ${MEM_USED}% used, ${MEM_AVAILABLE} available"

if [ "$MEM_USED" -gt "$THRESHOLD" ]; then
    log "⚠️ High memory usage detected: ${MEM_USED}%"

    # Найти топ процесс по памяти (кроме системных)
    TOP_PROC=$(ps aux --sort=-%mem | awk 'NR==2 {print $2, $4, $11}')
    TOP_PID=$(echo "$TOP_PROC" | awk '{print $1}')
    TOP_MEM=$(echo "$TOP_PROC" | awk '{print $2}')
    TOP_CMD=$(echo "$TOP_PROC" | awk '{print $3}')

    log "Top process: PID=$TOP_PID, MEM=${TOP_MEM}%, CMD=$TOP_CMD"

    # Действия в зависимости от уровня
    if [ "$MEM_USED" -gt 95 ]; then
        # Критический уровень - убиваем самый жирный node процесс
        log "🔴 CRITICAL: Killing process $TOP_PID ($TOP_CMD)"

        if [[ "$TOP_CMD" == *"node"* ]] || [[ "$TOP_CMD" == *"claude"* ]]; then
            kill -TERM "$TOP_PID" 2>/dev/null || true
            sleep 2
            kill -KILL "$TOP_PID" 2>/dev/null || true

            MSG="🔴 <b>MEMORY CRITICAL (${MEM_USED}%)</b>%0A%0AKilled: ${TOP_CMD}%0APID: ${TOP_PID}%0AMemory: ${TOP_MEM}%"
            send_telegram "$MSG"
        fi

    elif [ "$MEM_USED" -gt 90 ]; then
        # Высокий уровень - очищаем кеши
        log "🟠 HIGH: Clearing caches"
        sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

        MSG="🟠 <b>MEMORY HIGH (${MEM_USED}%)</b>%0A%0ACleared caches%0ATop: ${TOP_CMD} (${TOP_MEM}%)"
        send_telegram "$MSG"

    else
        # Предупреждение
        log "🟡 WARNING: Memory at ${MEM_USED}%"
    fi
fi
