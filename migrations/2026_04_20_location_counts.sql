-- ============================================================
-- Migration: add trainers_sent + trainers_approved to task_locations
-- Safe to re-run (uses IF NOT EXISTS / DO $$ guards).
-- ============================================================

BEGIN;

ALTER TABLE task_locations
  ADD COLUMN IF NOT EXISTS trainers_sent     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trainers_approved INT NOT NULL DEFAULT 0;

-- Guard: approved must never exceed sent (enforced at DB level too)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_approved_lte_sent' AND conrelid = 'task_locations'::regclass
  ) THEN
    ALTER TABLE task_locations
      ADD CONSTRAINT chk_approved_lte_sent
        CHECK (trainers_approved <= trainers_sent);
  END IF;
END $$;

COMMIT;
