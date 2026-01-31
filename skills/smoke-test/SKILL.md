# Smoke Test Skill

Comprehensive health check system with REAL API calls and auto-fix capability.

## Usage

```bash
./run.sh [mode]
```

## Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| mode | check, fix, report | check | Operation mode |

## Modes

- **check** - Run all health checks, report issues
- **fix** - Run checks and auto-fix what's possible
- **report** - Generate detailed JSON report

## What Gets Tested

### 1. API Integrations (Real Calls)
- Telegram: `getMe()` - bot info
- Notion: `search("")` - API connectivity
- GitHub: `gh auth status`
- Perplexity: credentials check
- Other clients: `isAuthenticated()` check

### 2. Skills
- Each skill has `run.sh` and `SKILL.md`
- Skills with DRY_RUN support get executed

### 3. Workflows
- Each workflow has `workflow.json` and `WORKFLOW.md`
- JSON is valid

### 4. Build Health
- `pnpm build` passes
- No TypeScript errors

## Auto-Fix Capabilities

- Credential JSON syntax errors → attempt repair
- Missing execute permissions → `chmod +x`
- Broken builds → `pnpm install && pnpm build`
- Missing SKILL.md/WORKFLOW.md → create from template

## Output

```json
{
  "timestamp": "2024-01-26T08:00:00Z",
  "mode": "fix",
  "integrations": {
    "telegram": { "status": "ok", "latency_ms": 150 },
    "notion": { "status": "ok", "latency_ms": 200 },
    "github": { "status": "error", "message": "Not authenticated" }
  },
  "skills": {
    "passed": 8,
    "failed": 1,
    "fixed": 1
  },
  "workflows": {
    "passed": 5,
    "failed": 0
  },
  "build": {
    "status": "ok"
  },
  "fixes_applied": [
    "Added execute permission to skills/web-search/run.sh"
  ],
  "overall": "healthy"
}
```

## Exit Codes

- 0: All healthy (or fixed)
- 1: Issues found that couldn't be fixed
- 2: Infrastructure error
