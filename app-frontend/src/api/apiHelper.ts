
export interface apiHelper<T = unknown> {
    url: string;
    method: 'POST' | 'GET' | 'DELETE' | 'PATCH' | "HEAD" | "PUT";
    body?: T,
    tokenOverride?: string;
    params?: Record<string, string | number | boolean | null | undefined>
}

export const setAuthCookie = (token: string, days: number = 7): void => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;

    document.cookie = `auth_token=${token}; ${expires}; path=/; SameSite=Strict; Secure`;
};


export const getAuthCookie = (): string | null => {
    const name = "auth_token=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;

}

export const clearAuthCookie = (): void => {
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/; SameSite=Strict; Secure";

};




export const apiHelper = async ({ url, method, body, tokenOverride, params }: apiHelper) => {
    try {

        const token = tokenOverride || getAuthCookie();
        const isFormData = body instanceof FormData;
        const headers: Record<string, string> = {}

        if(!isFormData){
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const parsedUrl = new URL(url, window.location.origin);
        if(params){
            Object.entries(params).forEach(([key, value]) => {
                if(value !== undefined && value !== null){
                    parsedUrl.searchParams.append(key, String(value));
                }
            })
        }


        const options: RequestInit = {
            method: method,
            headers: headers,
        };

        if (body && method !== "GET" && method !== "HEAD") {
            options.body = isFormData ? body : JSON.stringify(body);
        }
        const response = await fetch(parsedUrl.toString(), options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || "Error with response");
        }

        if (response.status === 204) {
            return null;
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return data;

    } catch (error) {
        console.error("Error:", error)
        throw error;
    }
}



