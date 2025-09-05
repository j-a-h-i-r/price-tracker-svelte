import { api } from '$lib/core/api.js';
import type { ExternalProduct, ExternalProductMetadata, ExternalProductPrice, PotentialProductMatch, Product, ProductWithLastPrice, ProductWithPrice, ProductWithWebsite } from '$lib/types/Product';

export function fetchProducts(
    options: {
        limit?: number;
        include_prices?: boolean;
    } = {}
) {
    let url = '/api/products';
    const { limit, include_prices } = options;
    const queryParams: URLSearchParams = new URLSearchParams();
    if (limit) {
        queryParams.set('limit', limit.toString());
    }
    if (include_prices) {
        queryParams.set('include_prices', 'true');
    }
    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }

    return api.get<ProductWithLastPrice[]>(url);
}

export function fetchProductById(id: string | number) {
    return api.get<Product>(`/api/products/${id}`);
}

export function fetchExternalProductsByInternalId(
    internalId: number, variants?: Record<string, string | number> | null
) {
    let url = `/api/products/${internalId}/externals`;
    if (variants) {
        const variantQs = Object.keys(variants).map(key => `variants[${key}]=${variants[key]}`).join('&');
        url += `?${variantQs}`;
    }
    return api.get<ExternalProduct[]>(url);
}

export function fetchExternalProductPrices(externalId: number) {
    return api.get<ExternalProductPrice[]>(`/api/externals/${externalId}/prices`);
}

export interface Category {
    id: number;
    name: string;
}

export function fetchCategories() {
    return api.get<Category[]>('/api/categories');
}

export function fetchPotentiallySimilarProducts({ minScore }: { minScore: number }) {
    return api.get<PotentialProductMatch[]>(`/api/potentialsimilar?min_score=${minScore}`);
}

export function fetchExternalProductMetadata(externalId: number) {
    return api.get<ExternalProductMetadata[]>(`/api/externals/${externalId}/metadata`);
}

export function fetchVariantAttributes(productId: number) {
    return api.get(`/api/products/${productId}/variantattributes`);
}

export function flagIncorrectGrouping(externalId: number, flagOptions: string[]) {
    return api.post(`/api/externals/${externalId}/flag`, { flag_option_ids: flagOptions });
}
