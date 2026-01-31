# Elio Workflows

> **⚠️ REGISTRY:** Полный список сущностей — `/root/.claude/registry.yaml`. Проверь перед созданием нового workflow.
> **Standard:** `/root/.claude/WORKFLOW_STANDARD.md`

Multi-step orchestrations with state, retry, and dependencies.

## Workflows vs Packages

| Concept | Location | Contains | Analogy |
|---------|----------|----------|---------|
| **Workflow** | `workflows/{name}/` | Instructions, steps, docs | Recipe (what to cook) |
| **Package** | `packages/{name}/` | TypeScript code, libraries | Tools (knives, pans) |

A **workflow** can use multiple **packages**.
A **package** can be used by multiple **workflows**.

Workflows and packages have matching names (e.g. `workflows/code-review` uses `packages/code-review`),
but they serve different purposes:
- **Workflow** = WHAT to do (declarative: steps, order, inputs/outputs)
- **Package** = HOW to do it (imperative: TypeScript functions)

## Structure

```
/workflows/
├── {workflow-name}/
│   ├── workflow.json    # Definition: steps, inputs, outputs
│   ├── WORKFLOW.md      # Documentation + Dependencies section
│   └── steps/           # Step implementations (optional)
│       ├── 01-step.ts
│       └── ...
```

## Dependencies

Each WORKFLOW.md has a `## Dependencies` section listing which packages it uses.
Example from system-review:

```markdown
## Dependencies
| Package | Role |
|---------|------|
| @elio/system-review | Core analysis |
| @elio/code-review | Security scan (used by system-review) |
```

## Dependency Graph

```
code-review        → @elio/code-review (standalone)
deep-research      → @elio/deep-research + 15 API clients
system-review      → @elio/system-review → @elio/code-review
person-research    → @elio/person-research → clients/{perplexity,linkedin,twitter,github}
product-review     → @elio/product-review (standalone)
maintenance        → @elio/maintenance + @elio/skills
```

## workflow.json Format

```json
{
  "name": "workflow-name",
  "version": "1.0.0",
  "description": "What this workflow does",
  "inputs": {
    "param1": { "type": "string", "required": true },
    "param2": { "type": "string", "default": "value" }
  },
  "steps": [
    {
      "id": "step-1",
      "name": "Step Name",
      "run": "steps/01-step.ts",
      "inputs": { "from": "workflow.inputs.param1" },
      "outputs": ["result1"]
    },
    {
      "id": "step-2",
      "name": "Step 2",
      "run": "steps/02-step.ts",
      "inputs": { "data": "steps.step-1.result1" },
      "dependsOn": ["step-1"]
    }
  ],
  "outputs": {
    "final": "steps.step-2.output"
  }
}
```

## Available Workflows

**Current list:** `ls /root/.claude/workflows/`

Each workflow has `WORKFLOW.md` with documentation and Dependencies section.

## Running Workflows

```bash
# Via MCP
elio_executor_run_workflow({ workflow: "...", input: {...} })

# Manual: read and follow instructions
cat /root/.claude/workflows/{name}/WORKFLOW.md
```

## Difference from Skills

| Aspect | Skill | Workflow |
|--------|-------|----------|
| Steps | 1 (atomic) | Many |
| State | None | Persisted |
| Retry | No | Yes |
| Async | Sync | Async (BullMQ) |
| Use case | Single operation | Complex orchestration |
