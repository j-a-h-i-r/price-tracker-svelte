import { api } from "$lib/core/api.js";

interface Category {
    id: number;
    name: string;
}

export function getCategories() {
    return api.get<Category[]>('/api/categories');
}
