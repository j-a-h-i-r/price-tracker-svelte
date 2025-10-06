import { ResultAsync, err, ok, safeTry } from "neverthrow";
import { PUBLIC_API_URL } from '$env/static/public';

interface FirstPage {
    page: 'first';
}
interface LastPage {
    page: 'last';
}
interface NextPage {
    page: 'next';
    next_token: string;
}
interface PrevPage {
    page: 'prev';
    prev_token: string;
}

export type PageOptions = (FirstPage | LastPage | NextPage | PrevPage) & {
    limit?: number;
}

export class ApiError<D = any> extends Error {
    constructor(message: string, public status: number, public data?: D) {
        super(message);
        this.name = 'ApiError';
    }
}

function fetchResult<T = any, E = any>(relativeUrl: string, options?: RequestInit & { superFetch?: typeof fetch }): ResultAsync<T, ApiError<E>> {
    // This is unfortunately needed to make this common api function work in both
    // server and client contexts
    // See: https://github.com/sveltejs/kit/discussions/5173
    // We are directly calling fetch here which is `window.fetch`. So when 
    // this code runs on the server it will also use that. But we need to use
    // trigger event.fetch so svelte can intercept it in the handleFetch hook.
    // That hook is used so we can rewrite the API URL to the internal API to
    // avoid roundtrips. 
    const fetchF = options?.superFetch ?? fetch;
    const fullUrl = PUBLIC_API_URL + relativeUrl;
    return safeTry(async function* () {
        const response = yield* (await ResultAsync.fromPromise(fetchF(fullUrl, options), (error) => {
            return new ApiError(`Failed to fetch ${fullUrl}`, 0, error);
        }));
        const data = yield* (await ResultAsync.fromPromise(response.json(), (error) => {
            return new ApiError(`Failed to parse response`, response.status, error as E);
        }));
        if (response.ok) {
            console.log('Response type', response.type);
            return ok(data);
        } else {
            return err(new ApiError(`HTTP error! status: ${response.status}`, response.status, data));
        }
    })
}

function appendQueryParams(url: string, params: URLSearchParams): string {
    if (params.toString()) {
        if (url.includes('?')) {
            url += `&${params.toString()}`;
        } else {
            url += `?${params.toString()}`;
        }
    }
    return url;
}

export const api = {
    get: <T, E = any>(url: string, options?: RequestInit & { superFetch?: typeof fetch }) => {
        return fetchResult<T, E>(url, { method: 'GET', credentials: 'include', ...options });
    },
    post: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers ? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'POST', credentials: 'include', body: JSON.stringify(data), headers, ...restOptions });
    },
    put: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers ? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'PUT', credentials: 'include', body: JSON.stringify(data), headers, ...restOptions });
    },
    delete: <T, E = any>(url: string, options?: RequestInit) => {
        return fetchResult<T, E>(url, { method: 'DELETE', credentials: 'include', ...options });
    }
}
