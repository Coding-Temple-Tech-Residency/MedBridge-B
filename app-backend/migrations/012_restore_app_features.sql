-- ============================================================
-- MedBridge — Restore app-feature tables dropped by 010
-- Run once in Supabase SQL Editor after 010_mvp_rebuild.sql
-- Safe to re-run (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── chat_messages (document Q&A) ─────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  feedback_rating   INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_health_record_id ON chat_messages(health_record_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own chat_messages" ON chat_messages;
CREATE POLICY "users manage own chat_messages"
  ON chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── appointment_prep ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_prep (
  prep_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions     JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointment_prep ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own prep" ON appointment_prep;
CREATE POLICY "users manage own prep"
  ON appointment_prep FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── follow_ups ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
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

DROP POLICY IF EXISTS "users manage own follow_ups" ON follow_ups;
CREATE POLICY "users manage own follow_ups"
  ON follow_ups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── reminders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
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

DROP POLICY IF EXISTS "users manage own reminders" ON reminders;
CREATE POLICY "users manage own reminders"
  ON reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── trusted_contacts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trusted_contacts (
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

DROP POLICY IF EXISTS "users manage own contacts" ON trusted_contacts;
CREATE POLICY "users manage own contacts"
  ON trusted_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── providers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
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

DROP POLICY IF EXISTS "users manage own providers" ON providers;
CREATE POLICY "users manage own providers"
  ON providers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── resources (shared curated content) ───────────────────────
CREATE TABLE IF NOT EXISTS resources (
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

DROP POLICY IF EXISTS "authenticated users read resources" ON resources;
CREATE POLICY "authenticated users read resources"
  ON resources FOR SELECT
  TO authenticated
  USING (true);

-- ── health_scores ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_scores (
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

DROP POLICY IF EXISTS "users manage own health scores" ON health_scores;
CREATE POLICY "users manage own health scores"
  ON health_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── KPI: AI satisfaction (requires chat_messages.feedback_rating) ──
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
