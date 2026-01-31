# Plan: Deep Research — Hybrid TypeScript Orchestrator

## Проблема

Deep Research = 100% prompt-driven. 30+ markdown файлов, 0 TypeScript. Stage gates не enforced. Consilium (3 модели) — pseudocode. State теряется при crash. Observability не подключена.

## Решение

TypeScript state machine-оркестратор. LLM остаётся для thinking (discovery, synthesis, report). TypeScript берёт на себя: порядок стейджей, gate validation, state persistence, retries, Telegram, Notion delivery, consilium vote synthesis.

## Архитектура

```
TypeScript Orchestrator          LLM (Claude/OpenAI/Groq)
────────────────────────         ──────────────────────────
Load state from disk        →
Select next stage           →
Load prompt .md + inject    →    Generate questions / plan / analysis
Validate output (Zod)       ←    Return JSON
Check gate                  →
Save state to disk          →
Notify Telegram             →
Loop or exit                →
```

## Файловая структура

```
agents/deep-research/
├── AGENT.md                    # Без изменений
├── config.json                 # NEW — timeouts, models, SLA
├── prompts/                    # Без изменений — .md промпты
├── stages/                     # Без изменений — описания стейджей
├── quality/                    # Без изменений
├── src/
│   ├── types.ts                # Zod schemas для всех stage I/O
│   ├── state.ts                # Persistence: save/load PipelineState
│   ├── llm.ts                  # Claude (shell), OpenAI (HTTP), Groq (HTTP)
│   ├── gates.ts                # Pure functions: stage → boolean
│   ├── notify.ts               # Telegram wrapper
│   ├── runner.ts               # State machine orchestrator
│   ├── consilium.ts            # 3-model review + deterministic synthesis
│   └── stages/
│       ├── discovery.ts        # Interactive — pause/resume
│       ├── planning.ts         # Claude → ResearchPlan
│       ├── collection.ts       # 5 parallel agents via Claude+MCP
│       ├── factcheck.ts        # Claude cross-references facts
│       ├── synthesis.ts        # Claude → findings + recs
│       ├── devils-advocate.ts  # Claude → risks
│       ├── report.ts           # Claude markdown + Notion create
│       └── review.ts           # Calls consilium.ts
├── tests/
│   ├── types.test.ts
│   ├── gates.test.ts
│   └── state.test.ts
└── run.sh                      # Entrypoint: bun run src/runner.ts
```

## Ключевые типы

### PipelineState (сохраняется на диск)

```typescript
{
  run_id: string;
  topic: string;
  current_stage: StageName;           // 'discovery' | ... | 'review' | 'done'
  started_at: string;
  updated_at: string;
  iteration: number;                  // review retry counter
  max_iterations: number;             // default 2
  status: 'running' | 'paused_for_input' | 'completed' | 'failed';
  stage_outputs: {
    discovery?: ResearchBrief;
    planning?: ResearchPlan;
    collection?: CollectionResult;
    factcheck?: FactCheckResult;
    synthesis?: SynthesisResult;
    devils_advocate?: DevilsAdvocateResult;
    report?: ReportResult;            // { notion_url, page_id, block_count }
    review?: ConsiliumResult;
  };
  error?: string;
}
```

State path: `/root/.claude/logs/agents/deep-research/{run_id}/state.json`
Atomic write: write to `.tmp`, rename.

### Stage Output Schemas (каждый stage возвращает Zod-validated JSON)

| Stage | Output Schema | Key Fields |
|-------|--------------|------------|
| discovery | ResearchBriefSchema | topic, goal, success_criteria, confirmed_by_user: true |
| planning | ResearchPlanSchema | subtopics[], agents[], quality_criteria |
| collection | CollectionResultSchema | agents[].facts[], agents[].insights[] |
| factcheck | FactCheckResultSchema | verified_facts[], unverified_facts[], verification_stats |
| synthesis | SynthesisResultSchema | executive_summary, key_findings[], recommendations[] (≥3) |
| devils_advocate | DevilsAdvocateSchema | risks[] (≥1), counterarguments[], blind_spots[] |
| report | ReportResultSchema | notion_url, page_id, block_count (≥15) |
| review | ConsiliumResultSchema | final_verdict, consensus_score, model_scores |

## Gates (чистые функции)

| Gate | Условие | При fail |
|------|---------|----------|
| discovery → planning | Brief valid + confirmed_by_user === true | Stop, wait for input |
| planning → collection | subtopics.length > 0 | Error |
| collection → factcheck | ≥3 agents returned data | Error (graceful: 3 of 5 ok) |
| factcheck → synthesis | verified_facts.length > 0 | Error |
| synthesis → devils_advocate | recommendations.length ≥ 3 | Error |
| devils_advocate → report | risks.length > 0 | Error |
| report → review | notion_url exists + block_count ≥ 15 | Retry (max 3) |
| review → done | verdict === 'approved' | Loop to synthesis (max 2x) |

## LLM Abstraction

