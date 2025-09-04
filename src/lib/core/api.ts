import { ResultAsync, err, ok, safeTry } from "neverthrow";

class ApiError<D = any> extends Error {
    constructor(message: string, public status: number, public data?: D) {
        super(message);
        this.name = 'ApiError';
    }
}

function fetchResult<T = any, E = any>(url: string, options?: RequestInit): ResultAsync<T, ApiError<E>> {
    return safeTry(async function *() {
        const response = yield * (await ResultAsync.fromPromise(fetch(url, options), (error) => {
            return new ApiError(`Failed to fetch ${url}`, 0, error);
        }));
        const data = yield * (await ResultAsync.fromPromise(response.json(), (error) => {
            return new ApiError(`Failed to parse response`, response.status, error as E);
        }));
        if (response.ok) {
            return ok(data);
        } else {
            return err(new ApiError(`HTTP error! status: ${response.status}`, response.status, data));
        }
    })
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
