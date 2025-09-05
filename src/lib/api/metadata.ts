import { api } from '$lib/core/api.js';
import type { MetadataDetail } from '$lib/types/Metadata';

export interface MetadataFilter {
    key: string;
    displayName: string;
    type: 'range' | 'boolean' | 'string';
    unit?: string;  // For range type filters
    values?: string[];  // For string type filters
    range?: {
        min: number;
        max: number;
    }
}

export function fetchMetadataFilters() {
    return api.get<MetadataFilter[]>('/api/filters')
}

export function fetchMetadatas({
    category_id,
    website_id,
}: {
    category_id?: string;
    website_id?: string;
}){
    // Construct the URL with query parameters
    let url = '/api/metadatas';
    const params: string[] = [];
    if (category_id) {
        params.push(`category_id=${category_id}`);
    }
    if (website_id) {
        params.push(`website_id=${website_id}`);
    }
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    return api.get<{metadata: string; count: number}[]>(url.toString());
}

export function fetchMetadataDetail(name: string, category_id?: string) {
    let url = `/api/metadatas/${encodeURIComponent(name)}/products`;
    if (category_id) {
        url += `?category_id=${category_id}`;
    }
    return api.get<MetadataDetail[]>(url);
}