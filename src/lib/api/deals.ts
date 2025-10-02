import { api } from '$lib/core/api.js';
import type { Deal, DealFilter } from '$lib/types/Deal';
import { keyValueToQueryString } from '$lib/util.js';

export function fetchDeals(filters: DealFilter = {}, superFetch?: typeof fetch) {
    const qp = keyValueToQueryString(filters);
    const url = `/api/deals?${qp}`;
    return api.get<Deal[]>(url, { superFetch });
}
