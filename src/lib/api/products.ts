import type { ExternalProduct, ExternalProductMetadata, ExternalProductPrice, PotentialProductMatch, Product, ProductWithLastPrice, ProductWithPrice, ProductWithWebsite } from '$lib/types/Product';

export async function fetchProducts(limit?: number): Promise<ProductWithLastPrice[]> {
    let url = '/api/products';
    if (limit) {
        url += `?limit=${limit}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }
    return response.json();
}

export async function fetchProductById(id: string | number): Promise<Product> {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
}

export async function fetchProductPricesById(id: string | number): Promise<ProductWithPrice> {
    const response = await fetch(`/api/products/${id}/prices`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
}

export async function fetchProductWebsites(productId: string | number): Promise<ProductWithWebsite> {
    const response = await fetch(`/api/products/${productId}/websites`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
}

export async function fetchExternalProductsByInternalId(
    internalId: number, variants?: Record<string, string | number> | null
): Promise<ExternalProduct[]> {
    let url = `/api/products/${internalId}/externals`;
    if (variants) {
        const variantQs = Object.keys(variants).map(key => `variants[${key}]=${variants[key]}`).join('&');
        url += `?${variantQs}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch external products');
    }
    return response.json();
}

export async function fetchExternalProductPrices(internalId: number, externalId: number): Promise<ExternalProductPrice[]> {
    const url = `/api/products/${internalId}/externals/${externalId}/prices`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch product prices');
    }
    return response.json();
}

export interface Category {
    id: number;
    name: string;
}

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch('/api/categories');
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
}

export async function fetchPotentiallySimilarProducts({minScore}: {minScore: number}): Promise<PotentialProductMatch[]> {
    const response = await fetch(`/api/potentialsimilar?min_score=${minScore}`);
    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }
    return response.json();
}

export async function fetchExternalProductMetadata(internalId: number, externalId: number): Promise<ExternalProductMetadata[]> {
    const response = await fetch(`/api/products/${internalId}/externals/${externalId}/metadata`);
    if (!response.ok) {
        throw new Error('Failed to fetch external products');
    }
    return response.json();
}

export async function fetchVariantAttributes(productId: number) {
    try {
        const response = await fetch(`/api/products/${productId}/variantattributes`);
        if (!response.ok) throw new Error('Failed to fetch variants');
        return response.json();
    } catch (error) {
        console.error('Error fetching variants:', error);
    }
}

export async function flagIncorrectGrouping(internalId: number, externalId: number): Promise<void> {
    const response = await fetch(`/api/products/${internalId}/externals/${externalId}/flag`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Failed to flag incorrect grouping');
    }
}
