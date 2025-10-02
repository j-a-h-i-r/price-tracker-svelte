import { API_URL } from '$env/static/private'
import type { RequestEvent } from "@sveltejs/kit";

export function fallback(req: RequestEvent) {
    console.log('Fallback for', req.url.href);
    const apiRequest = new Request(
        req.url.href.replace(
            `${req.url.origin}/api/`,
            `${API_URL}/api/`
        )
    );
    return req.fetch(apiRequest);
}