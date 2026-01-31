# ADR-002: Package Location Convention

**Date:** 2026-01-28
**Status:** Accepted
**Context:** Packages are split between `packages/`, top-level directories, and `apps/`

---

## Decision

### Three Package Locations

| Location | Convention | When to Use | Examples |
|----------|-----------|-------------|---------|
| `packages/` | `@elio/{name}` | Libraries, workflow code, shared utilities | shared, clients, db, deep-research |
| Top-level | `@elio/{name}` | Standalone CLIs with their own entry point | elio/, gtd/, scheduler/ |
| `apps/` | `@elio/{name}` | Long-running services/daemons | apps/worker/ |

### Rules

1. **Libraries** (imported by others) → `packages/`
2. **CLI tools** (run directly, have `bin` in package.json) → top-level
3. **Services** (long-running, deployed independently) → `apps/`
4. **All packages** must be in `pnpm-workspace.yaml`
5. **All packages** must be in `registry.yaml`

### Current State

**Correct placements:**
- `packages/shared/` — library ✅
- `packages/deep-research/` — library (imported by MCP adapter) ✅
- `elio/` — CLI tool ✅
- `gtd/` — CLI tool ✅
- `apps/worker/` — service ✅

**Needs review:**
- `core/` — has `@elio/shared` name collision, likely obsolete
- `headless/` — CLI ✅ (correct placement)
- `context-graph/` — CLI ✅ (correct placement)
- `self-improvement/` — CLI ✅ (correct placement)

### Action Items

1. Resolve `core/` naming conflict (rename or delete)
2. Add `figma-plugin/` and `watchdog/` to workspace if active, or archive

---

## Consequences

- Clear decision path for new packages
- No more ambiguity about where to put new code
- All locations documented in registry.yaml `standalone_packages` section
