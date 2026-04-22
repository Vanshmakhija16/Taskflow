-- Migration: add trainers_sent and trainers_approved to task_locations
-- Run in: Supabase Dashboard > SQL Editor > New Query

ALTER TABLE task_locations
  ADD COLUMN IF NOT EXISTS trainers_sent     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trainers_approved INT NOT NULL DEFAULT 0;

ALTER TABLE task_locations
  ADD CONSTRAINT chk_approved_lte_sent
  CHECK (trainers_approved <= trainers_sent);
