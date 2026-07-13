export interface AppConfig {
    app: {
        name: string;
        version: string;
        environment: string;
    };
    limits: {
        max_upload_mb: number;
        allowed_file_types: string[];
        max_pages_per_document: number;
    };
    features: {
        document_upload: boolean;
        ocr_extraction: boolean;
        ai_summarization: boolean;
        document_chat: boolean;
        summary_feedback: boolean;
        analytics_dashboard: boolean;
        appointment_prep: boolean;
        reminders: boolean;
        multilanguage: boolean;
    };
    ai: {
        model: string;
        max_summary_tokens: number;
        max_chat_tokens: number;
    };
}
