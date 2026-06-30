export const DocumentStatus = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  EXTRACTED: "extracted",
  SUMMARIZED: "summarized",
  FAILED: "failed"
} as const;

export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];


export interface DocumentResponse {
    document_id: string;
    user_id: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    status: DocumentStatus;
    uploaded_at: string;
    error_message?: string | null;
}


export interface DocumentListResponse {
    documents: DocumentResponse [];
    total: number;
}


export interface UploadResponse {
    document_id: string;
    status: DocumentStatus;
    message: string;
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
    NO: "no"
} as const;

export type UnderstandingRating = keyof typeof UnderstandingRating;


export interface UnderstandingRequest {
    rating: string;
}


export interface PrepResponse {
    prep_id: string;
    document_id: string;
    questions: string[];
    created_at: string;
    notes: string;
}



export interface UnderstadingResponse {
    id: string;
    summary_id: string;
    rating: string;
    created_at: string;
}


export interface KpiReadingLevel {
    total_summaries: number;
    avg_reading_level?: number;
    at_or_below_grade_6: number;
    pct_on_target?: number;
}

export interface KpiQuality {
    total_summaries: number;
    passed: number;
    failed: number;
    pass_rate_pct?: number;
}

export interface KpiSatisfaction {
    rated_messages: number;
    avg_rating?: number;
    positive: number;
    negative: number;
}


export interface DashboardResponse {
    documents: DocumentResponse[];
    total_documents: number;
    total_summaries: number;
    total_questions_asked: number;
    avg_seconds_to_summary?: number;
    reading_level?: KpiReadingLevel;
    quality?: KpiQuality;
    satisfaction?: KpiSatisfaction;
}


export const MedBridgeErrorCode = {
    groqTimeout : "GROQ_TIMEOUT",
    groqUnavailable : "GROQ_UNAVAILABLE",
     docNotFound : "DOC_NOT_FOUND",
     extractionFailed : "EXTRACTION_FAILED",
     unauthorized : "UNAUTHORIZED"
} as const;

export type MedBridgeErrorCode = typeof MedBridgeErrorCode[keyof typeof MedBridgeErrorCode];

export interface ErrorEnvelope {
    success: boolean;
    error_code: MedBridgeErrorCode;
    message: string;
    retry_after?: number;
};






//! Duplicate interface in feature file:

export interface ReminderCreate {
    title: string;
    due_date?: string;
    notes?: string;
}

export interface ReminderResponse {
    reminder_id: string;
    user_id: string;
    document_id?: string;
    title: string;
    due_date?: string;
    notes?: string;
    created_at: string;
}









