# Elio OS — Governance v1.0

Rules that prevent documentation drift and architectural decay.

---

## 1. Adding a New Package

**Before writing code:**

1. Check `registry.yaml` — does this capability already exist?
2. Add entry to `registry.yaml` under the correct section
3. Decide location (see ADR-002):
   - Library → `packages/`
   - CLI tool → top-level
   - Service → `apps/`
4. Add to `pnpm-workspace.yaml` if new location
5. Run `npx tsx scripts/validate-registry.ts`

**After writing code:**

6. Verify validation passes
7. Update `CLAUDE.md` architecture diagram if new top-level dir

---

## 2. Adding Shared Utilities

**Canonical source: `packages/shared/` (`@elio/shared`)**

1. New utility → add to `packages/shared/src/`
2. Export from `packages/shared/src/index.ts`
3. Other packages import via `@elio/shared`
4. `mcp-server/src/utils/` files are **re-exports only** — never add new logic there

**Banned patterns:**
- Duplicating utility code across packages
- Adding new utils to `mcp-server/src/utils/` directly
- Creating `utils/` folders in individual packages for cross-cutting concerns

---

## 3. Adding a Workflow

Follow `WORKFLOW_STANDARD.md` checklist completely. Summary:

1. Add to `registry.yaml` workflows section
2. Code in `packages/{name}/`
3. Docs in `workflows/{name}/WORKFLOW.md`
4. Shell wrapper in `workflows/{name}/run.sh`
5. MCP adapter in `mcp-server/src/adapters/{name}/`
6. Use `@elio/shared` for resilience, logging, notifications

---

## 4. Script Promotion Policy

Scripts in `scripts/` that meet **3+ of these criteria** should become workflows:

- [ ] Has multiple stages (>2 distinct phases)
- [ ] Needs state tracking between stages
- [ ] Should send Telegram notifications
- [ ] Runs on a schedule
- [ ] Produces a deliverable (report, Notion page, etc.)
- [ ] Has error recovery logic
- [ ] Takes >5 minutes to run

**Current promotion candidates:**
- `consilium.ts`
- `day-review.ts`
- `system-loop.ts`

---

## 5. Registry Validation

### Manual
```bash
npx tsx scripts/validate-registry.ts
```

### CI (recommended setup)
Add to system-review workflow or cron:
```bash
# In nightly check
npx tsx scripts/validate-registry.ts || notify "Registry validation failed"
```

### What it checks
- All `package.json` files are registered in `registry.yaml`
- All paths in `registry.yaml` exist on filesystem
- No duplicate npm package names across workspace
- Reports errors (blocking) and warnings (informational)

---

## 6. Architecture Decision Records (ADRs)

Location: `docs/ADR-*.md`

| ADR | Title | Status |
|-----|-------|--------|
| ADR-001 | State Management Strategy | Accepted |
| ADR-002 | Package Location Convention | Accepted |

### When to Create an ADR
- Choosing between technologies
- Changing where data is stored
- Restructuring package layout
- Adding a new infrastructure dependency

### Format
```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated
**Context:** Why this decision is needed

## Decision
What we decided and why

## Consequences
Trade-offs and implications
```

---

## 7. Quarterly Audit Checklist

Run every 3 months (or add to system-review):

- [ ] `npx tsx scripts/validate-registry.ts` passes clean
- [ ] All workflows in registry have WORKFLOW.md
- [ ] No code duplication in `mcp-server/src/utils/` (should be re-exports)
- [ ] `CLAUDE.md` architecture diagram matches reality
- [ ] `scripts/README.md` is up to date
- [ ] No new top-level directories without ADR
- [ ] `pnpm-workspace.yaml` matches `registry.yaml` standalone_packages
- [ ] Dead code check: packages with no imports from other packages

---

## 8. Known Tech Debt

| Issue | Severity | Ticket |
|-------|----------|--------|
| `watchdog/` — loose scripts, no package.json | Low | — |
