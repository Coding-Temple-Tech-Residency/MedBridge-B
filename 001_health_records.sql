CREATE TABLE health_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         TEXT NOT NULL CHECK (source_type IN ('upload', 'fhir', 'synthea')),
  filename            TEXT,
  storage_path        TEXT,
  raw_text            TEXT,
  fhir_connection_id  UUID,
  fhir_patient_id     TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','extracting',
                                          'extracted','summarizing','ready','failed')),
  error_message       TEXT,
  display_name        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER health_records_updated_at
  BEFORE UPDATE ON health_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own health records"
  ON health_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own health records"
  ON health_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own health records"
  ON health_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own health records"
  ON health_records FOR DELETE
  USING (auth.uid() = user_id);