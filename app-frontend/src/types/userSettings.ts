export interface UserSettingsResponse {
    id: string;
    user_id: string;
    allow_trusted_contacts: boolean;
    allow_mychart_integration: boolean;
    enable_reminders: boolean;
    updated_at: string;
}

export interface UpdateUserSettings {
    allow_trusted_contacts: boolean | null;
    allow_mychart_integration: boolean | null;
    enable_reminders: boolean | null;
}