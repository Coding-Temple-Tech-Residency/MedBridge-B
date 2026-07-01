import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoginRequest, AuthResponse, RegisterRequest } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { apiCall } from "./apiHelper";

async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {

    return apiCall({
        url: "http://localhost:8000/auth/login",
        method: "POST",
        body: credentials
    })
}

export function useLogin() {
    const { login } = useAuth();

    return useMutation({
        mutationFn: (credentials: LoginRequest) => loginUser(credentials),


        onSuccess: (response: AuthResponse) => {
            if (response.access_token) {
                login(response.access_token, response.email)
            }
        },

        onError: (error: Error) => {
            console.error("Mutation error interceptor:", error.message)
        }

    })
}

async function registerUser(credentials: RegisterRequest): Promise<AuthResponse> {

    return apiCall({
        url: "http://localhost:8000/auth/register",
        method: "POST",
        body: credentials
    })
}



export function useRegister() {
    const { login } = useAuth();

    return useMutation({
        mutationFn: (credentials: RegisterRequest) => registerUser(credentials),

        onSuccess: (response: AuthResponse) => {
            if (response.access_token) {
                login(response.access_token, response.email);
            }
        },
        onError: (error: Error) => {
            console.error("Registration mutation error interceptor:", error.message);
        }
    });
}


export const logoutUser = (): Promise<null> => {
    return apiCall({
        url: "http://localhost:8000/auth/logout",
        method: "POST",
        body: null

    })
}

export function useLogout() {
    const { logout } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: logoutUser,

        onSettled: () => {
            logout();
            queryClient.clear();
        },
        onError: (error: Error) => {
            console.error("Logout backend notificaiton failed:", error.message);
        }
    });
}