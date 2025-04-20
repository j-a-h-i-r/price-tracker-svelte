import type { MetadataDetail } from '$lib/types/Metadata';

export function fetchMetadatas({
    category_id,
    website_id,
}: {
    category_id?: string;
    website_id?: string;
}): Promise<string[]> {
    // Construct the URL with query parameters
    let url = '/api/metadatas';
    let params: string[] = [];
    if (category_id) {
        params.push(`category_id=${category_id}`);
    }
    if (website_id) {
        params.push(`website_id=${website_id}`);
    }
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    return fetch(url.toString())
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch metadatas');
            }
            return response.json();
        })
        .catch((error) => {
            console.error(error);
            throw error;
        });
}

export function fetchMetadataDetail(name: string, category_id?: string): Promise<MetadataDetail[]> {
    let url = `/api/metadatas/${encodeURIComponent(name)}`;
    if (category_id) {
        url += `?category_id=${category_id}`;
    }
    return fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch metadata detail');
            }
            return response.json();
        })
        .catch((error) => {
            console.error(error);
            throw error;
        });
}