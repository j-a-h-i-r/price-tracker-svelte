import { api } from "$lib/core/api.js";

export interface Stats {
    products: number;
    categories: number;
    websites: number;
}

export function fetchStats(superFetch: typeof fetch = fetch) {
    return api.get<Stats>('/api/stats', { superFetch });
}
