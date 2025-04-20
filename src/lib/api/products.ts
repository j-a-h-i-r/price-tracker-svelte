import type { Product, ProductWithPrice, ProductWithWebsite } from '$lib/types/Product';

export async function fetchProducts(): Promise<Product[]> {
    const response = await fetch('api/products');
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

