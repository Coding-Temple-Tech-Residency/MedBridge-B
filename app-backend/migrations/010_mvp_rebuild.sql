-- ============================================================
-- MedBridge — MVP schema rebuild
-- Run once in Supabase SQL Editor (destructive: drops non-MVP data)
-- Backup your database before running.
-- ============================================================

-- ── Drop KPI views ───────────────────────────────────────────
DROP VIEW IF EXISTS kpi_ai_satisfaction CASCADE;
DROP VIEW IF EXISTS kpi_quality CASCADE;
DROP VIEW IF EXISTS kpi_reading_level CASCADE;
DROP VIEW IF EXISTS kpi_processing_time CASCADE;

-- ── Drop non-MVP / legacy tables (dependency-safe) ───────────
DROP TABLE IF EXISTS summary_feedback CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS appointment_prep CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS conditions CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS allergies CASCADE;
DROP TABLE IF EXISTS health_scores CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS app_events CASCADE;
DROP TABLE IF EXISTS trusted_contacts CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS health_records CASCADE;
DROP TABLE IF EXISTS fhir_connections CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- ── Shared trigger helper ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── user_profiles ────────────────────────────────────────────
CREATE TABLE user_profiles (
  user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT,
  preferred_language  TEXT NOT NULL DEFAULT 'en',
  explanation_level   TEXT NOT NULL DEFAULT 'plain'
    CHECK (explanation_level IN ('plain', 'detailed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── health_records (uploaded documents) ───────────────────────
CREATE TABLE health_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         TEXT NOT NULL DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'fhir', 'synthea')),
  filename            TEXT,
  storage_path        TEXT,
  raw_text            TEXT,
  file_type           TEXT,
  file_size_bytes     INTEGER,
  extraction_method   TEXT,
  ocr_confidence      NUMERIC(5,2),
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'uploaded', 'processing', 'extracting',
      'extracted', 'summarizing', 'summarized', 'ready', 'failed'
    )),
  error_message       TEXT,
  display_name        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_user_id ON health_records(user_id);
CREATE INDEX idx_health_records_status ON health_records(status);
CREATE INDEX idx_health_records_created_at ON health_records(created_at DESC);

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

-- ── summaries ────────────────────────────────────────────────
CREATE TABLE summaries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id    UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plain_summary       TEXT,
  reading_level_score NUMERIC(4,1),
  quality_passed      BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_summaries_health_record_id ON summaries(health_record_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);

ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own summaries"
  ON summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own summaries"
  ON summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own summaries"
  ON summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own summaries"
  ON summaries FOR DELETE
  USING (auth.uid() = user_id);

-- ── medications (user-scoped only) ───────────────────────────
CREATE TABLE medications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT,
  code_system       TEXT,
  dose              TEXT,
  frequency         TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_user_id ON medications(user_id);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- ── document_chunks (optional chat/prep context) ─────────────
CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  token_count   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own chunks"
  ON document_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── app_events (analytics) ───────────────────────────────────
CREATE TABLE app_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  health_record_id  UUID REFERENCES health_records(id) ON DELETE SET NULL,
  event_type        VARCHAR(100) NOT NULL,
  event_category    VARCHAR(50) NOT NULL,
  event_data        JSONB DEFAULT '{}',
  session_id        VARCHAR(255),
  ip_address        INET,
  user_agent        TEXT,
  response_time_ms  INTEGER,
  success           BOOLEAN DEFAULT true,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_events_user_id ON app_events(user_id);
CREATE INDEX idx_app_events_event_type ON app_events(event_type);
CREATE INDEX idx_app_events_event_category ON app_events(event_category);
CREATE INDEX idx_app_events_created_at ON app_events(created_at);
CREATE INDEX idx_app_events_session_id ON app_events(session_id);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON app_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
  ON app_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access"
  ON app_events FOR ALL
  USING (auth.role() = 'service_role');

-- ── summary_feedback (documents + analytics) ─────────────────
CREATE TABLE summary_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id            UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  understanding_rating  TEXT CHECK (understanding_rating IN ('yes', 'somewhat', 'no')),
  rating                INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_text         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE summary_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own summary feedback"
  ON summary_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── user_settings ─────────────────────────────────────────────
CREATE TABLE user_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_trusted_contacts    BOOLEAN NOT NULL DEFAULT false,
  allow_mychart_integration BOOLEAN NOT NULL DEFAULT false,
  enable_reminders          BOOLEAN NOT NULL DEFAULT true,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── chat_messages (document Q&A) ─────────────────────────────
CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  feedback_rating   INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_health_record_id ON chat_messages(health_record_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own chat_messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── appointment_prep ─────────────────────────────────────────
CREATE TABLE appointment_prep (
  prep_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions     JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointment_prep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own prep"
  ON appointment_prep FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── follow_ups ───────────────────────────────────────────────
CREATE TABLE follow_ups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  what              TEXT NOT NULL,
  when_text         TEXT,
  due_date          DATE,
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own follow_ups"
  ON follow_ups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── reminders ────────────────────────────────────────────────
CREATE TABLE reminders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_record_id  UUID REFERENCES health_records(id) ON DELETE SET NULL,
  reminder_type     TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  remind_at         TIMESTAMPTZ NOT NULL,
  repeat_interval   TEXT,
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own reminders"
  ON reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── trusted_contacts ─────────────────────────────────────────
CREATE TABLE trusted_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_email  TEXT NOT NULL,
  contact_name   TEXT NOT NULL,
  access_level   TEXT NOT NULL DEFAULT 'read'
    CHECK (access_level IN ('read', 'full')),
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own contacts"
  ON trusted_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── providers ────────────────────────────────────────────────
CREATE TABLE providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  specialty         TEXT,
  phone             TEXT,
  address           TEXT,
  fhir_provider_id  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own providers"
  ON providers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── resources (shared curated content) ───────────────────────
CREATE TABLE resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  url             TEXT,
  resource_type   TEXT,
  tags            JSONB DEFAULT '[]',
  condition_codes JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users read resources"
  ON resources FOR SELECT
  TO authenticated
  USING (true);

-- ── health_scores ────────────────────────────────────────────
CREATE TABLE health_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_record_id  UUID REFERENCES health_records(id) ON DELETE SET NULL,
  score             NUMERIC(5,2) NOT NULL,
  score_label       TEXT,
  rationale         TEXT,
  scored_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own health scores"
  ON health_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── KPI views ────────────────────────────────────────────────
CREATE OR REPLACE VIEW kpi_processing_time AS
SELECT
  DATE_TRUNC('day', h.created_at) AS day,
  COUNT(*) AS documents_processed,
  AVG(EXTRACT(EPOCH FROM (s.created_at - h.created_at))) AS avg_seconds_to_summary,
  MIN(EXTRACT(EPOCH FROM (s.created_at - h.created_at))) AS min_seconds,
  MAX(EXTRACT(EPOCH FROM (s.created_at - h.created_at))) AS max_seconds
FROM health_records h
JOIN summaries s ON s.health_record_id = h.id
WHERE h.status = 'summarized'
GROUP BY DATE_TRUNC('day', h.created_at)
ORDER BY day DESC;

CREATE OR REPLACE VIEW kpi_reading_level AS
SELECT
  COUNT(*) AS total_summaries,
  AVG(reading_level_score) AS avg_reading_level,
  COUNT(*) FILTER (WHERE reading_level_score <= 6) AS at_or_below_grade_6,
  COUNT(*) FILTER (WHERE reading_level_score BETWEEN 6 AND 8) AS grade_6_to_8,
  COUNT(*) FILTER (WHERE reading_level_score > 8) AS above_grade_8,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE reading_level_score <= 6)
    / NULLIF(COUNT(*) FILTER (WHERE reading_level_score IS NOT NULL), 0),
    1
  ) AS pct_on_target
FROM summaries
WHERE reading_level_score IS NOT NULL;

CREATE OR REPLACE VIEW kpi_quality AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_summaries,
  COUNT(*) FILTER (WHERE quality_passed = TRUE) AS passed,
  COUNT(*) FILTER (WHERE quality_passed = FALSE) AS failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE quality_passed = TRUE)
    / NULLIF(COUNT(*), 0),
    1
  ) AS pass_rate_pct
FROM summaries
WHERE quality_passed IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

CREATE OR REPLACE VIEW kpi_ai_satisfaction AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL) AS rated_messages,
  ROUND(AVG(feedback_rating), 2) AS avg_rating,
  COUNT(*) FILTER (WHERE feedback_rating >= 4) AS positive,
  COUNT(*) FILTER (WHERE feedback_rating <= 2) AS negative
FROM chat_messages
WHERE role = 'assistant'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

CREATE OR REPLACE VIEW kpi_ai_satisfaction AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL) AS rated_messages,
  ROUND(AVG(feedback_rating), 2) AS avg_rating,
  COUNT(*) FILTER (WHERE feedback_rating >= 4) AS positive,
  COUNT(*) FILTER (WHERE feedback_rating <= 2) AS negative
FROM chat_messages
WHERE role = 'assistant'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
