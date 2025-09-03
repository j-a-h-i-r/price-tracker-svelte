import { api } from "$lib/core/api.js";

export function logOut() {
    return api.post('/api/auth/logout');
}

export function logIn(email: string, redirectUrl: string) {
    return api.post<{success: true}>('/api/auth/login', { email, redirectTo: redirectUrl });
}

export function verifyAuthToken(token: string) {
    return api.post<{email: string, isAdmin: boolean, redirectTo: string}>('/api/auth/verify', { token });
}
