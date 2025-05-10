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

    isTracked(productId: string) {
        return this.#trackedProducts.some((product) => product.product_id === Number(productId));
    }

    refresh() {
        fetch('/api/user/products')
        .then((response) => {
            if (!response.ok) {
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
