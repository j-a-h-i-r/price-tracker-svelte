export interface FlaggingOption {
    id: string;
    description: string;
}

export interface Flagging {
    id: number;
    internal_product_id: number;
    external_product_id: number;
    external_product_name: string;
    external_product_url: string;
    description: string;
    created_at: string;
}
