"""
Prompt guardrail tests.

These tests verify that the system prompts contain required safety language.
They do NOT call the Groq API — they test the prompt strings themselves.

Run: pytest tests/unit/test_prompts.py -v
"""

import pytest
from app.services.summary_service import SYSTEM_PROMPT as SUMMARY_PROMPT, DISCLAIMER as SUMMARY_DISCLAIMER
from app.services.chat_service import QA_SYSTEM_PROMPT, DISCLAIMER as CHAT_DISCLAIMER, _wants_more, DEFAULT_MAX_TOKENS, EXTENDED_MAX_TOKENS


# ── Summary prompt ────────────────────────────────────────────────────────────

class TestSummaryPrompt:
    def test_contains_no_diagnosis(self):
        assert "diagnos" in SUMMARY_PROMPT.lower()

    def test_contains_no_treatment(self):
        assert "treatment" in SUMMARY_PROMPT.lower()

    def test_contains_no_medication(self):
        assert "medication" in SUMMARY_PROMPT.lower()

    def test_specifies_reading_level(self):
        assert "4th grade" in SUMMARY_PROMPT or "fourth grade" in SUMMARY_PROMPT.lower()

    def test_instructs_explain_medical_terms(self):
        assert "medical term" in SUMMARY_PROMPT.lower() or "explain" in SUMMARY_PROMPT.lower()

    def test_grounded_in_document_only(self):
        assert "uploaded document" in SUMMARY_PROMPT.lower() or "document only" in SUMMARY_PROMPT.lower()

    def test_instructs_warm_tone(self):
        assert "warm" in SUMMARY_PROMPT.lower() or "reassur" in SUMMARY_PROMPT.lower()

    def test_handles_information_not_found(self):
        assert "not" in SUMMARY_PROMPT.lower() and "document" in SUMMARY_PROMPT.lower()


# ── Summary disclaimer ────────────────────────────────────────────────────────

class TestSummaryDisclaimer:
    def test_disclaimer_not_empty(self):
        assert len(SUMMARY_DISCLAIMER) > 20

    def test_disclaimer_mentions_no_medical_advice(self):
        assert "medical advice" in SUMMARY_DISCLAIMER.lower()

    def test_disclaimer_recommends_provider(self):
        assert "healthcare provider" in SUMMARY_DISCLAIMER.lower() or "provider" in SUMMARY_DISCLAIMER.lower()

    def test_disclaimer_mentions_no_diagnosis(self):
        assert "diagnosis" in SUMMARY_DISCLAIMER.lower()


# ── Q&A prompt ────────────────────────────────────────────────────────────────

class TestQAPrompt:
    def test_no_diagnosis(self):
        assert "diagnos" in QA_SYSTEM_PROMPT.lower()

    def test_no_treatment(self):
        assert "treatment" in QA_SYSTEM_PROMPT.lower()

    def test_no_general_knowledge(self):
        assert "general medical knowledge" in QA_SYSTEM_PROMPT.lower()

    def test_document_only(self):
        assert "document" in QA_SYSTEM_PROMPT.lower()

    def test_answer_not_in_document_case(self):
        # Prompt must instruct what to say when info isn't in doc
        assert "not in the document" in QA_SYSTEM_PROMPT.lower() or \
               "could not find" in QA_SYSTEM_PROMPT.lower()

    def test_clinical_judgment_escalation(self):
        # Prompt must instruct escalation to provider
        assert "provider" in QA_SYSTEM_PROMPT.lower() or \
               "healthcare" in QA_SYSTEM_PROMPT.lower()

    def test_no_medication_changes(self):
        assert "medication" in QA_SYSTEM_PROMPT.lower()


# ── Q&A disclaimer ────────────────────────────────────────────────────────────

class TestChatDisclaimer:
    def test_chat_disclaimer_not_empty(self):
        assert len(CHAT_DISCLAIMER) > 20

    def test_chat_disclaimer_mentions_document(self):
        assert "document" in CHAT_DISCLAIMER.lower()

    def test_chat_disclaimer_no_medical_advice(self):
        assert "medical advice" in CHAT_DISCLAIMER.lower()


class TestChatTokenHelpers:
    def test_wants_more_detects_follow_up_phrases(self):
        assert _wants_more("Can you explain more about my results?")
        assert _wants_more("Tell me more about the LDL value")

    def test_wants_more_ignores_normal_questions(self):
        assert not _wants_more("What is my cholesterol level?")

    def test_token_constants(self):
        assert DEFAULT_MAX_TOKENS < EXTENDED_MAX_TOKENS


# ── Prep prompt ───────────────────────────────────────────────────────────────

class TestPrepPrompt:
    def setup_method(self):
        from app.services.prep_service import PREP_SYSTEM_PROMPT
        self.prompt = PREP_SYSTEM_PROMPT

    def test_no_diagnosis(self):
        assert "diagnos" in self.prompt.lower()

    def test_no_treatment(self):
        assert "treatment" in self.prompt.lower()

    def test_patient_framing(self):
        # Questions should be framed as things the patient might ask
        assert "may wish to ask" in self.prompt.lower() or "patient" in self.prompt.lower()

    def test_document_grounded(self):
        assert "document" in self.prompt.lower()

    def test_plain_language(self):
        assert "plain language" in self.prompt.lower() or "plain" in self.prompt.lower()

    def test_returns_json(self):
        assert "json" in self.prompt.lower() or "array" in self.prompt.lower()
