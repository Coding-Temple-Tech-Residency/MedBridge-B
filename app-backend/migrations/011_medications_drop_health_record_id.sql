-- ============================================================
-- MedBridge — Remove health_record_id from medications
-- Run once after 010_mvp_rebuild.sql in Supabase SQL Editor
-- Medications are user-scoped only; documents use health_records separately.
-- ============================================================

DROP INDEX IF EXISTS idx_medications_health_record_id;
ALTER TABLE medications DROP COLUMN IF EXISTS health_record_id;
