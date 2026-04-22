-- ============================================================
-- Migration: Fix recurring_task_completions for per-user tracking
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run even if table already exists.
-- ============================================================

-- Step 1: Create the table fresh if it doesn't exist at all
CREATE TABLE IF NOT EXISTS recurring_task_completions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date DATE        NOT NULL,
  completed_by    UUID        NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Drop the old 2-column unique constraint if it exists
--         (was: UNIQUE(task_id, completion_date) — blocks multi-user completion)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'recurring_task_completions'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name IN ('task_id', 'completion_date')
  GROUP BY tc.constraint_name
  HAVING COUNT(*) = 2
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage ccu2
      WHERE ccu2.constraint_name = tc.constraint_name
        AND ccu2.column_name = 'completed_by'
    )
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE recurring_task_completions DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped old 2-column unique constraint: %', constraint_name;
  END IF;
END $$;

-- Step 3: Add the correct 3-column unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'recurring_task_completions'
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 3
  ) THEN
    ALTER TABLE recurring_task_completions
      ADD CONSTRAINT rtc_task_date_user_unique
      UNIQUE (task_id, completion_date, completed_by);
    RAISE NOTICE 'Added 3-column unique constraint';
  END IF;
END $$;

-- Step 4: Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_rtc_task_date
  ON recurring_task_completions (task_id, completion_date);

CREATE INDEX IF NOT EXISTS idx_rtc_user_date
  ON recurring_task_completions (completed_by, completion_date);

-- Step 5: RLS
ALTER TABLE recurring_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rtc_select_all"   ON recurring_task_completions;
DROP POLICY IF EXISTS "rtc_insert"       ON recurring_task_completions;
DROP POLICY IF EXISTS "rtc_delete_own"   ON recurring_task_completions;
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

-- Step 6: Also drop the old draft table from the first migration if it exists
DROP TABLE IF EXISTS recurring_completions;
