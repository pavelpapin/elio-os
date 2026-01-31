# Auto-Test Skill

Automated testing system that validates MCP server, integrations, and core modules.

## Usage

```bash
./run.sh [scope]
```

## Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| scope | changed, full, quick | changed | Test scope to run |

## Scopes

- **quick** - Core sanity checks only (~10s)
- **changed** - Tests for recently modified files (~30s)
- **full** - Complete test suite (~2min)

## Output

JSON with test results:
```json
{
  "scope": "changed",
  "passed": 42,
  "failed": 0,
  "skipped": 3,
  "duration_ms": 28500,
  "failures": []
}
```

## Exit Codes

- 0: All tests passed
- 1: Some tests failed
- 2: Test infrastructure error
