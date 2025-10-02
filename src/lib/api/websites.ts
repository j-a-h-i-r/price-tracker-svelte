import { api } from "$lib/core/api.js";
import type { Website, WebsiteSummary } from "$lib/types/Website.js";

export function fetchWebsites(superFetch?: typeof fetch) {
    return api.get<Website[]>('/api/websites', { superFetch });
}

export function fetchWebsiteSummary(websiteId: number) {
    return api.get<WebsiteSummary>(`/api/websites/${websiteId}/summary`);
}

export function fetchWebsiteNewProductsCount(websiteId: number, days: number = 7) {
    return api.get<number>(`/api/websites/${websiteId}/new?days=${days}`);
}