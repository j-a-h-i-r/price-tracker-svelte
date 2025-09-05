import { api } from "$lib/core/api.js";

interface Stats {
    products: number;
    categories: number;
    websites: number;
}

export function fetchStats() {
    return api.get<Stats>('/api/stats');
}
