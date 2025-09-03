import { ok, ResultAsync } from "neverthrow";

class ApiError<D = any> extends Error {
    constructor(message: string, public status: number, public data?: D) {
        super(message);
        this.name = 'ApiError';
    }
}

function fetchResult<T = any, E = any>(url: string, options?: RequestInit): ResultAsync<T, ApiError<E>> {
    return ResultAsync.fromSafePromise(fetch(url, options))
    .andThen((response) => {
        if (response.ok) {
            return ok(response.json() as Promise<T>);
        }
        return ResultAsync.fromSafePromise(response.json()).mapErr((error) => {
            return new ApiError(`HTTP error! status: ${response.status}`, response.status, error);
        });
    });
}

export const api = {
    get: <T, E = any>(url: string, options?: RequestInit) => {
        return fetchResult<T, E>(url, { method: 'GET', ...options });
    },
    post: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'POST', body: JSON.stringify(data), headers, ...restOptions });
    },
    put: <T, E = any>(url: string, data: any = {}, options?: RequestInit) => {
        let { headers, ...restOptions } = options ?? {};
        headers = headers? new Headers(headers) : new Headers();
        if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetchResult<T, E>(url, { method: 'PUT', body: JSON.stringify(data), headers, ...restOptions });
    },
    delete: <T, E = any>(url: string, options?: RequestInit) => {
        return fetchResult<T, E>(url, { method: 'DELETE', ...options });
    }
}
