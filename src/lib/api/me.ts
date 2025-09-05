import { api } from "$lib/core/api.js";
import type { TrackedProduct } from "$lib/types/Product.js";

export function getMyTrackedProducts() {
    return api.get<TrackedProduct[]>('/api/me/products');
}