interface WebsiteSummary {
    total_products: number;
    total_categories: number;
}

export interface Website {
    id: string;
    name: string;
    product_count?: number;
    url?: string;
    summary?: WebsiteSummary;
}

export async function fetchWebsites(): Promise<Website[]> {
    const response = await fetch('/api/websites');
    if (!response.ok) {
        throw new Error('Failed to fetch websites');
    }
    return response.json();
}

export async function fetchWebsiteSummary(websiteId: string): Promise<WebsiteSummary> {
    const response = await fetch(`/api/websites/${websiteId}/summary`);
    if (!response.ok) {
        throw new Error('Failed to fetch website summary');
    }
    return response.json();
}