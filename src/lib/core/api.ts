import { ResultAsync, err } from "neverthrow";

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
            // Response is ok. If parsing works then return ok else return error
            return ResultAsync.fromPromise<T, ApiError<E>>(response.json() as Promise<T>, (error) => {
                return new ApiError(`Failed to parse response`, response.status, error as E);
            })
        }
        // Response is not ok so we always return error. If parsing works then 
        // included parsed response in the error as well
        return ResultAsync
            .fromPromise(response.json(), (error) => {
                return new ApiError(`Failed to parse response`, response.status, error as E);
            })
            .andThen((error) => err(new ApiError(`HTTP error! status: ${response.status}`, response.status, error)))
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
