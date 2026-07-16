

export interface RegisterRequest {
    email: string;
    password: string;
    full_name?: string;
};

export interface LoginRequest {
    email:string;
    password: string;
}

export interface AuthResponse {
    access_token: string | null;
    token_type: string;
    user_id: string;
    email: string;
};



export interface UserProfile {
    user_id: string;
    email: string;
    full_name?: string;
    preferred_language: string;
    explanation_level: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
  preferred_language?: string;
  explanation_level?: string;
}

export interface AuthContextInterface {
    isLoading?: boolean;
    token: string | null;
    userProfile: UserProfile | null;
    login: (token:string, userProfile:any) => void;
    logout: () => void;
}




