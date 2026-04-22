-- ============================================================
-- Migration: Fix task_assignees RLS so syncAssignees can write
-- The previous policy only allowed writes if the user is the task
-- creator OR assigned_by, but on a brand-new task insert the
-- task row doesn't exist yet when the insert fires via supabaseAdmin
-- (service role), so this is a no-op — service role bypasses RLS.
-- This migration is safe to re-run.
-- ============================================================

-- Ensure task_assignees has correct RLS (service role bypass is fine,
-- but authenticated clients also need select access for assignment UIs)

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_write"  ON task_assignees;

-- Anyone authenticated can read assignees (needed for filters, avatars)
CREATE POLICY "task_assignees_select"
  ON task_assignees FOR SELECT
  USING (TRUE);

-- Only task creators, assigners, or admins can modify assignees
-- (service role from the server bypasses this anyway)
CREATE POLICY "task_assignees_write"
  ON task_assignees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
       WHERE t.id = task_assignees.task_id
         AND (
           t.created_by  = auth.uid() OR
           t.assigned_by = auth.uid()
         )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid() AND role = 'admin'
    )
  );
