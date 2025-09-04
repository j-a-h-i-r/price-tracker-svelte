export interface FlaggingOption {
    id: number;
    description: string;
}

export interface Flagging {
    external_product_id: number;
    internal_product_id: number;
    external_product_name: string;
    flags: {
        flag_option_id: number;
        resolved_count: number;
        pending_count: number;
    }[];
}

export interface FlaggedProductWithSummary {
    pending_count: number;
    resolved_count: number;
    products: Flagging[];
}
