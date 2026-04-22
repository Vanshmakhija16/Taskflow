-- ============================================================
-- Migration: Fix recurring_task_completions table
-- Ensures per-user, per-day tracking (not just per-task per-day)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Drop the old table if it was created with wrong unique constraint
--    (task_id, completion_date) — that prevents two users from completing
--    the same task on the same day. We need (task_id, completion_date, completed_by).

-- Drop old table (safe — only if you haven't gone to production yet)
-- If you have production data you want to keep, comment out the DROP and
-- manually ALTER the constraint instead (see the ALTER block below).

DROP TABLE IF EXISTS recurring_completions;        -- from the first migration draft
DROP TABLE IF EXISTS recurring_task_completions;   -- from main schema draft

-- 2. Recreate with the correct UNIQUE constraint: per task, per day, per user
CREATE TABLE IF NOT EXISTS recurring_task_completions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date DATE        NOT NULL,
  completed_by    UUID        NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One completion per (task, day, user) — multiple users can complete the same task
  UNIQUE (task_id, completion_date, completed_by)
);

CREATE INDEX IF NOT EXISTS idx_rtc_task_date
  ON recurring_task_completions (task_id, completion_date);

CREATE INDEX IF NOT EXISTS idx_rtc_user_date
  ON recurring_task_completions (completed_by, completion_date);

-- 3. RLS
ALTER TABLE recurring_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rtc_select_all"    ON recurring_task_completions;
DROP POLICY IF EXISTS "rtc_insert"        ON recurring_task_completions;
DROP POLICY IF EXISTS "rtc_delete_own"    ON recurring_task_completions;
DROP POLICY IF EXISTS "recurring_completions_select" ON recurring_task_completions;
DROP POLICY IF EXISTS "recurring_completions_insert" ON recurring_task_completions;
DROP POLICY IF EXISTS "recurring_completions_update" ON recurring_task_completions;
DROP POLICY IF EXISTS "recurring_completions_delete" ON recurring_task_completions;

CREATE POLICY "rtc_select_all"
  ON recurring_task_completions FOR SELECT USING (TRUE);

CREATE POLICY "rtc_insert"
  ON recurring_task_completions FOR INSERT
  WITH CHECK (auth.uid() = completed_by);

CREATE POLICY "rtc_delete_own"
  ON recurring_task_completions FOR DELETE
  USING (auth.uid() = completed_by);
