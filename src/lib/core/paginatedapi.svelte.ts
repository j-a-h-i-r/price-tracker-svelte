import { api } from "./api.js";

interface PaginatedApiResponse<T> {
    data: T,
    next_token?: string,
    prev_token?: string,
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

export const paginatedApi = {
    paginatedGet: <T, E = any>(url: string, { limit = 50 }: { limit?: number }, options?: RequestInit) => {
        let next_token: string | undefined = $state(undefined);
        let prev_token: string | undefined = $state(undefined);

        return {
            hasNext: () => !!next_token,
            hasPrev: () => !!prev_token,
            first: () => {
                const queryParams: URLSearchParams = new URLSearchParams();
                queryParams.set('page', 'first');
                queryParams.set('limit', limit.toString());
                const fullUrl = appendQueryParams(url, queryParams);
                return api.get<PaginatedApiResponse<T>, E>(fullUrl, options).andTee((resp) => {
                    next_token = resp?.next_token;
                    prev_token = undefined;
                });
            },
            next: () => {
                if (!next_token) throw new Error('No next page available');
                const queryParams: URLSearchParams = new URLSearchParams();
                queryParams.set('page', 'next');
                queryParams.set('limit', limit.toString());
                queryParams.set('next_token', next_token);
                const fullUrl = appendQueryParams(url, queryParams);
                return api.get<PaginatedApiResponse<T>, E>(fullUrl, options).andTee((resp) => {
                    next_token = resp?.next_token;
                    prev_token = resp?.prev_token;
                });
            },
            prev: () => {
                if (!prev_token) throw new Error('No previous page available');
                const queryParams: URLSearchParams = new URLSearchParams();
                queryParams.set('page', 'prev');
                queryParams.set('limit', limit.toString());
                queryParams.set('prev_token', prev_token);
                const fullUrl = appendQueryParams(url, queryParams);
                return api.get<PaginatedApiResponse<T>, E>(fullUrl, options).andTee((resp) => {
                    next_token = resp?.next_token;
                    prev_token = resp?.prev_token;
                });
            },
            last: () => {
                const queryParams: URLSearchParams = new URLSearchParams();
                queryParams.set('page', 'last');
                queryParams.set('limit', limit.toString());
                const fullUrl = appendQueryParams(url, queryParams);
                return api.get<PaginatedApiResponse<T>, E>(fullUrl, options).andTee((resp) => {
                    next_token = undefined;
                    prev_token = resp?.prev_token;
                });
            },
        }
    },
}