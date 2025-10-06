import type { HandleFetch } from '@sveltejs/kit';
import { API_URL } from '$env/static/private';
import { PUBLIC_API_URL } from '$env/static/public';

export const handleFetch: HandleFetch = async ({ request, event, fetch }) => {
    console.log('Redirecting fetch for', request.url, 'to', API_URL);
	if (request.url.startsWith(PUBLIC_API_URL)) {
		// clone the original request, but change the URL
		return fetch(new Request(
			request.url.replace(PUBLIC_API_URL, API_URL),
			request
		));
	}
    return fetch(request);
};