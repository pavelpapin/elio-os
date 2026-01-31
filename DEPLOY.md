# 🚀 Quick Deploy Guide

## Самые частые команды

### 1. Полный деплой (коммит + билд + пуш)
```bash
pnpm ship "feat: add new feature"
```

### 2. Быстрый деплой (без GitHub push)
```bash
pnpm deploy:quick -m "wip: testing"
```

### 3. Только обновить MCP сервер
```bash
pnpm deploy:mcp
```

---

## Что происходит под капотом

### `pnpm ship "message"`
1. ✅ Коммит всех изменений
2. ✅ Type check
3. ✅ Build packages
4. ✅ Validate registry
5. ✅ Restart MCP service
6. ✅ Push в GitHub

### `pnpm deploy:mcp`
1. ✅ Build MCP server
2. ✅ Restart elio-mcp
3. ✅ Verify service

---

## Автоматизация (Git Hooks)

После коммита с изменениями в `mcp-server/src/`:
- 🔄 Автоматический rebuild MCP server
- 💡 Напоминание рестартнуть сервис

Хуки уже установлены ✓

---

## Troubleshooting

**MCP не запустился?**
```bash
journalctl -u elio-mcp -n 50
```

**Ошибка типизации?**
```bash
pnpm typecheck
```

**Build failed?**
```bash
pnpm clean && pnpm build
```

---

## Полная документация

См. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
