export interface GeneratedSpec {
    external_product_id: number;
    name: string;
    metadatas: GeneratedMetadata[];
}

export interface GeneratedMetadata {
    model: string;
    metadata: Record<string, unknown>;
}
