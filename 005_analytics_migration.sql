-- ============================================================
-- MedBridge — Analytics Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Add missing columns to summaries ─────────────────────
ALTER TABLE summaries
    ADD COLUMN IF NOT EXISTS reading_level_score NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS quality_passed      BOOLEAN DEFAULT FALSE;

-- ── 2. Add feedback_rating to chat_messages (James ticket) ──
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS feedback_rating INTEGER
        CHECK (feedback_rating BETWEEN 1 AND 5);

-- ── 3. Create summary_feedback table ────────────────────────
CREATE TABLE IF NOT EXISTS summary_feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    summary_id          UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    understanding_rating TEXT CHECK (understanding_rating IN ('yes', 'somewhat', 'no')),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE summary_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own summary feedback"
    ON summary_feedback
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── 4. KPI: Document Processing Time ────────────────────────
-- How long does it take from upload to summarized?
-- Helps identify performance bottlenecks.
CREATE OR REPLACE VIEW kpi_processing_time AS
SELECT
    DATE_TRUNC('day', h.created_at)                        AS day,
    COUNT(*)                                                AS documents_processed,
    AVG(
        EXTRACT(EPOCH FROM (s.created_at - h.created_at))
    )                                                       AS avg_seconds_to_summary,
    MIN(
        EXTRACT(EPOCH FROM (s.created_at - h.created_at))
    )                                                       AS min_seconds,
    MAX(
        EXTRACT(EPOCH FROM (s.created_at - h.created_at))
    )                                                       AS max_seconds
FROM health_records h
JOIN summaries s ON s.health_record_id = h.id
WHERE h.status = 'summarized'
GROUP BY DATE_TRUNC('day', h.created_at)
ORDER BY day DESC;

-- ── 5. KPI: Reading Level Distribution ──────────────────────
-- Are our summaries actually hitting grade 6 target?
CREATE OR REPLACE VIEW kpi_reading_level AS
SELECT
    COUNT(*)                                                AS total_summaries,
    AVG(reading_level_score)                                AS avg_reading_level,
    COUNT(*) FILTER (WHERE reading_level_score <= 6)        AS at_or_below_grade_6,
    COUNT(*) FILTER (WHERE reading_level_score BETWEEN 6 AND 8) AS grade_6_to_8,
    COUNT(*) FILTER (WHERE reading_level_score > 8)         AS above_grade_8,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE reading_level_score <= 6)
        / NULLIF(COUNT(*) FILTER (WHERE reading_level_score IS NOT NULL), 0),
        1
    )                                                       AS pct_on_target
FROM summaries
WHERE reading_level_score IS NOT NULL;

-- ── 6. KPI: Summary Quality Pass Rate ───────────────────────
-- What % of summaries pass all guardrail checks?
CREATE OR REPLACE VIEW kpi_quality AS
SELECT
    DATE_TRUNC('day', created_at)                          AS day,
    COUNT(*)                                               AS total_summaries,
    COUNT(*) FILTER (WHERE quality_passed = TRUE)          AS passed,
    COUNT(*) FILTER (WHERE quality_passed = FALSE)         AS failed,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE quality_passed = TRUE)
        / NULLIF(COUNT(*), 0),
        1
    )                                                      AS pass_rate_pct
FROM summaries
WHERE quality_passed IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- ── 7. KPI: AI Satisfaction Score ───────────────────────────
-- Average rating from patients on chat responses.
-- Requires feedback_rating data from James's widget.
CREATE OR REPLACE VIEW kpi_ai_satisfaction AS
SELECT
    DATE_TRUNC('day', created_at)                          AS day,
    COUNT(*) FILTER (WHERE feedback_rating IS NOT NULL)    AS rated_messages,
    ROUND(AVG(feedback_rating), 2)                         AS avg_rating,
    COUNT(*) FILTER (WHERE feedback_rating >= 4)           AS positive,
    COUNT(*) FILTER (WHERE feedback_rating <= 2)           AS negative
FROM chat_messages
WHERE role = 'assistant'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- ── Verify ───────────────────────────────────────────────────
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
