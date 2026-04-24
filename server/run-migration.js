/**
 * run-migration.js
 * Applies the per-assignee status migration directly via Supabase.
 * Run with: node run-migration.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function runMigration() {
  console.log('🔄 Checking task_assignees columns...');

  // Step 1: Check if columns already exist by trying a select
  const { data: testRow, error: testErr } = await supabase
    .from('task_assignees')
    .select('status, completed_at, updated_at')
    .limit(1);

  if (!testErr) {
    console.log('✅ Columns already exist. Migration already applied.');
    console.log('   status, completed_at, updated_at — all present.');
    return;
  }

  if (!testErr.message.includes('column') && !testErr.message.includes('does not exist')) {
    console.error('❌ Unexpected error checking columns:', testErr.message);
    return;
  }

  console.log('⚠️  Columns missing. Applying migration via SQL...');
  console.log('');
  console.log('─────────────────────────────────────────────────────');
  console.log('Supabase does NOT allow DDL (ALTER TABLE) via the JS client.');
  console.log('You must run this migration directly in Supabase SQL Editor.');
  console.log('');
  console.log('Go to: https://supabase.com/dashboard → Your Project → SQL Editor');
  console.log('');
  console.log('Paste and run this SQL:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`
ALTER TABLE task_assignees
  ADD COLUMN IF NOT EXISTS status         TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill: copy the task's current global status into each assignee row
UPDATE task_assignees ta
SET status = t.status
FROM tasks t
WHERE ta.task_id = t.id;

-- Index for fast per-user status queries  
CREATE INDEX IF NOT EXISTS idx_task_assignees_status ON task_assignees(user_id, status);
  `);
  console.log('─────────────────────────────────────────────────────');
  console.log('After running the SQL, restart the server. The /my-status endpoint will work.');
}

runMigration().catch(console.error);
