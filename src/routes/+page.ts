import type { PageLoad } from './$types';
import { fetchStats } from '$lib/api/stats.js';

export const load: PageLoad = async ({ fetch }) => {
    const stats = await fetchStats(fetch).unwrapOr({ products: 0, categories: 0, websites: 0 });
    return {
        stats,
    };
};
