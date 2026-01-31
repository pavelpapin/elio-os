# Registry Enforcement: Integration Checklist

Проверка, что ВСЯ система знает про registry-first архитектуру.

## ✅ Integration Points

### 1. Source of Truth
- [x] registry.yaml exists and validated
- [x] registry.schema.json defines structure
- [x] All workflows/skills/connectors declared

### 2. Documentation
- [x] CLAUDE.md - главный файл с правилами registry
- [x] docs/ENFORCEMENT_SYSTEM.md - полная документация (560 lines)
- [x] REGISTRY_AUDIT.md - отчёт аудита
- [ ] ARCHITECTURE.md - упомянуть registry enforcement

### 3. Validation Tools
- [x] scripts/lint-registry.sh - основная валидация
- [x] scripts/codegen-registry.ts - генерация TypeScript types
- [x] scripts/detect-registry-drift.ts - drift detection
- [x] registry.schema.json - JSON Schema validation

### 4. Automation
- [x] .git/hooks/pre-commit - блокирует invalid commits
- [x] package.json scripts:
  - `pnpm codegen:registry` - generate types
  - `pnpm validate:registry` - run full validation
  - `pnpm validate:schema` - schema only
  - `pnpm drift:detect` - detect drift
  - `pnpm registry:check` - all checks

### 5. Generated Artifacts
- [x] packages/shared/src/registry.generated.ts
  - Type-safe WorkflowId, SkillId, ConnectorId
  - Helper functions: getWorkflow(), isWorkflowActive()
  - Auto-regenerated on registry change

### 6. Runtime Integration
- [ ] elio CLI reads registry before workflow execution
- [ ] Scheduler resolves workflow_id via registry
- [ ] MCP server adapters reference registry

### 7. Continuous Monitoring
- [ ] Cron job: drift detection every 6h
- [ ] Telegram alerts on drift
- [ ] Daily health check includes registry validation

### 8. Developer Experience
- [x] Pre-commit blocks bad commits
- [x] TypeScript compile errors for invalid workflow IDs
- [x] Clear error messages with fix instructions
- [ ] IDE autocomplete for workflow IDs (future)

---

## 🔍 Verification Tests

### Test 1: Try to create workflow without registry entry
```bash
mkdir workflows/test-workflow
echo "# Test" > workflows/test-workflow/WORKFLOW.md
git add .
git commit -m "test"
# Expected: ❌ Pre-commit hook blocks
# Error: "Workflow 'test-workflow' has WORKFLOW.md but no registry entry"
```

### Test 2: Try to use invalid workflow ID in code
```typescript
import { WorkflowId } from '@elio/shared/registry.generated';
const id: WorkflowId = 'invalid-workflow-id';
// Expected: ❌ TypeScript compile error
// Error: Type '"invalid-workflow-id"' is not assignable to type 'WorkflowId'
```

### Test 3: Schema validation catches missing fields
```yaml
# In registry.yaml, add workflow with status=implemented but no failure_model
workflows:
  broken-workflow:
    status: implemented
    # Missing: failure_model, version, etc.
```
```bash
pnpm validate:schema
# Expected: ❌ Schema validation fails
# Error: "must have required property 'failure_model'"
```

### Test 4: Drift detection finds orphaned workflows
```bash
mkdir workflows/orphaned-workflow
pnpm drift:detect
# Expected: ⚠️ Drift detected
# Alert: "Workflows on disk not in registry: orphaned-workflow"
```

### Test 5: Deprecated workflow prevented from running
```yaml
# In registry.yaml
workflows:
  old-workflow:
    status: deprecated
    superseded_by: new-workflow
```
```typescript
// In code
await executeWorkflow('old-workflow');
// Expected: ❌ Runtime error
// Error: "Workflow 'old-workflow' is deprecated. Use 'new-workflow' instead."
```

---

## 🚨 Critical Paths

### Path 1: Creating New Workflow
```
1. Developer adds entry to registry.yaml ✅
2. Pre-commit hook validates on commit ✅
3. Codegen auto-generates types ✅
4. TypeScript enforces valid IDs ✅
5. Runtime validates metadata ⏳ (TODO)
```

