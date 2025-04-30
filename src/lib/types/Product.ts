export interface Product {
    id: number;
    name: string;
    category_id: number;
    raw_metadata: Record<string, string>;
    parsed_metadata: Record<string, string | number | boolean>;
}

export interface ProductWithLastPrice extends Product {
    prices: {
        price: number,
        created_at: string,
        website_id: number,
    }[]
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

export interface ProductWebsite {
    website_id: string;
    website_name: string;
    product_url: string;
}

export interface ProductWebsiteWithPrice extends ProductWebsite {
    price: number | null;
    is_available: boolean;
    created_at: string | null;
    saved_price: number | null;
}

export interface ProductWithWebsite {
    id: string;
    name: string;
    websites: ProductWebsite[];
}

export interface ProductWithWebsitePrice {
    id: string;
    name: string;
    websites: ProductWebsiteWithPrice[];
}
