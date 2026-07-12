-- ============================================================
-- MedBridge — Medications API support
-- Run once after 001–008 in Supabase SQL Editor
-- ============================================================

-- Allow medications without a linked health record (manual entry)
ALTER TABLE medications
  ALTER COLUMN health_record_id DROP NOT NULL;

-- Defense-in-depth: align with providers/reminders UPDATE policy
CREATE POLICY "users update own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
