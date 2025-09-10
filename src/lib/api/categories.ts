import { api } from "$lib/core/api.js";

interface Category {
    id: number;
    name: string;
}

export function getCategories() {
    return api.get<Category[]>('/api/categories');
}

export function getCategoryNewProductsCount(categoryId: number, days: number = 7) {
    return api.get<number>(`/api/categories/${categoryId}/new?days=${days}`);
}
