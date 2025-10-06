import { getMyTrackedProducts } from "$lib/api/me.js";
import type { TrackedProduct } from "$lib/types/Product.js";

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
        .andTee((products) => {
            this.#trackedProducts = products;
        });
    }
}

export const trackedProducts = new TrackedProducts();
