export interface MetadataDetail {
    id: number;
    internal_product_id: number;
    name: string;
    category_id: number,
    website_id: number,
    raw_metadata: Record<string, string>,
    external_manufacturer_id: number,
    created_at: string,
    updated_at: string,
    parsed_metadata: Record<string, string|number|boolean>,
    manual_metadata: Record<string, string|number|boolean>,
}
