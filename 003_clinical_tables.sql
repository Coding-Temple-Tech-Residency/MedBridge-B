CREATE TABLE conditions (
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

CREATE TABLE medications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT,
  code_system       TEXT,
  dose              TEXT,
  frequency         TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_results (
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
  flag                  TEXT CHECK (flag IN ('normal','low','high','critical')),
  observed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE encounters (
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

CREATE TABLE allergies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  substance         TEXT NOT NULL,
  reaction          TEXT,
  severity          TEXT,
  status            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plain_summary     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id  UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own conditions" ON conditions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own conditions" ON conditions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own conditions" ON conditions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own medications" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own medications" ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own medications" ON medications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own lab_results" ON lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own lab_results" ON lab_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own lab_results" ON lab_results FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own encounters" ON encounters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own encounters" ON encounters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own encounters" ON encounters FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own follow_ups" ON follow_ups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own follow_ups" ON follow_ups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own follow_ups" ON follow_ups FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own allergies" ON allergies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own allergies" ON allergies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own allergies" ON allergies FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own summaries" ON summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own summaries" ON summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own summaries" ON summaries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users see own chat_messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own chat_messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own chat_messages" ON chat_messages FOR DELETE USING (auth.uid() = user_id);