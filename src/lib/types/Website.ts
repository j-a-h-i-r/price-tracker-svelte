export interface WebsiteSummary {
    total_products: number;
    total_categories: number;
}

export interface Website {
    id: number;
    name: string;
    url: string;
}

export interface WebsiteWithSummary extends Website {
    summary?: WebsiteSummary;
    newProductsCount?: number;
}