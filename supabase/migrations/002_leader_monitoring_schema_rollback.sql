-- Rollback for 002_leader_monitoring_schema.sql

DROP TABLE IF EXISTS lm_submissions CASCADE;
DROP TABLE IF EXISTS lm_template_checklist_items CASCADE;
DROP TABLE IF EXISTS lm_templates CASCADE;
