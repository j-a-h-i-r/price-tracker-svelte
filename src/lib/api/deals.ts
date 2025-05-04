import type { Deal } from '$lib/types/Deal';

export async function fetchDeals(days: number = 7): Promise<Deal[]> {
    const response = await fetch(`/api/deals?days=${days}`);
    if (!response.ok) {
        throw new Error('Failed to fetch deals');
    }
    return response.json();
}