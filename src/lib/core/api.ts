import { ResultAsync, err, ok, safeTry } from "neverthrow";

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

function fetchResult<T = any, E = any>(url: string, options?: RequestInit & { superFetch?: typeof fetch }): ResultAsync<T, ApiError<E>> {
    const fetchF = options?.superFetch ?? fetch;
    return safeTry(async function* () {
        const response = yield* (await ResultAsync.fromPromise(fetchF(url, options), (error) => {
            return new ApiError(`Failed to fetch ${url}`, 0, error);
        }));
        const data = yield* (await ResultAsync.fromPromise(response.json(), (error) => {
            return new ApiError(`Failed to parse response`, response.status, error as E);
        }));
        if (response.ok) {
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
        return fetchResult<T, E>(url, { method: 'GET', ...options });
    },
    post: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers ? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'POST', body: JSON.stringify(data), headers, ...restOptions });
    },
    put: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers ? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'PUT', body: JSON.stringify(data), headers, ...restOptions });
    },
    delete: <T, E = any>(url: string, options?: RequestInit) => {
        return fetchResult<T, E>(url, { method: 'DELETE', ...options });
    }
}
