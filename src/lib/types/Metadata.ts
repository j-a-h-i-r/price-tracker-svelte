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


interface MetadataFilterBase {
    key: string;
    unit?: string;
    display_text: string;
    type: 'range' | 'set' | 'boolean';
}

interface MetadataFilterRange extends MetadataFilterBase {
    type: 'range';
    value: {
        min: number;
        max: number;
    }
}

interface MetadataFilterBoolean extends MetadataFilterBase {
    type: 'boolean';
}

interface MetadataFilterSet extends MetadataFilterBase {
    type: 'set';
    value: string[];
}

export type MetadataFilter = MetadataFilterRange | MetadataFilterBoolean | MetadataFilterSet;