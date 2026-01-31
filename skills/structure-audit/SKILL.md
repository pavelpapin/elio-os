# Structure Audit Skill

Проверка соответствия структуры проекта архитектуре. Находит файлы не на своих местах.

## Когда использовать
- Как часть system-review (nightly)
- После рефакторинга
- Когда "что-то не так, но непонятно что"

## Что проверяет

### 1. Архитектурные правила

```
ПРАВИЛО: Connector без Adapter = мёртвый код
CHECK: Каждый packages/connectors/src/{name}/ должен иметь mcp-server/src/adapters/{name}/

ПРАВИЛО: Skill = атомарная операция
CHECK: skills/{name}/ должен иметь SKILL.md

ПРАВИЛО: Workflow = multi-step orchestration
CHECK: workflows/{name}/ должен иметь workflow.json И WORKFLOW.md

ПРАВИЛО: Config отдельно от логики
CHECK: Конфиги только в config/, secrets/
```

### 2. Проверки структуры

```bash
# Orphan connectors (есть connector, нет adapter)
for dir in /root/.claude/packages/connectors/src/*/; do
  name=$(basename "$dir")
  [ "$name" = "index.ts" ] && continue
  if [ ! -d "/root/.claude/mcp-server/src/adapters/$name" ]; then
    echo "ORPHAN CONNECTOR: $name (no adapter)"
  fi
done

# Orphan adapters (есть adapter, нет connector/integration)
for dir in /root/.claude/mcp-server/src/adapters/*/; do
  name=$(basename "$dir")
  [ "$name" = "index.ts" ] && continue
  if [ ! -d "/root/.claude/packages/connectors/src/$name" ] && \
     [ ! -d "/root/.claude/mcp-server/src/integrations/$name" ]; then
    echo "ORPHAN ADAPTER: $name (no connector or integration)"
  fi
done

# Incomplete skills (нет SKILL.md)
for dir in /root/.claude/skills/*/; do
  name=$(basename "$dir")
  [ "$name" = "_template" ] && continue
  if [ ! -f "$dir/SKILL.md" ]; then
    echo "INCOMPLETE SKILL: $name (no SKILL.md)"
  fi
done

# Incomplete workflows (нет workflow.json или WORKFLOW.md)
for dir in /root/.claude/workflows/*/; do
  name=$(basename "$dir")
  [ "$name" = "_template" ] && continue
  if [ ! -f "$dir/workflow.json" ]; then
    echo "INCOMPLETE WORKFLOW: $name (no workflow.json)"
  fi
  if [ ! -f "$dir/WORKFLOW.md" ]; then
    echo "INCOMPLETE WORKFLOW: $name (no WORKFLOW.md)"
  fi
done
```

### 3. Файлы не на месте

```bash
# TypeScript файлы в корне (должны быть в packages/ или mcp-server/)
find /root/.claude -maxdepth 1 -name "*.ts" -type f

# Конфиги вне config/
find /root/.claude -maxdepth 1 -name "*.json" -type f | grep -v package

# Скрипты вне scripts/
find /root/.claude -maxdepth 1 -name "*.sh" -type f
```

### 4. Устаревшие директории

```bash
# Проверить наличие deprecated структур
DEPRECATED=(
  "/root/.claude/team"           # Replaced by reviews
  "/root/.claude/agents"         # Replaced by workflows
  "/root/.claude/core"           # Should be in packages/
)

for dir in "${DEPRECATED[@]}"; do
  if [ -d "$dir" ]; then
    echo "DEPRECATED: $dir still exists"
  fi
done
```

### 5. Дубликаты конфигов

```bash
# Найти похожие конфиги
find /root/.claude -name "*.json" -path "*/config/*" | while read f; do
  basename "$f"
done | sort | uniq -d
```

### 6. Export consistency

```bash
# Проверить что все connectors экспортируются в package.json
cd /root/.claude/packages/connectors
for dir in src/*/; do
  name=$(basename "$dir")
  [ "$name" = "index.ts" ] && continue
  if ! grep -q "\"\./$name\"" package.json; then
    echo "NOT EXPORTED: connector $name not in package.json exports"
  fi
done
```

## Выход

```json
{
  "violations": [
    {
      "type": "orphan_connector",
      "path": "packages/connectors/src/foo",
      "message": "Connector 'foo' has no adapter",
      "fix": "Create mcp-server/src/adapters/foo/ or delete connector"
    },
    {
      "type": "incomplete_skill",
      "path": "skills/bar",
      "message": "Skill 'bar' missing SKILL.md",
      "fix": "Add SKILL.md documentation"
    },
    {
      "type": "wrong_location",
      "path": "/root/.claude/some-script.sh",
      "message": "Script in root, should be in scripts/",
      "fix": "mv /root/.claude/some-script.sh /root/.claude/scripts/"
    },
    {
      "type": "deprecated_dir",
      "path": "/root/.claude/team",
      "message": "Deprecated directory still exists",
      "fix": "Delete or migrate content"
    }
  ],
  "score": 85,
  "summary": "4 violations found"
}
```

## Auto-fix (safe operations)

Некоторые проблемы можно исправить автоматически:

```bash
# Move misplaced scripts
mv /root/.claude/*.sh /root/.claude/scripts/ 2>/dev/null || true

# Create missing SKILL.md from template
for dir in /root/.claude/skills/*/; do
  if [ ! -f "$dir/SKILL.md" ]; then
    cp /root/.claude/skills/_template/SKILL.md "$dir/"
    echo "Created SKILL.md for $(basename $dir)"
  fi
done
```

## НЕ auto-fix (требует решения)

- Orphan connectors (может быть WIP)
- Deprecated directories (может содержать нужное)
- Missing workflow steps
