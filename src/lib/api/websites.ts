import { api } from "$lib/core/api.js";
import type { Website, WebsiteStat } from "$lib/types/Website.js";

export function fetchWebsites(superFetch?: typeof fetch) {
    return api.get<Website[]>('/api/websites', { superFetch });
}

export function fetchWebsiteStats(websiteId: number) {
    return api.get<WebsiteStat>(`/api/websites/${websiteId}/stats`);
}

export function fetchWebsiteNewProductsCount(websiteId: number, days: number = 7) {
    return api.get<number>(`/api/websites/${websiteId}/new?days=${days}`);
}