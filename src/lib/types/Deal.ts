export interface Deal {
    product_id: string;
    product_name: string;
    product_url: string;
    website_name: string;
    current_price: number;
    max_price_last_days: number;
    current_price_date: string;
    is_available: boolean;
    category_id: number;
    manufacturer_id: number;
}

export interface DealFilter extends Record<string, string | number | boolean | undefined | null> {
    days?: number;
    sortby?: 'value' | 'percentage';
    manufacturer_id?: number | string;
    category_id?: number | string;
}
