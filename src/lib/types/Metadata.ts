export interface MetadataDetail {
    id: string;
    internal_product_id: string;
    name: string;
    category_id: string,
    website_id: string,
    raw_metadata: Record<string, string>,
    external_manufacturer_id: number,
    created_at: string,
    updated_at: string,
    parsed_metadata: Record<string, string|number|boolean>,
    manual_metadata: Record<string, string|number|boolean>,
}
