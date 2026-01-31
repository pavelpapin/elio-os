# Docs Audit Skill

Проверка актуальности системных файлов документации. Числа, пути, структура должны соответствовать реальности.

## Когда использовать
- Как часть maintenance workflow (nightly)
- После рефакторинга архитектуры
- После добавления новых компонентов

## Системные файлы для проверки

| Файл | Что проверять |
|------|---------------|
| `CLAUDE.md` | Актуальность инструкций, списки skills/workflows |
| `WORKFLOW_STANDARD.md` | Existing workflows table |
| `registry.yaml` | Source of truth для всех сущностей |
| `STANDARDS.md` | Coding conventions |

## Проверки

### 1. Файлы существуют и не пустые
```bash
REQUIRED_FILES=(
  "CLAUDE.md"
  "WORKFLOW_STANDARD.md"
  "STANDARDS.md"
  "registry.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
  path="/root/.claude/$file"
  if [ ! -f "$path" ]; then
    echo "MISSING: $file"
  elif [ ! -s "$path" ]; then
    echo "EMPTY: $file"
  fi
done
```

### 2. registry.yaml соответствует реальности
```bash
# Подсчёт реальных компонентов
REAL_SKILLS=$(ls -d /root/.claude/skills/*/ 2>/dev/null | grep -v _template | wc -l)
REAL_WORKFLOWS=$(ls -d /root/.claude/workflows/*/ 2>/dev/null | grep -v _template | wc -l)
REAL_PACKAGES=$(ls -d /root/.claude/packages/*/ 2>/dev/null | wc -l)

echo "Skills folders: $REAL_SKILLS"
echo "Workflow folders: $REAL_WORKFLOWS"
echo "Packages: $REAL_PACKAGES"

# Проверить что каждый skill в registry имеет папку
# Проверить что каждый workflow в registry имеет папку
```

### 3. Упомянутые пути существуют
```bash
# Извлечь пути из документации
grep -oP '/root/.claude/[^\s\)\"]+' /root/.claude/CLAUDE.md | while read path; do
  if [ ! -e "$path" ]; then
    echo "INVALID_PATH: $path mentioned in CLAUDE.md but doesn't exist"
  fi
done
```

### 4. Консистентность между файлами
```bash
# CLAUDE.md, WORKFLOW_STANDARD.md, registry.yaml должны иметь одинаковые:
# - Список workflows
# - Список skills (основных)
# - Структуру директорий

# Workflows в registry.yaml
grep -E "^  [a-z].*:" /root/.claude/registry.yaml | grep -A1 "workflows:" | tail -n+2

# Workflows в CLAUDE.md
grep -E "^\| \`" /root/.claude/CLAUDE.md | grep -E "deep-research|system-review"
```

## Выход

```json
{
  "issues": [
    {
      "type": "inconsistency",
      "files": ["CLAUDE.md", "registry.yaml"],
      "message": "Workflow X in registry but not in CLAUDE.md",
      "fix": "Update CLAUDE.md or remove from registry"
    },
    {
      "type": "invalid_path",
      "file": "CLAUDE.md",
      "message": "/root/.claude/agents referenced but doesn't exist",
      "fix": "Remove reference"
    }
  ],
  "files_checked": 4,
  "score": 90
}
```

## Auto-fix (безопасные операции)

- Удалить упоминания несуществующих путей
- Обновить списки skills/workflows в документах

## НЕ auto-fix

- Добавление новой документации
- Изменение инструкций
- Удаление разделов
