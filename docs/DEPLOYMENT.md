# Deployment Guide

## Overview

Код Elio OS хранится в двух местах:
- **Production сервер**: `/root/.claude/`
- **GitHub**: `git@github.com:pavelpagin/elio-os.git`

## Deployment Commands

### Full Deployment (recommended)
```bash
pnpm deploy -m "feat: add new feature"
```

Выполняет:
1. ✓ Коммит незафиксированных изменений
2. ✓ Type check
3. ✓ Build всех packages
4. ✓ Registry validation
5. ✓ Restart MCP service
6. ✓ Push в GitHub

### Quick Deploy (без GitHub push)
```bash
pnpm deploy:quick -m "fix: quick fix"
```

Все то же самое, но без push в GitHub (для быстрых итераций).

### MCP Server Only Update
```bash
pnpm deploy:mcp
```

Быстрое обновление только MCP сервера:
1. ✓ Build MCP server
2. ✓ Restart elio-mcp service
3. ✓ Verify service status

## Manual Deployment

### 1. Commit changes
```bash
git add .
git commit -m "feat: description"
```

### 2. Build
```bash
pnpm build
```

### 3. Update MCP
```bash
cd mcp-server
pnpm build
systemctl restart elio-mcp
```

### 4. Push to GitHub
```bash
git push origin main
```

## Deploy Script Options

```bash
./scripts/deploy.sh [options]

Options:
  -m "message"     Commit message (required if uncommitted changes)
  --skip-build     Skip build step
  --skip-push      Skip git push
  --skip-restart   Skip service restart
```

### Examples

**Deploy with custom commit:**
```bash
pnpm deploy -m "feat(mcp): add new integration"
```

**Build and restart, but don't push:**
```bash
pnpm deploy:quick -m "wip: testing changes"
```

**Only restart MCP service:**
```bash
pnpm deploy:mcp
```

## Automated Deployment (Git Hooks)

После настройки git hooks:
```bash
git commit -m "feat: new feature"
# → Автоматически: typecheck → build → restart MCP
```

## Troubleshooting

### MCP service failed to start
```bash
# Check logs
journalctl -u elio-mcp -n 50

# Rebuild
cd /root/.claude/mcp-server
pnpm build

# Restart
systemctl restart elio-mcp
```

### Type check failed
```bash
# Run type check
pnpm typecheck

# Fix errors and retry
```

### Build failed
```bash
# Clean and rebuild
pnpm clean
pnpm build
```

### Can't push to GitHub
```bash
# Check remote
git remote -v

# Pull first if behind
git pull origin main --rebase

# Then push
git push origin main
```

## Service Management

### Check MCP status
```bash
systemctl status elio-mcp
```

### View logs
```bash
journalctl -u elio-mcp -f
```

### Restart service
```bash
systemctl restart elio-mcp
```

### Enable on boot
```bash
systemctl enable elio-mcp
```

## CI/CD Pipeline (GitHub Actions)

При push в GitHub автоматически запускаются:
- ✓ Lint check
- ✓ Type check
- ✓ Registry validation

**НО**: автоматического деплоя на сервер нет (только локальный деплой).

## Best Practices

1. **Всегда используйте `pnpm deploy`** вместо ручных команд
2. **Commit messages** следуйте [Conventional Commits](https://www.conventionalcommits.org/)
3. **Before deploy** убедитесь что typecheck проходит
4. **Testing** запустите `pnpm test` перед важными изменениями
5. **MCP changes** после изменений в `mcp-server/` всегда рестартите сервис

## Quick Reference

| Task | Command |
|------|---------|
| Full deploy + push | `pnpm deploy -m "message"` |
| Deploy without push | `pnpm deploy:quick -m "message"` |
| Update MCP only | `pnpm deploy:mcp` |
| Check MCP status | `systemctl status elio-mcp` |
| View MCP logs | `journalctl -u elio-mcp -f` |
| Type check | `pnpm typecheck` |
| Build all | `pnpm build` |
