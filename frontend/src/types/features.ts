

export interface ReminderCreate {
    health_record_id?: string;
    reminder_type: string;
    title: string;
    body?: string;
    remind_at: string;
    repeat_interval?: string;
}


export interface ReminderUpdate {
    title?: string;
    body?: string;
    remind_at?: string;
    repeat_interval?: string;
    completed?: boolean;
}


export interface ReminderResponse {
    id: string;
    user_id: string;
    health_record_id?:string;
    reminder_type: string;
    document_id?: string;
    title: string;
    body?:string;
    remind_at: string;
    repeat_interval?: string;
    completed: boolean;
    created_at: string;
}



export interface TrustedContactCreate {
    contact_email: string;
    contact_name: string;
    access_level: string;
}


export interface TrustedContactUpdate {
    contact_name?: string;
    contact_level?: string;
    status?: string;
}


export interface TrustedContactResponse {
    id: string;
    user_id: string;
    contact_email: string;
    contact_name: string;
    access_level: string;
    status: string;
    created_at: string;
}



export interface FollowUpCreate {
    health_record_id: string;
    what: string;
    when_text?: string;
    due_date?: string;
}

export interface FollowUpUpdate {
    completed?: boolean;
    what?: string;
    when_text?: string;
    due_date?: string;
}

export interface FollowUpResponse{
    id: string;
    health_record_id: string;
    user_id: string;
    what: string;
    when_text?: string;
    due_date?: string;
    completed: boolean;
    created_at: string;

}


export interface ProviderCreate {
    name: string;
    specialty?: string;
    phone?: string;
    address?: string;
    fhir_provider_id?: string;
}

export interface ProviderUpdate{
    name?: string;
    specialty?: string;
    phone?: string;
    address?: string;
}

export interface ProviderResponse {
    id: string;
    user_id: string;
    name: string;
    specialty?: string;
    phone?: string;
    address?: string;
    fhir_provider_id?: string;
    created_at: string;
}


export interface ResourceResponse{
    id: string;
    title: string;
    description?: string;
    url?: string;
    resource_type?: string;
    tags?: string;
    condition_codes?: string;
    created_at: string;
}


export interface HealthScoreResponse {
    id: string;
    user_id: string;
    health_record_id?: string;
    score: number;
    score_label?: string;
    rationale?: string;
    scored_at: string;
    created_at: string;
}





