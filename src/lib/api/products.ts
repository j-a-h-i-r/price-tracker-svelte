import type { Product } from '$lib/types/Product';

export async function fetchProducts(): Promise<Product[]> {
    const response = await fetch('api/products');
    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }
    return response.json();
}

export interface Category {
    id: string;
    name: string;
}

export async function fetchCategories(): Promise<Category[]> {
    const response = await fetch('api/categories');
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
}

