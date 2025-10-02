interface ProductPrice {
    price: number,
    created_at: string,
    website_id: number,
    is_available: boolean,
}

export interface Product {
    id: number;
    name: string;
    category_id: number;
    manufacturer_id: number;
    category_name?: string;
    manufacturer_name?: string;
}

export interface ProductWithLastPrice extends Product {
    prices: ProductPrice[]
    lowest_available_price?: number;
}

export interface WebsitePrice {
    website_id: string;
    price: number;
    url: string;
    website: string;
    created_at: string;
    is_available: boolean;
    product_name: string;
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
    product_name: string;
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

export interface PotentialProductMatch {
    product_id: number,
    product_name: string,
    similar_products: {
        product_id: number,
        product_name: string,
        similarity_score: number,
    }[],
}

export interface TrackedProduct {
    product_id: number,
    name: string,
    target_price: number,
    current_price: number,
}

export interface ExternalProductPrice {
    external_product_id: number,
    is_available: boolean,
    price: number,
    created_at: string,
    updated_at: string,
}

export interface ProductVariant {
    name: string;
    values: {
        value: string;
        display_text: string;
    }[];
    display_text: string;
    unit: string;
}

export interface ExternalProductMetadata {
    name: string;
    value: string;
    unit: string;
    name_display_text: string;
    value_display_text: string;
}
