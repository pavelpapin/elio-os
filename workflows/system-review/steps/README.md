# System Review Steps

This workflow uses **BullMQ execution**.

## How it works

1. `workflows/system-review/run.sh` submits job to BullMQ via elio CLI
2. Worker picks up the job and calls `packages/system-review/src/execute.ts`
3. execute.ts runs: Collect → Analyze → Fix → Verify → Report
4. Progress streamed via Redis, results saved to logs

## To add programmatic steps

Add new stages in `packages/system-review/src/execute.ts` and register gates in the orchestrator.
