-- Migration 005: Add trigger_reason to workflow_runs for observability
-- Answers "why did this run?" (check 9 of integrity audit)

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS trigger_reason TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS replay_safe BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN workflow_runs.trigger_reason IS 'Why this run was started: manual | schedule | webhook | retry';
COMMENT ON COLUMN workflow_runs.replay_safe IS 'Whether this workflow is safe to re-run (from registry)';
