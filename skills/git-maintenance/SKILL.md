# Git Maintenance Skill

Очистка git: удаление merged веток, gc, prune.

## Когда использовать
- Как часть maintenance workflow
- После мержа PR
- Еженедельно

## Входные данные
- `dryRun`: только показать что будет удалено (default: false)
- `protectedBranches`: ветки которые не удалять (default: ["main", "master", "develop"])

## Что делает

### 1. Remove merged local branches
```bash
cd /root/.claude
git branch --merged main | grep -v "main\|master\|develop\|\*" | xargs -r git branch -d
```

### 2. Prune remote tracking branches
```bash
git remote prune origin 2>/dev/null || true
```

### 3. Git garbage collection
```bash
git gc --auto
```

### 4. Clean untracked files (осторожно!)
```bash
# Только в определённых директориях
git clean -fd /root/.claude/.tmp 2>/dev/null || true
```

### 5. Verify repo health
```bash
git fsck --quick
```

## Ограничения
- НИКОГДА не удалять: main, master, develop
- НЕ использовать git clean в корне проекта
- НЕ force push
- НЕ rewrite history

## Проверка перед очисткой
```bash
git branch -a  # Список всех веток
git stash list  # Проверить есть ли stash
```

## Выход
```json
{
  "branchesDeleted": 3,
  "pruned": true,
  "gcRun": true,
  "repoHealthy": true
}
```
