import type { Deal, DealFilter } from '$lib/types/Deal';
import { keyValueToQueryString } from '$lib/util.js';

export async function fetchDeals(filters: DealFilter): Promise<Deal[]> {
    const qp = keyValueToQueryString(filters);
    const response = await fetch(`/api/deals?${qp}`);
    if (!response.ok) {
        throw new Error('Failed to fetch deals');
    }
    return response.json();
}
