import type { FlaggingOption, Flagging } from "$lib/types/Flagging.js";

export async function getFlaggingOptions(): Promise<FlaggingOption[]> {
    return fetch('/api/flagoptions')
        .then((res) => res.json());
}

export async function fetchFlaggings(): Promise<Flagging[]> {
    const response = await fetch('/api/productflags');
    if (!response.ok) {
        throw new Error('Failed to fetch flaggings');
    }
    return response.json();
}

export async function resolveFlagging(flaggingId: number): Promise<void> {
    const response = await fetch(`/api/admin/flaggings/${flaggingId}/resolve`, {
        method: 'PUT',
    });
    if (!response.ok) {
        throw new Error('Failed to resolve flagging');
    }
}
