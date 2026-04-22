-- ============================================================
-- TaskFlow — Complete Production Database Schema
-- Supabase / PostgreSQL
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE task_status     AS ENUM ('pending', 'working', 'completed', 'blocked');
CREATE TYPE task_priority   AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_category   AS ENUM ('trainer', 'general', 'meeting', 'review', 'other');
CREATE TYPE recurrence_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE activity_type   AS ENUM (
  'task_created','task_updated','task_deleted','task_archived',
  'task_restored','status_changed','priority_changed','assignee_changed',
  'comment_added','comment_deleted','attachment_uploaded','attachment_deleted',
  'user_created','user_updated','user_deleted','role_changed',
  'project_created','project_updated','project_deleted'
);

-- ─────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  full_name     TEXT        NOT NULL DEFAULT '',
  avatar_url    TEXT,
  role          user_role   NOT NULL DEFAULT 'employee',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  preferences   JSONB               DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PROJECTS / WORKSPACES
-- ─────────────────────────────────────────────
CREATE TABLE projects (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  description   TEXT,
  color         TEXT                    DEFAULT '#de6875',
  owner_id      UUID        NOT NULL    REFERENCES profiles(id),
  is_archived   BOOLEAN     NOT NULL    DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL    DEFAULT NOW()
);

CREATE TABLE project_members (
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- ─────────────────────────────────────────────
-- TASKS (base table — all categories)
-- ─────────────────────────────────────────────
CREATE TABLE tasks (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID          REFERENCES projects(id) ON DELETE SET NULL,
  title            TEXT          NOT NULL,
  description      TEXT,
  category         task_category NOT NULL DEFAULT 'general',
  status           task_status   NOT NULL DEFAULT 'pending',
  priority         task_priority NOT NULL DEFAULT 'medium',
  start_date       DATE,
  due_date         DATE,
  created_by       UUID          NOT NULL REFERENCES profiles(id),
  assigned_by      UUID          REFERENCES profiles(id),
  assigned_to      UUID          REFERENCES profiles(id),

  -- Recurring
  is_recurring       BOOLEAN       NOT NULL DEFAULT FALSE,
  recurrence_type    recurrence_type,
  recurrence_end_date DATE,
  parent_task_id     UUID          REFERENCES tasks(id) ON DELETE CASCADE,

  -- Soft delete / archive
  is_archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_deleted       BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  deleted_by       UUID        REFERENCES profiles(id),

  board_position   INT         NOT NULL DEFAULT 0,
  search_vector    TSVECTOR,
  metadata         JSONB               DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TASK TRAINER DETAILS (category = 'trainer')
-- ─────────────────────────────────────────────
CREATE TABLE task_trainer_details (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  domain       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TASK LOCATIONS (one task → many locations)
-- ─────────────────────────────────────────────
CREATE TABLE task_locations (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id            UUID    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  location_name      TEXT    NOT NULL,
  trainers_required  INT     NOT NULL DEFAULT 1,
  position           INT     NOT NULL DEFAULT 0,  -- display order
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TASK LOCATION ASSIGNMENTS (many trainers per location)
-- ─────────────────────────────────────────────
CREATE TABLE task_location_assignments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id  UUID        NOT NULL REFERENCES task_locations(id) ON DELETE CASCADE,
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'assigned',  -- assigned | confirmed | declined
  assigned_by  UUID        REFERENCES profiles(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, user_id)
);

-- ─────────────────────────────────────────────
-- TASK ASSIGNMENT HISTORY
-- ─────────────────────────────────────────────
CREATE TABLE task_assignment_history (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_by  UUID        NOT NULL REFERENCES profiles(id),
  assigned_to  UUID        REFERENCES profiles(id),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason       TEXT
);

-- ─────────────────────────────────────────────
-- TASK STATUS HISTORY
-- ─────────────────────────────────────────────
CREATE TABLE task_status_history (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status task_status,
  to_status   task_status   NOT NULL,
  changed_by  UUID          NOT NULL REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- RECURRING TASK COMPLETIONS
-- ─────────────────────────────────────────────
CREATE TABLE recurring_task_completions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'completed',  -- completed | skipped | pending
  completed_by    UUID        NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, completion_date)
);

-- ─────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES profiles(id),
  parent_id   UUID        REFERENCES comments(id),
  body        TEXT        NOT NULL,
  is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ATTACHMENTS
-- ─────────────────────────────────────────────
CREATE TABLE attachments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by   UUID        NOT NULL REFERENCES profiles(id),
  file_name     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL,
  mime_type     TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ACTIVITY / AUDIT LOG
-- ─────────────────────────────────────────────
CREATE TABLE activity_logs (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID          NOT NULL REFERENCES profiles(id),
  action      activity_type NOT NULL,
  entity_type TEXT          NOT NULL,
  entity_id   UUID          NOT NULL,
  metadata    JSONB                   DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_tasks_project       ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by    ON tasks(created_by);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_priority      ON tasks(priority);
CREATE INDEX idx_tasks_category      ON tasks(category);
CREATE INDEX idx_tasks_due_date      ON tasks(due_date);
CREATE INDEX idx_tasks_start_date    ON tasks(start_date);
CREATE INDEX idx_tasks_recurring     ON tasks(is_recurring, recurrence_type);
CREATE INDEX idx_tasks_parent        ON tasks(parent_task_id);
CREATE INDEX idx_tasks_search        ON tasks USING GIN(search_vector);
CREATE INDEX idx_task_locations_task ON task_locations(task_id);
CREATE INDEX idx_tla_location        ON task_location_assignments(location_id);
CREATE INDEX idx_tla_user            ON task_location_assignments(user_id);
CREATE INDEX idx_tla_task            ON task_location_assignments(task_id);
CREATE INDEX idx_comments_task       ON comments(task_id);
CREATE INDEX idx_activity_entity     ON activity_logs(entity_id, entity_type);
CREATE INDEX idx_activity_actor      ON activity_logs(actor_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX idx_recurring_completions_task_date ON recurring_task_completions(task_id, completion_date);

-- ─────────────────────────────────────────────
-- FULL-TEXT SEARCH TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tasks_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_update();

-- ─────────────────────────────────────────────
-- AUTO-PROFILE CREATION ON SIGNUP
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at         BEFORE UPDATE ON profiles              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at         BEFORE UPDATE ON projects              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tasks_updated_at            BEFORE UPDATE ON tasks                 FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_trainer_updated_at     BEFORE UPDATE ON task_trainer_details  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_locations_updated_at   BEFORE UPDATE ON task_locations        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated_at         BEFORE UPDATE ON comments              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_recurring_completions_updated_at BEFORE UPDATE ON recurring_task_completions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_trainer_details      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_locations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_location_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_task_completions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all active profiles (for assignment dropdowns)
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (is_active = TRUE);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- All users can see all non-deleted tasks (open calendar / assignment model)
CREATE POLICY "tasks_select_all"     ON tasks    FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "tasks_insert"         ON tasks    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tasks_update"         ON tasks    FOR UPDATE USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_to OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
);
CREATE POLICY "tasks_delete"         ON tasks    FOR DELETE USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trainer details follow task access
CREATE POLICY "trainer_details_all"  ON task_trainer_details      FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND is_deleted = FALSE)
);
CREATE POLICY "locations_all"        ON task_locations             FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND is_deleted = FALSE)
);
CREATE POLICY "location_assign_all"  ON task_location_assignments  FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND is_deleted = FALSE)
);

