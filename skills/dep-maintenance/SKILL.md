# Dependency Maintenance Skill

Обновление зависимостей: security patches, minor updates.

## Когда использовать
- Как часть maintenance workflow (nightly)
- После security advisory
- Еженедельно для minor updates

## Входные данные
- `mode`: "patch" | "minor" | "audit-only" (default: "patch")
- `dryRun`: только показать что будет обновлено (default: false)

## Что делает

### 1. Security Audit
```bash
cd /root/.claude && pnpm audit 2>/dev/null || true
```

### 2. Auto-fix vulnerabilities
```bash
cd /root/.claude && pnpm audit --fix 2>/dev/null || true
```

### 3. Patch Updates (safe)
```bash
# Только patch версии (1.2.3 -> 1.2.4)
cd /root/.claude && pnpm update --latest=false 2>/dev/null || true
```

### 4. Check outdated
```bash
cd /root/.claude && pnpm outdated 2>/dev/null | head -20
```

### 5. Verify after update
```bash
cd /root/.claude && pnpm build && pnpm test
```

## Ограничения
- Только PATCH updates автоматически (1.2.x)
- Minor/Major требуют ручного подтверждения
- Если build/test fail — откат через git checkout pnpm-lock.yaml
- Максимум 5 пакетов за раз

## Rollback при ошибке
```bash
git checkout pnpm-lock.yaml
pnpm install
```

## Выход
```json
{
  "vulnerabilities": {
    "before": 3,
    "after": 0
  },
  "packagesUpdated": 2,
  "buildPassed": true,
  "testsPassed": true
}
```
