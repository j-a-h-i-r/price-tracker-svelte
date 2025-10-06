import { api } from "$lib/core/api.js";
import type { TrackedProduct } from "$lib/types/Product.js";

export interface UserInfo {
    email: string;
    isAdmin: boolean;
}

export function getMyInfo(superFetch?: typeof fetch) {
    return api.get<UserInfo>('/api/me', { superFetch });
}

export function getMyTrackedProducts(superFetch?: typeof fetch) {
    return api.get<TrackedProduct[]>('/api/me/products', { superFetch });
}
