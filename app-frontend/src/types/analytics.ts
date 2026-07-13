export interface FeedbackSubmit {
    summary_id: string;
    rating: number;
    feedback_text?: string;
}

export interface EventLog {
    event_type: string;
    event_category: string;
    event_data?: Record<string, string>;
    session_id?: string;
    response_time_ms?: number;
    success?: boolean;
}


export interface UserSettingsUpdate {
    preferred_language?: string;
    accessibility_mode?: boolean;
    low_bandwidth_mode?: boolean;
    notification_enabled?: boolean;
}