-- Comments: all authenticated users can see; write own
CREATE POLICY "comments_select"      ON comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert"      ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_update_own"  ON comments FOR UPDATE USING (auth.uid() = author_id);

-- Attachments: all can see, uploader can delete
CREATE POLICY "attachments_select"   ON attachments FOR SELECT USING (TRUE);
CREATE POLICY "attachments_insert"   ON attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "attachments_delete"   ON attachments FOR DELETE USING (auth.uid() = uploaded_by);

-- Notifications: own only
CREATE POLICY "notifications_own"    ON notifications FOR ALL USING (user_id = auth.uid());

-- Activity logs: all can read
CREATE POLICY "activity_select"      ON activity_logs FOR SELECT USING (TRUE);

-- Recurring task completions: all can see; user can create/update own
CREATE POLICY "recurring_completions_select" ON recurring_task_completions FOR SELECT USING (TRUE);
CREATE POLICY "recurring_completions_insert" ON recurring_task_completions FOR INSERT WITH CHECK (auth.uid() = completed_by);
CREATE POLICY "recurring_completions_update" ON recurring_task_completions FOR UPDATE USING (auth.uid() = completed_by);
CREATE POLICY "recurring_completions_delete" ON recurring_task_completions FOR DELETE USING (auth.uid() = completed_by);
