-- ============================================================
-- MedBridge — Add missing clinical tables
-- Safe follow-up for partially applied migration 003
-- ============================================================

CREATE TABLE IF NOT EXISTS conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT,
  code_system       TEXT,
  status            TEXT,
  onset_date        DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id      UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  code                  TEXT,
  code_system           TEXT,
  value_quantity        NUMERIC,
  value_text            TEXT,
  unit                  TEXT,
  reference_range_low   NUMERIC,
  reference_range_high  NUMERIC,
  reference_range_text  TEXT,
  flag                  TEXT CHECK (
    flag IN ('normal', 'low', 'high', 'critical')
  ),
  observed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encounters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encounter_type    TEXT,
  description       TEXT,
  provider          TEXT,
  facility          TEXT,
  occurred_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allergies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  substance         TEXT NOT NULL,
  reaction          TEXT,
  severity          TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_health_record_id
  ON conditions(health_record_id);

CREATE INDEX IF NOT EXISTS idx_conditions_user_id
  ON conditions(user_id);

CREATE INDEX IF NOT EXISTS idx_lab_results_health_record_id
  ON lab_results(health_record_id);

CREATE INDEX IF NOT EXISTS idx_lab_results_user_id
  ON lab_results(user_id);

CREATE INDEX IF NOT EXISTS idx_lab_results_observed_at
  ON lab_results(observed_at);

CREATE INDEX IF NOT EXISTS idx_encounters_health_record_id
  ON encounters(health_record_id);

CREATE INDEX IF NOT EXISTS idx_encounters_user_id
  ON encounters(user_id);

CREATE INDEX IF NOT EXISTS idx_allergies_health_record_id
  ON allergies(health_record_id);

CREATE INDEX IF NOT EXISTS idx_allergies_user_id
  ON allergies(user_id);

ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conditions'
      AND policyname = 'users see own conditions'
  ) THEN
    CREATE POLICY "users see own conditions"
      ON conditions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conditions'
      AND policyname = 'users insert own conditions'
  ) THEN
    CREATE POLICY "users insert own conditions"
      ON conditions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conditions'
      AND policyname = 'users delete own conditions'
  ) THEN
    CREATE POLICY "users delete own conditions"
      ON conditions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_results'
      AND policyname = 'users see own lab_results'
  ) THEN
    CREATE POLICY "users see own lab_results"
      ON lab_results FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_results'
      AND policyname = 'users insert own lab_results'
  ) THEN
    CREATE POLICY "users insert own lab_results"
      ON lab_results FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_results'
      AND policyname = 'users delete own lab_results'
  ) THEN
    CREATE POLICY "users delete own lab_results"
      ON lab_results FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'encounters'
      AND policyname = 'users see own encounters'
  ) THEN
    CREATE POLICY "users see own encounters"
      ON encounters FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'encounters'
      AND policyname = 'users insert own encounters'
  ) THEN
    CREATE POLICY "users insert own encounters"
      ON encounters FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'encounters'
      AND policyname = 'users delete own encounters'
  ) THEN
    CREATE POLICY "users delete own encounters"
      ON encounters FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'allergies'
      AND policyname = 'users see own allergies'
  ) THEN
    CREATE POLICY "users see own allergies"
      ON allergies FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'allergies'
      AND policyname = 'users insert own allergies'
  ) THEN
    CREATE POLICY "users insert own allergies"
      ON allergies FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'allergies'
      AND policyname = 'users delete own allergies'
  ) THEN
    CREATE POLICY "users delete own allergies"
      ON allergies FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
