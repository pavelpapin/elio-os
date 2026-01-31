#!/bin/bash
# Redis Backup Script
# Run via cron: 0 */6 * * * /root/.claude/scripts/redis-backup.sh
#
# Triggers BGSAVE and copies the RDB snapshot to a dated backup.
# Keeps last 7 days of backups.

set -euo pipefail

BACKUP_DIR="/root/.claude/backups/redis"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
RETENTION_DAYS=7
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

# Trigger background save
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE > /dev/null 2>&1

# Wait for save to complete (max 60s)
for i in $(seq 1 60); do
  SAVING=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE 2>/dev/null)
  sleep 1
  NEW_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE 2>/dev/null)
  if [ "$SAVING" != "$NEW_SAVE" ] || [ "$i" -gt 5 ]; then
    break
  fi
done

# Copy RDB file from Docker volume or local
if docker inspect elio-redis > /dev/null 2>&1; then
  docker cp elio-redis:/data/dump.rdb "$BACKUP_DIR/dump-${DATE}.rdb" 2>/dev/null || true
else
  # Local Redis
  RDB_PATH=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir 2>/dev/null | tail -1)
  if [ -f "$RDB_PATH/dump.rdb" ]; then
    cp "$RDB_PATH/dump.rdb" "$BACKUP_DIR/dump-${DATE}.rdb"
  fi
fi

# Clean old backups
find "$BACKUP_DIR" -name "dump-*.rdb" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Log
echo "[$(date -Iseconds)] Redis backup: $BACKUP_DIR/dump-${DATE}.rdb" >> /root/.claude/logs/redis-backup.log
