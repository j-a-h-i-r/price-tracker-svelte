export interface Product {
    id: string;
    name: string;
    category_id: number;
    metadata: Record<string, string>;
    price: number;
    description: string;
    imageUrl: string;
}

export interface WebsitePrice {
    website_id: string;
    price: number;
    url: string;
    website: string;
    created_at: string;
    is_available: boolean;
}

export interface ProductWithPrice extends Product {
    prices: WebsitePrice[];
}