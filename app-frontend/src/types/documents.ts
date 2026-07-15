export const DocumentStatus = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  EXTRACTED: "extracted",
  SUMMARIZED: "summarized",
  READY: "ready",
  FAILED: "failed",
} as const;

export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

export interface ConditionResponse {
  name: string;
  code?: string | null;
  code_system?: string | null;
  status?: string | null;
  onset_date?: string | null;
}

export interface MedicationClinicalResponse {
  name: string;
  code?: string | null;
  code_system?: string | null;
  dose?: string | null;
  frequency?: string | null;
  status?: string | null;
}

export interface LabResultResponse {
  name: string;
  code?: string | null;
  code_system?: string | null;
  value_quantity?: number | null;
  value_text?: string | null;
  unit?: string | null;
  reference_range_low?: number | null;
  reference_range_high?: number | null;
  reference_range_text?: string | null;
  flag?: string | null;
  observed_at?: string | null;
}

export interface EncounterResponse {
  encounter_type?: string | null;
  description?: string | null;
  provider?: string | null;
  facility?: string | null;
  occurred_at?: string | null;
}

export interface FollowUpResponse {
  what: string;
  when_text?: string | null;
  due_date?: string | null;
  completed: boolean;
}

export interface AllergyResponse {
  substance: string;
  reaction?: string | null;
  severity?: string | null;
  status?: string | null;
}

export interface DocumentResponse {
  document_id: string;
  user_id: string;
  file_name: string;
  mime_type: string;
  extracted_text?: string;
  raw_text?: string;
  file_size_bytes: number;
  status: DocumentStatus;
  uploaded_at: string;
  error_message?: string | null;
  conditions: ConditionResponse[];
  medications: MedicationClinicalResponse[];
  lab_results: LabResultResponse[];
  encounters: EncounterResponse[];
  follow_ups: FollowUpResponse[];
  allergies: AllergyResponse[];
}

export interface DocumentListResponse {
  documents: DocumentResponse[];
  total: number;
}

export interface UploadResponse {
  document_id: string;
  status: DocumentStatus;
  message?: string;
}

export interface SummaryResponse {
  summary_id: string;
  document_id: string;
  summary_text: string;
  reading_level_target: string;
  created_at: string;
  disclaimer: string;
}

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  message_id: string;
  document_id: string;
  question: string;
  answer: string;
  created_at: string;
  disclaimer: string;
}

export interface FeedbackRequest {
  rating: number;
}

export const UnderstandingRating = {
  YES: "yes",
  SOMEWHAT: "somewhat",
  NO: "no",
} as const;

export type UnderstandingRating =
  (typeof UnderstandingRating)[keyof typeof UnderstandingRating];

export interface UnderstandingRequest {
  rating: UnderstandingRating;
}

export interface PrepResponse {
  prep_id: string;
  document_id: string;
  questions: string[];
  created_at: string;
  note?: string;
  notes?: string;
}

export interface UnderstandingResponse {
  id: string;
  summary_id: string;
  rating: string;
  created_at: string;
}

export interface KpiReadingLevel {
  total_summaries: number;
  avg_reading_level?: number | null;
  at_or_below_grade_6: number;
  pct_on_target?: number | null;
}

export interface KpiQuality {
  total_summaries: number;
  passed: number;
  failed: number;
  pass_rate_pct?: number | null;
}

export interface KpiSatisfaction {
  rated_messages: number;
  avg_rating?: number | null;
  positive: number;
  negative: number;
}

export interface DashboardResponse {
  documents: DocumentResponse[];
  total_documents: number;
  total_summaries: number;
  total_questions_asked: number;
  avg_seconds_to_summary?: number | null;
  reading_level?: KpiReadingLevel | null;
  quality?: KpiQuality | null;
  satisfaction?: KpiSatisfaction | null;
}

export const MedBridgeErrorCode = {
  groqTimeout: "GROQ_TIMEOUT",
  groqUnavailable: "GROQ_UNAVAILABLE",
  docNotFound: "DOC_NOT_FOUND",
  extractionFailed: "EXTRACTION_FAILED",
  unauthorized: "UNAUTHORIZED",
} as const;

export type MedBridgeErrorCode =
  (typeof MedBridgeErrorCode)[keyof typeof MedBridgeErrorCode];

export interface ErrorEnvelope {
  success: boolean;
  error_code: MedBridgeErrorCode;
  message: string;
  retry_after?: number;
}
