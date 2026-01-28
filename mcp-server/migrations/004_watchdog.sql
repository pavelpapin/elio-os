-- Elio OS Watchdog Schema
-- Self-healing system: heartbeats + repair tracking

-- ============ Watchdog Heartbeats ============
-- Every scheduled task writes a heartbeat when it starts/completes
-- External watchdog (Make) checks these to detect missed runs

CREATE TABLE IF NOT EXISTS watchdog_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_name TEXT NOT NULL,
  expected_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'expected'
    CHECK (status IN ('expected', 'started', 'completed', 'failed', 'missed', 'repaired')),
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_heartbeats_task ON watchdog_heartbeats(task_name, expected_at DESC);
CREATE INDEX idx_heartbeats_status ON watchdog_heartbeats(status) WHERE status IN ('expected', 'started', 'missed');
CREATE INDEX idx_heartbeats_expected ON watchdog_heartbeats(expected_at DESC);

-- ============ Watchdog Repair Log ============
-- Tracks all repair attempts

CREATE TABLE IF NOT EXISTS watchdog_repairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  heartbeat_id UUID REFERENCES watchdog_heartbeats(id),
  task_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('retry', 'restart_worker', 'escalate', 'skip')),
  attempt INTEGER NOT NULL DEFAULT 1,
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'pending')),
  diagnosis JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repairs_heartbeat ON watchdog_repairs(heartbeat_id);
CREATE INDEX idx_repairs_task ON watchdog_repairs(task_name, created_at DESC);

-- ============ Functions ============

-- Create expected heartbeat for upcoming scheduled task
-- Called by cron or Make before the task is due
CREATE OR REPLACE FUNCTION create_expected_heartbeat(
  p_task_name TEXT,
  p_expected_at TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO watchdog_heartbeats (task_name, expected_at, status)
  VALUES (p_task_name, p_expected_at, 'expected')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Mark heartbeat as started (called by task at startup)
CREATE OR REPLACE FUNCTION heartbeat_start(
  p_task_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Find the most recent expected heartbeat for this task
  UPDATE watchdog_heartbeats
  SET status = 'started', started_at = NOW()
  WHERE id = (
    SELECT id FROM watchdog_heartbeats
    WHERE task_name = p_task_name
      AND status = 'expected'
    ORDER BY expected_at DESC
    LIMIT 1
  )
  RETURNING id INTO v_id;

  -- If no expected heartbeat, create one
  IF v_id IS NULL THEN
    INSERT INTO watchdog_heartbeats (task_name, expected_at, started_at, status)
    VALUES (p_task_name, NOW(), NOW(), 'started')
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Mark heartbeat as completed
CREATE OR REPLACE FUNCTION heartbeat_complete(
  p_task_name TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  UPDATE watchdog_heartbeats
  SET status = 'completed', completed_at = NOW(), metadata = p_metadata
  WHERE id = (
    SELECT id FROM watchdog_heartbeats
    WHERE task_name = p_task_name
      AND status = 'started'
    ORDER BY started_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Mark heartbeat as failed
CREATE OR REPLACE FUNCTION heartbeat_fail(
  p_task_name TEXT,
  p_error TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE watchdog_heartbeats
  SET status = 'failed', completed_at = NOW(), error = p_error
  WHERE id = (
    SELECT id FROM watchdog_heartbeats
    WHERE task_name = p_task_name
      AND status IN ('expected', 'started')
    ORDER BY expected_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- Check for missed heartbeats (called by Make watchdog)
-- Returns tasks that were expected but never started within grace_minutes
CREATE OR REPLACE FUNCTION check_missed_heartbeats(
  p_grace_minutes INTEGER DEFAULT 15
) RETURNS TABLE (
  heartbeat_id UUID,
  task_name TEXT,
  expected_at TIMESTAMPTZ,
  minutes_overdue DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  UPDATE watchdog_heartbeats h
  SET status = 'missed'
  WHERE h.status = 'expected'
    AND h.expected_at < NOW() - (p_grace_minutes || ' minutes')::INTERVAL
  RETURNING
    h.id,
    h.task_name,
    h.expected_at,
    EXTRACT(EPOCH FROM (NOW() - h.expected_at)) / 60;
END;
$$ LANGUAGE plpgsql;

-- View: current watchdog status
CREATE OR REPLACE VIEW watchdog_status AS
SELECT
  task_name,
  status,
  expected_at,
  started_at,
  completed_at,
  error,
  CASE
    WHEN status = 'completed' THEN 'healthy'
    WHEN status = 'started' AND started_at < NOW() - INTERVAL '2 hours' THEN 'stuck'
    WHEN status = 'started' THEN 'running'
    WHEN status = 'expected' AND expected_at < NOW() - INTERVAL '15 minutes' THEN 'overdue'
    WHEN status = 'expected' THEN 'waiting'
    WHEN status = 'missed' THEN 'missed'
    WHEN status = 'failed' THEN 'failed'
    ELSE status
  END as health
FROM watchdog_heartbeats
WHERE expected_at > NOW() - INTERVAL '48 hours'
ORDER BY expected_at DESC;

-- ============ RLS ============
ALTER TABLE watchdog_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchdog_repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON watchdog_heartbeats FOR ALL USING (true);
CREATE POLICY "Service role full access" ON watchdog_repairs FOR ALL USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
