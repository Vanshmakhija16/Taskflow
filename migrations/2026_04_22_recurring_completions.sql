-- ============================================================
-- Migration: recurring_completions
-- Tracks per-day completion of recurring tasks
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_completions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,                        -- e.g. 2026-05-01
  completed_by UUID        NOT NULL REFERENCES profiles(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, date)                                    -- one completion per task per day
);

CREATE INDEX IF NOT EXISTS idx_recurring_completions_task_date
  ON recurring_completions(task_id, date);

CREATE INDEX IF NOT EXISTS idx_recurring_completions_date
  ON recurring_completions(date);

-- RLS
ALTER TABLE recurring_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_select_all"
  ON recurring_completions FOR SELECT USING (TRUE);

CREATE POLICY "rc_insert"
  ON recurring_completions FOR INSERT
  WITH CHECK (auth.uid() = completed_by);

CREATE POLICY "rc_delete_own"
  ON recurring_completions FOR DELETE
  USING (auth.uid() = completed_by);
