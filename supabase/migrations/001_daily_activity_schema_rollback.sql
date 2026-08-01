-- Rollback for 001_daily_activity_schema.sql
-- WARNING: Deletes all Daily Activity data. Backup before running.

DROP TABLE IF EXISTS da_report_checklist_answers CASCADE;
DROP TABLE IF EXISTS da_report_submissions CASCADE;
DROP TABLE IF EXISTS da_report_template_checklist_items CASCADE;
DROP TABLE IF EXISTS da_report_templates CASCADE;
DROP TABLE IF EXISTS da_report_links CASCADE;
DROP TABLE IF EXISTS da_staff_cache CASCADE;
