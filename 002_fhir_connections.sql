CREATE TABLE fhir_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  epic_client_id      TEXT NOT NULL,
  fhir_patient_id     TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  token_expires_at    TIMESTAMPTZ,
  fhir_base_url       TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER fhir_connections_updated_at
  BEFORE UPDATE ON fhir_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE fhir_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own fhir connections"
  ON fhir_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own fhir connections"
  ON fhir_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own fhir connections"
  ON fhir_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own fhir connections"
  ON fhir_connections FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE health_records
  ADD CONSTRAINT fk_fhir_connection
  FOREIGN KEY (fhir_connection_id)
  REFERENCES fhir_connections(id)
  ON DELETE SET NULL;