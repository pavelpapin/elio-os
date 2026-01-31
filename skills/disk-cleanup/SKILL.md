# Disk Cleanup Skill

Очистка диска: старые логи, кэши, временные файлы.

## Когда использовать
- Как часть maintenance workflow
- Когда диск заполнен >80%
- Еженедельно

## Входные данные
- `dryRun`: только показать что будет удалено (default: false)
- `ageDays`: удалять файлы старше N дней (default: 7)

## Что делает

### 1. Старые логи (>7 дней)
```bash
find /root/.claude/logs -name "*.log" -mtime +7 -delete
find /root/.claude/logs -name "*.json" -mtime +30 -delete
```

### 2. NPM/PNPM кэш
```bash
pnpm store prune
npm cache clean --force 2>/dev/null || true
```

### 3. Pip кэш
```bash
pip cache purge 2>/dev/null || true
```

### 4. Временные файлы
```bash
rm -rf /tmp/claude-* 2>/dev/null || true
rm -rf /root/.claude/.tmp/* 2>/dev/null || true
```

### 5. Old build artifacts
```bash
find /root/.claude -name "*.tsbuildinfo" -mtime +7 -delete
```

### 6. Docker cleanup (если используется)
```bash
docker system prune -f 2>/dev/null || true
```

## Ограничения
- НЕ удалять логи моложе `ageDays`
- НЕ трогать: secrets/, .git/, node_modules/
- Сохранять последний лог каждого типа

## Проверка перед очисткой
```bash
df -h /  # Проверить текущее использование
```

## Выход
```json
{
  "freedMB": 150,
  "logsDeleted": 23,
  "cacheCleared": true,
  "diskUsageBefore": "75%",
  "diskUsageAfter": "68%"
}
```
