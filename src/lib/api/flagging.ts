import { api } from "$lib/core/api.js";
import type { FlaggingOption, FlaggedProductWithSummary } from "$lib/types/Flagging.js";

export function getFlaggingOptions() {
    return api.get<FlaggingOption[]>('/api/flagoptions');
}

export function fetchFlaggings() {
    return api.get<FlaggedProductWithSummary>('/api/productflags');
}

export function resolveFlagging(externalProductId: number, flagOptionId: number) {
    return api.put(`/api/externals/${externalProductId}/flag/${flagOptionId}/resolve`);
}