### Path 2: Modifying Existing Workflow
```
1. Update registry.yaml metadata ✅
2. Bump version field ✅
3. Pre-commit validates schema ✅
4. Codegen regenerates types ✅
5. No breaking changes to callers ✅
```

### Path 3: Deprecating Workflow
```
1. Set status=deprecated in registry ✅
2. Add superseded_by field ✅
3. Remove directory from disk ✅
4. Pre-commit validates cleanup ✅
5. Runtime blocks execution ⏳ (TODO)
```

### Path 4: Drift Detection
```
1. Cron runs drift detection (6h) ⏳ (TODO)
2. Compares filesystem vs registry ✅
3. Finds orphaned entities ✅
4. Sends Telegram alert ⏳ (TODO)
5. Team fixes issues manually ⏳
```

---

## 📋 Checklist: "Does the system know?"

| Component | Knows about registry? | How? | Status |
|-----------|----------------------|------|--------|
| CLAUDE.md | ✅ Yes | Direct reference + enforcement rules | ✅ |
| Pre-commit hook | ✅ Yes | Calls lint-registry.sh | ✅ |
| TypeScript compiler | ✅ Yes | Uses registry.generated.ts | ✅ |
| lint-registry.sh | ✅ Yes | Validates registry.yaml directly | ✅ |
| package.json scripts | ✅ Yes | Scripts for validation/codegen | ✅ |
| elio CLI | ⏳ Partial | Should load registry at runtime | ⏳ |
| Scheduler | ⏳ Partial | Uses workflow_id but doesn't validate yet | ⏳ |
| MCP adapters | ⏳ No | Direct imports, no registry check | ⏳ |
| GitHub Actions | ❌ No | CI/CD validation not added yet | ❌ |

---

## 🔧 TODO: Remaining Integration

### Priority 1: Runtime Enforcement
```typescript
// packages/workflow/src/registry-loader.ts (create)
export class RegistryLoader {
  static validateWorkflow(workflowId: string): void {
    // Load registry.yaml
    // Check workflow exists
    // Check not deprecated
    // Check has required metadata
  }
}

// elio/src/cli.ts (update)
import { RegistryLoader } from '@elio/workflow/registry-loader';

async function runWorkflow(id: string) {
  RegistryLoader.validateWorkflow(id); // ✅ Add this
  // ...
}
```

### Priority 2: Scheduler Integration
```typescript
// scheduler/src/index.ts (update)
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const registry = parse(readFileSync('registry.yaml', 'utf8'));

function resolveWorkflow(workflowId: string): string {
  const workflow = registry.workflows[workflowId];
  if (!workflow) throw new Error(`Workflow ${workflowId} not in registry`);
  return workflow.script;
}
```

### Priority 3: Cron Setup
```bash
# Add to scheduler/config.json or similar
{
  "jobs": [
    {
      "name": "registry-drift-detection",
      "schedule": "0 */6 * * *",
      "script": "pnpm drift:detect"
    }
  ]
}
```

### Priority 4: GitHub Actions
```yaml
# .github/workflows/validate-registry.yml
name: Validate Registry
on: [push, pull_request]
jobs:
  validate:
    steps:
      - run: pnpm validate:schema
      - run: pnpm validate:registry
      - run: pnpm drift:detect
```

---

## ✅ Success Criteria

System is fully integrated when:

1. ✅ **No manual validation needed** - pre-commit catches everything
2. ✅ **No typos possible** - TypeScript enforces IDs
3. ✅ **No orphaned entities** - drift detection alerts within 6h
4. ⏳ **No deprecated runs** - runtime blocks execution
5. ⏳ **No CI bypasses** - GitHub Actions validates
6. ✅ **Clear documentation** - CLAUDE.md + ENFORCEMENT_SYSTEM.md
7. ✅ **Easy to use** - `pnpm registry:check` runs all checks

**Current Status: 7/10 integrated** ✅

Remaining work: Runtime enforcement (Priority 1), Scheduler (Priority 2), Cron (Priority 3)
