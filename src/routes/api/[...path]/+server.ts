import { API_URL } from '$env/static/private'
import type { RequestEvent } from "@sveltejs/kit";

export function fallback({request, fetch, url}: RequestEvent) {
    console.log('Fallback for', request.method, request.url, url.origin);
    const apiRequest = new Request(
        request.url.replace(
            `${url.origin}/api/`,
            `${API_URL}/api/`
        ),
        request,
    );
    return fetch(apiRequest);
}