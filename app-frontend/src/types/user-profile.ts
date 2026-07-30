export type ExplanationLevel = "plain" | "detailed";

export interface PatientProfileResponse {
  user_id: string;
  full_name?: string | null;
  email: string;
  preferred_language: string;
  explanation_level:ExplanationLevel;
}

export interface PatientProfileUpdate {
  full_name?: string | null;
  preferred_language: string | null;
  explanation_level: ExplanationLevel | null;
}


export interface PatientProfileCreate {
  full_name: string;
  preferred_language: string;
  explanation_level?: ExplanationLevel;
}