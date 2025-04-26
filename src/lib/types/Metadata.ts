export interface MetadataDetail {
    id: string;
    internal_product_id: string;
    name: string;
    category_id: string,
    website_id: string,
    raw_metadata: Record<string, string>,
}