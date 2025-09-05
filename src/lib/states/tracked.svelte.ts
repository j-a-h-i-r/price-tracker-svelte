import { getMyTrackedProducts } from "$lib/api/me.js";
import { userState } from "$lib/shared.svelte.js";
import type { TrackedProduct } from "$lib/types/Product.js";
import { toasts } from "./toast.js";

class TrackedProducts {
    #trackedProducts: TrackedProduct[] = $state([]);
    constructor() {
        this.#trackedProducts = [];
    }

    get products() {
        return this.#trackedProducts;
    }

    clear() {
        this.#trackedProducts = [];
    }

    isTracked(productId: number) {
        return this.#trackedProducts.some((product) => product.product_id === Number(productId));
    }

    getProduct(productId: number) {
        return this.#trackedProducts.find((product) => product.product_id === Number(productId));
    }

    refresh() {
        return getMyTrackedProducts()
        .match(
            (products) => {
                this.#trackedProducts = products;
            },
            (err) => {
                if (err.status === 401) {
                    toasts.error('Login expired. Please log in again to view your tracked products');
                    return userState.signOut();
                }
            },
        )
    }
}

export const trackedProducts = new TrackedProducts();
