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
        return fetch('/api/me/products')
        .then((response) => {
            if (!response.ok) {
                if (response.status === 401) {
                    toasts.error('Login expired. Please log in again to view your tracked products');
                    return userState.signOut();
                }
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((data) => {
            this.#trackedProducts = data;
        })
        .catch((error) => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }
}

export const trackedProducts = new TrackedProducts();
