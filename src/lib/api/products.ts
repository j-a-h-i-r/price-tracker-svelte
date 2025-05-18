import type { ExternalProduct, ExternalProductPrice, PotentialProductMatch, Product, ProductWithLastPrice, ProductWithPrice, ProductWithWebsite } from '$lib/types/Product';

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

export async function fetchExternalProductsByInternalId(internalId: number): Promise<ExternalProduct[]> {
    const url = `/api/products/${internalId}/externals`;
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
    id: string;
    name: string;
}

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch('/api/categories');
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
}

export async function fetchPotentiallySimilarProducts(): Promise<PotentialProductMatch[]> {
    const response = await fetch('/api/potentialsimilar');
    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }
    return response.json();
}