```typescript
interface LLMCallOptions {
  provider: 'claude' | 'openai' | 'groq';
  prompt: string;           // loaded from .md, variables injected
  input: string;            // JSON context
  outputSchema?: ZodSchema; // validate response
  maxRetries?: number;      // default 2
  timeoutMs?: number;
}
```

- **Claude**: `echo $PROMPT | claude --print` через Bun.spawn
- **OpenAI**: HTTP POST to `api.openai.com/v1/chat/completions` (gpt-4o)
- **Groq**: HTTP POST to `api.groq.com/openai/v1/chat/completions` (llama-3.1-70b)
- Fallback: если нет OPENAI_API_KEY/GROQ_API_KEY → consilium degraded to Claude-only

## Consilium (Stage 7)

```
Round 1: 3 модели параллельно → 3 независимых ревью (Promise.allSettled)
Round 2: каждая модель видит чужие ревью → пересмотр (Promise.allSettled)
Round 3: ДЕТЕРМИНИСТИЧЕСКИЙ синтез в TypeScript:
  - 2/3 approved → approved
  - 2/3 rejected → rejected
  - else → needs_revision
```

Если needs_revision и iteration < max_iterations → loop back к synthesis с unified_tz.

## Discovery (Interactive)

Stage 0 особенный — нужен input от пользователя:

1. Runner вызывает `discovery.ts`
2. Claude генерирует вопросы (10 шт) из промпта
3. Runner сохраняет state как `paused_for_input`, выводит вопросы
4. Пользователь отвечает
5. Runner вызывается с `--resume {run_id} --input answers.json`
6. Claude формирует Brief из ответов
7. Brief показывается пользователю для подтверждения
8. Gate: `confirmed_by_user === true`

## Runner (основной цикл)

```typescript
const STAGES: StageName[] = [
  'discovery', 'planning', 'collection', 'factcheck',
  'synthesis', 'devils_advocate', 'report', 'review'
];

for (let i = stageIndex; i < STAGES.length; i++) {
  const stage = STAGES[i];
  notify(`Stage ${i+1}/8: ${stage}`);
  startStage(runId, stage);

  const result = await executeStage(stage, state);
  const validated = validateOutput(stage, result);
  const gate = checkGate(stage, validated, state);

  if (!gate.passed) {
    if (stage === 'review' && gate.reason === 'needs_revision' && state.iteration < 2) {
      state.iteration++;
      state.current_stage = 'synthesis';
      saveState(state);
      i = STAGES.indexOf('synthesis') - 1;
      continue;
    }
    throw new Error(`Gate failed: ${stage} — ${gate.reason}`);
  }

  state.stage_outputs[stage] = validated;
  state.current_stage = STAGES[i + 1] ?? 'done';
  saveState(state);
  completeStage(runId, stage);
}
```

## Что детерминистическое vs. LLM

| Ответственность | TypeScript | LLM |
|----------------|-----------|-----|
| Stage ordering | ✅ | |
| Gate validation | ✅ (Zod) | |
| State persistence | ✅ | |
| Crash recovery | ✅ | |
| Retry + backoff | ✅ | |
| Telegram notifications | ✅ | |
| Notion page creation | ✅ (MCP call) | |
| Notion verification | ✅ (block count) | |
| Consilium vote synthesis | ✅ (majority) | |
| Discovery questions | | ✅ Claude |
| Research planning | | ✅ Claude |
| Data collection | Hybrid: TS orchestrates | ✅ Claude + MCP tools |
| Fact checking | | ✅ Claude |
| Synthesis + recs | | ✅ Claude |
| Devil's advocate | | ✅ Claude |
| Report markdown | | ✅ Claude |
| Quality review | | ✅ Claude + OpenAI + Groq |

## Порядок реализации

1. `types.ts` — все Zod schemas (foundation)
2. `state.ts` — persistence
3. `gates.ts` — gate functions
4. `llm.ts` — abstraction (Claude shell + HTTP for OpenAI/Groq)
5. `notify.ts` — Telegram
6. `config.json`
7. `stages/planning.ts` — simplest stage, test LLM integration
8. `stages/collection.ts` — parallel agents
9. `stages/factcheck.ts`, `synthesis.ts`, `devils-advocate.ts`
10. `stages/report.ts` — Notion integration
11. `consilium.ts` + `stages/review.ts`
12. `stages/discovery.ts` — interactive pause/resume
13. `runner.ts` — ties everything together
14. `run.sh` — entrypoint
15. Tests

## Подключение observability

```typescript
import { startRun, startStage, completeStage, logIssue, completeRun } from '/root/.claude/core/observability/index.js';
```

Каждый stage: `startStage()` → execute → `completeStage()`.
При ошибках: `logIssue(runId, 'data_source_failed', ...)`.
В конце: `completeRun(runId, status, deliverable)`.

## Верификация

После реализации:
1. `bun run src/runner.ts "test topic"` — проверить что stages работают
2. Проверить state.json создаётся и обновляется
3. Убить процесс, перезапустить с `--resume` — проверить recovery
4. Проверить Telegram notifications на каждом stage
5. Проверить Notion page создаётся
6. Запустить consilium (если есть OpenAI key) — проверить 3 модели
7. `bun test` — unit tests для types, gates, state
