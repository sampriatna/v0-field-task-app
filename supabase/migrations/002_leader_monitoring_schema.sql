-- Leader Monitoring — persistent storage (PostgreSQL / Supabase)
-- Run after 001_daily_activity_schema.sql

CREATE TABLE IF NOT EXISTS lm_templates (
  id                  TEXT PRIMARY KEY,
  kind                TEXT NOT NULL,
  title               TEXT NOT NULL,
  menu_label          TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  standard_result     TEXT NOT NULL DEFAULT '',
  outlet_id           TEXT,
  target_time_start   TEXT,
  target_time_end     TEXT,
  photo_mode          TEXT NOT NULL DEFAULT 'required',
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INT NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS lm_template_checklist_items (
  id          TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES lm_templates(id) ON DELETE CASCADE,
  item_text   TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS lm_template_checklist_items_tpl_idx
  ON lm_template_checklist_items (template_id, sort_order);

CREATE TABLE IF NOT EXISTS lm_submissions (
  id                  TEXT PRIMARY KEY,
  template_id         TEXT NOT NULL REFERENCES lm_templates(id),
  kind                TEXT NOT NULL,
  report_date         DATE NOT NULL,
  outlet_id           TEXT NOT NULL,
  shift               TEXT NOT NULL DEFAULT 'Siang',
  leader_id           TEXT NOT NULL,
  leader_name         TEXT NOT NULL,
  area                TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL,
  score_total         INT NOT NULL DEFAULT 0,
  score_max           INT NOT NULL DEFAULT 0,
  checklist_scores    JSONB NOT NULL DEFAULT '[]',
  related_staff_ids   JSONB NOT NULL DEFAULT '[]',
  related_staff_names TEXT NOT NULL DEFAULT '',
  problem_note        TEXT NOT NULL DEFAULT '',
  fix_instruction     TEXT NOT NULL DEFAULT '',
  fix_deadline        TEXT,
  photo_url           TEXT,
  follow_up_status    TEXT NOT NULL DEFAULT 'open',
  staff_submission_id TEXT,
  staff_validation    TEXT,
  title               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lm_submissions_date_idx ON lm_submissions (report_date);
CREATE INDEX IF NOT EXISTS lm_submissions_outlet_idx ON lm_submissions (outlet_id, report_date);
