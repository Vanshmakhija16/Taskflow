-- ============================================================
-- Multi-assignee migration
-- Adds task_assignees join table, migrates existing data from
-- tasks.assigned_to, drops the column. Safe to re-run (IF NOT EXISTS).
-- ============================================================

BEGIN;

-- 1. New join table
CREATE TABLE IF NOT EXISTS task_assignees (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by  UUID                 REFERENCES profiles(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- 2. Backfill from legacy single-assignee column (only if it still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tasks' AND column_name='assigned_to'
  ) THEN
    INSERT INTO task_assignees (task_id, user_id, assigned_by, assigned_at)
    SELECT id, assigned_to, assigned_by, created_at
      FROM tasks
     WHERE assigned_to IS NOT NULL
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;
END $$;

-- 3. Drop legacy column (comment this out if you want a soft migration)
ALTER TABLE tasks DROP COLUMN IF EXISTS assigned_to;

-- 4. RLS
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
CREATE POLICY "task_assignees_select" ON task_assignees
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "task_assignees_write" ON task_assignees;
CREATE POLICY "task_assignees_write" ON task_assignees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
       WHERE t.id = task_assignees.task_id
         AND (t.created_by = auth.uid() OR t.assigned_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;
