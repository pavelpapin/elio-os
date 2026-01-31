# План: Полная реорганизация Elio OS

## Цель
Привести документацию в соответствие с реальностью. Архитектура правильная (packages/ = код, workflows/ = docs), проблема в том что CLAUDE.md врёт о capabilities.

---

## Архитектура (уже правильная)

```
packages/{name}/     <- КОД (TypeScript, @elio/{name})
workflows/{name}/    <- ДОКУМЕНТАЦИЯ (WORKFLOW.md, prompts, run.sh)
skills/{name}/       <- ТОЛЬКО ДОКУМЕНТАЦИЯ (SKILL.md)
mcp-server/adapters/ <- CONNECTORS (MCP интерфейс)
```

Это по стандарту WORKFLOW_STANDARD.md v4.0. Код остаётся в packages/.

---

## Фаза 1: CLAUDE.md — честные capabilities

### 1.1 Секция "Available Skills"
**Сейчас:**
```markdown
| Skill | Purpose | When to Use |
| web-search | ... | ... |
| deep-research | ... | ... |
| person-research | ... | ... |
| youtube-transcript | ... | ... |
| code-review | ... | ... |
```

**Проблема:** Нет указания статуса, youtube-transcript — prompt-only

**Изменить на:**
```markdown
| Skill | Purpose | Status |
| web-search | Search internet | ✅ implemented |
| person-research | OSINT on people | ✅ implemented |
| code-review | Code quality audit | ✅ implemented |
| system-review | System health check | ✅ implemented |
| youtube-transcript | Video transcripts | 📝 prompt-only |
| deep-research | → see Agents | — |
```

### 1.2 Секция "Available Workflows"
**Сейчас:**
```markdown
| telegram-inbox | Process Telegram messages |
| email-inbox | Process email |
| meeting-prep | Prepare for meeting |
```

**Проблема:** Эти 3 — только WORKFLOW.md файлы, кода нет!

**Изменить на:**
```markdown
### Implemented Workflows
| Workflow | Purpose | Pattern |
| deep-research | Comprehensive research reports | Orchestrator |
| system-review | System health check & fixes | Hybrid |
| person-research | OSINT research on people | Orchestrator |

### Planned Workflows (docs only)
telegram-inbox, email-inbox, meeting-prep, cold-outreach, и др.
See registry.yaml for full list.
```

### 1.3 Секция "Elio Team"
**Сейчас:**
```markdown
| CTO | Daily 03:00 | Code quality | /cto |
| CPO | Daily 03:30 | Product improvements | /cpo |
```

**Действие:** УДАЛИТЬ ВСЮ СЕКЦИЮ из CLAUDE.md

Team members не существуют, не будут существовать, не нужны.

### 1.4 Agents секция
**Сейчас:** deep-research описан как работающий (это правда)

**Оставить как есть**, он действительно implemented.

---

## Фаза 2: registry.yaml — проверить статусы

### 2.1 Проверить что все `status: implemented` реальные
Ожидаемые implemented:
- deep-research ✅
- system-review ✅
- person-research ✅

### 2.2 Убедиться planned помечены как planned
- telegram-inbox
- email-inbox
- meeting-prep
- и другие

### 2.3 Удалить секцию team если есть
Team members удаляются из системы полностью.

---

## Фаза 3: Team — УДАЛИТЬ ПОЛНОСТЬЮ

### 3.1 Удалить team/ директорию
```bash
rm -rf /root/.claude/team/
```

### 3.2 Удалить упоминания team из registry.yaml
Если есть секция team_members — удалить.

### 3.3 Убрать team из ARCHITECTURE.md
Если team упоминается — удалить.

---

## Фаза 4: Planned workflows — пометить статус

### 4.1 Workflow директории без кода
Эти имеют только WORKFLOW.md (нет packages/{name}/):
- workflows/telegram-inbox/
- workflows/email-inbox/
- workflows/meeting-prep/
- workflows/cold-outreach/
- workflows/consilium/
- workflows/nightly-consilium/
- и другие

**Действие:** Добавить в начало каждого WORKFLOW.md:
```markdown
> ⚠️ **Status: PLANNED** — Documentation only, code not implemented.
```

---

## Фаза 5: Дополнить incomplete workflows

### 5.1 Состояние workflows

| Workflow | packages/ код | workflows/ run.sh | Статус |
|----------|---------------|-------------------|--------|
| deep-research | ✅ | ✅ | **COMPLETE** |
| system-review | ✅ | ❌ | needs run.sh |
| person-research | ✅ | ❌ | needs run.sh |
| остальные 9 | ❌ | ❌ | planned |

### 5.2 Добавить run.sh для system-review и person-research
По стандарту WORKFLOW_STANDARD.md каждый workflow должен иметь run.sh.

**Создать:** `workflows/system-review/run.sh`
**Создать:** `workflows/person-research/run.sh`

(По шаблону из deep-research)

---

## Файлы для изменения

| Файл | Действие |
|------|----------|
| `/root/.claude/CLAUDE.md` | Обновить skills, workflows. УДАЛИТЬ team секцию |
| `/root/.claude/registry.yaml` | Проверить/обновить статусы. Удалить team если есть |
| `/root/.claude/ARCHITECTURE.md` | Удалить упоминания team |
| `/root/.claude/team/` | **УДАЛИТЬ ДИРЕКТОРИЮ ПОЛНОСТЬЮ** |
| `workflows/telegram-inbox/WORKFLOW.md` | Добавить planned статус |
| `workflows/email-inbox/WORKFLOW.md` | Добавить planned статус |
| `workflows/meeting-prep/WORKFLOW.md` | Добавить planned статус |
| + другие planned workflows | Добавить planned статус |

---

## Verification

После выполнения:
1. Прочитать CLAUDE.md — должен честно отражать что работает
2. `grep "status: implemented" registry.yaml` — только реальные
3. **team/ директория не должна существовать**
4. **CLAUDE.md не должен упоминать team/CTO/CPO**
5. Planned workflows должны иметь warning в начале
6. Никаких broken imports (код не трогаем)
