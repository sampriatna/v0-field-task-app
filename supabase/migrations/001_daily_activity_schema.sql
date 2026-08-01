-- Daily Activity SOP — persistent storage (PostgreSQL / Supabase)
-- Run once in Supabase SQL Editor or via supabase db push.
-- Rollback: see supabase/migrations/001_daily_activity_schema_rollback.sql

CREATE TABLE IF NOT EXISTS da_staff_cache (
  staff_id    TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  position    TEXT NOT NULL DEFAULT '',
  outlet      TEXT NOT NULL,
  area        TEXT NOT NULL DEFAULT 'Dapur',
  wa_number   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'STAFF',
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS da_report_links (
  id          TEXT PRIMARY KEY,
  staff_id    TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  short_code  TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS da_report_links_short_code_active_idx
  ON da_report_links (LOWER(short_code))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS da_report_links_staff_id_idx ON da_report_links (staff_id);
CREATE INDEX IF NOT EXISTS da_report_links_token_idx ON da_report_links (token);

CREATE TABLE IF NOT EXISTS da_report_templates (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'General',
  outlet_id           TEXT,
  position_group      TEXT,
  standard_result     TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  requires_photo      BOOLEAN NOT NULL DEFAULT FALSE,
  requires_note       BOOLEAN NOT NULL DEFAULT FALSE,
  is_required_daily   BOOLEAN NOT NULL DEFAULT FALSE,
  kind                TEXT NOT NULL DEFAULT 'daily_required',
  target_time_start   TEXT,
  target_time_end     TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INT NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS da_report_templates_active_idx ON da_report_templates (active, sort_order);

CREATE TABLE IF NOT EXISTS da_report_template_checklist_items (
  id                  TEXT PRIMARY KEY,
  report_template_id  TEXT NOT NULL REFERENCES da_report_templates(id) ON DELETE CASCADE,
  item_text           TEXT NOT NULL,
  is_required         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS da_report_template_checklist_items_tpl_idx
  ON da_report_template_checklist_items (report_template_id, sort_order);

CREATE TABLE IF NOT EXISTS da_report_submissions (
  id                          TEXT PRIMARY KEY,
  staff_id                    TEXT NOT NULL,
  outlet_id                   TEXT NOT NULL,
  report_template_id          TEXT NOT NULL REFERENCES da_report_templates(id),
  report_date                 DATE NOT NULL,
  status_condition            TEXT NOT NULL,
  note                        TEXT NOT NULL DEFAULT '',
  photo_url                   TEXT,
  submitted_at                TIMESTAMPTZ NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leader_validation           TEXT,
  leader_validation_note      TEXT,
  leader_validated_at         TIMESTAMPTZ,
  leader_validated_by         TEXT,
  leader_validated_by_name    TEXT,
  leader_validation_photo_url TEXT,
  UNIQUE (staff_id, report_template_id, report_date)
);

CREATE INDEX IF NOT EXISTS da_report_submissions_date_idx ON da_report_submissions (report_date);
CREATE INDEX IF NOT EXISTS da_report_submissions_staff_idx ON da_report_submissions (staff_id, report_date);

CREATE TABLE IF NOT EXISTS da_report_checklist_answers (
  id                  TEXT PRIMARY KEY,
  submission_id       TEXT NOT NULL REFERENCES da_report_submissions(id) ON DELETE CASCADE,
  checklist_item_id   TEXT NOT NULL,
  checked             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS da_report_checklist_answers_sub_idx
  ON da_report_checklist_answers (submission_id);
