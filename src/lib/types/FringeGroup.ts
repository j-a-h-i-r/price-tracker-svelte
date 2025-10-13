export interface FringeGroup {
    group_id: number;
    external_product_id: number;
    internal_product_id: number;
    merged_internal_product_id: number | null;
    group_name: string;
    external_product_name: string;
    count_in_all_groups: string; 
    count_in_this_group: string;
    gp_percent: string;
    merged: boolean;
}
