# Code Cleanup Skill

Автоматическая очистка кода: lint fixes, удаление console.log, форматирование.

## Когда использовать
- Как часть maintenance workflow
- После code review для автоисправлений
- Перед релизом

## Входные данные
- `path`: путь для очистки (default: `/root/.claude`)
- `dryRun`: только показать что будет изменено (default: false)
- `maxChanges`: максимум файлов для изменения (default: 10)

## Что делает

### 1. ESLint Auto-fix
```bash
cd /root/.claude && pnpm lint --fix 2>/dev/null || true
```

### 2. Remove console.log (кроме error)
```bash
# Найти файлы с console.log
grep -r "console\.log" --include="*.ts" /root/.claude/packages /root/.claude/mcp-server/src \
  | grep -v node_modules | grep -v ".test." | head -20

# Удалить (осторожно, только явные debug логи)
# НЕ удалять console.error, console.warn
```

### 3. Remove unused imports
```bash
# TypeScript compiler найдёт unused imports
cd /root/.claude && pnpm build 2>&1 | grep "is declared but" | head -10
```

### 4. Format with Prettier (если есть)
```bash
cd /root/.claude && pnpm format 2>/dev/null || true
```

## Ограничения
- Максимум `maxChanges` файлов за раз
- НЕ трогать: secrets/, node_modules/, .git/
- НЕ удалять console.error/warn
- После изменений запускать `pnpm build` для проверки

## Выход
```json
{
  "filesChanged": 5,
  "lintFixed": 3,
  "consoleLogsRemoved": 2,
  "buildPassed": true
}
```
