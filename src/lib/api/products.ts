import { api, type PageOptions } from '$lib/core/api.js';
import { paginatedApi } from '$lib/core/paginatedapi.svelte.js';
import type {
    ExternalProductMetadata,
    ExternalProductPrice,
    Product,
    ProductVariant,
    ProductWithLastPrice,
} from '$lib/types/Product';

export function fetchProducts(
    options: {
        include_prices?: boolean;
        name?: string;
        category_id?: number;
        manufacturer_id?: number;
        min_price?: number;
        max_price?: number;
        sort_by?: '+price' | '-price' | '+name' | '-name';
        abortSignal?: AbortSignal;
    },
    pageOptions: Partial<PageOptions> = { page: 'first' },
) {
    let url = '/api/products';
    const {
        include_prices,
        name,
        category_id,
        manufacturer_id,
        min_price,
        max_price,
        sort_by,
        abortSignal
    } = options;
    const queryParams: URLSearchParams = new URLSearchParams();
    if (include_prices) {
        queryParams.set('include_prices', 'true');
    }
    if (name) {
        queryParams.set('name', name);
    }
    if (category_id) {
        queryParams.set('category_id', category_id.toString());
    }
    if (manufacturer_id) {
        queryParams.set('manufacturer_id', manufacturer_id.toString());
    }
    if (min_price) {
        queryParams.set('price[gt]', min_price.toString());
    }
    if (max_price) {
        queryParams.set('price[lt]', max_price.toString());
    }
    if (sort_by) {
        const direction = sort_by.startsWith('+') ? 'asc' : 'desc';
        queryParams.set('sort[0][key]', sort_by.slice(1));
        queryParams.set('sort[0][direction]', direction);
    }

    if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
    }
    return paginatedApi.paginatedGet<ProductWithLastPrice[]>(url, pageOptions, { signal: abortSignal });
}

export function fetchProductById(id: string | number, superFetch?: typeof fetch) {
    return api.get<Product>(`/api/products/${id}`, { superFetch });
}

export function updateProductName(id: number, newName: string) {
    return api.put(`/api/products/${id}`, { name: newName });
}

export function fetchExternalProductsByInternalId(
    internalId: number, variants?: Record<string, string | number> | null, superFetch?: typeof fetch
) {
    let url = `/api/products/${internalId}/externals`;
    if (variants) {
        const variantQs = Object.keys(variants).map(key => `variants[${key}]=${variants[key]}`).join('&');
        url += `?${variantQs}`;
    }
    return api.get<ExternalProductOfInternal[]>(url, { superFetch });
}

export function fetchExternalProductPrices(externalId: number, superFetch?: typeof fetch) {
    return api.get<ExternalProductPrice[]>(`/api/externals/${externalId}/prices`, { superFetch });
}

export interface Category {
    id: number;
    name: string;
}

export function fetchCategories(superFetch?: typeof fetch) {
    return api.get<Category[]>('/api/categories', { superFetch });
}

export function fetchExternalProductMetadata(externalId: number, superFetch?: typeof fetch) {
    return api.get<ExternalProductMetadata[]>(`/api/externals/${externalId}/metadata`, { superFetch });
}

export function fetchVariantAttributes(productId: number | string, superFetch?: typeof fetch) {
    return api.get<ProductVariant[]>(`/api/products/${productId}/variantattributes`, { superFetch });
}

export function flagIncorrectGrouping(externalId: number, flagOptions: string[]) {
    return api.post(`/api/externals/${externalId}/flag`, { flag_option_ids: flagOptions });
}

export function trackProduct(productId: number, targetPrice: number) {
    return api.post(`/api/products/${productId}/track`, { target_price: targetPrice });
}

export function untrackProduct(productId: number) {
    return api.delete(`/api/products/${productId}/track`);
}

export function mergeProducts(internalProductId: number, mergeProductId: number) {
    return api.put(`/api/products/${internalProductId}/merge`, { productIds: [mergeProductId] })
}

export function unmergeProducts(internalProductId: number, externalProductId: number) {
    return api.put<{ success: true, newInternalId: number, externalProductId: number }>
        (`/api/products/${internalProductId}/unmerge`, { external_product_id: externalProductId });
}

export interface ExternalProduct {
    id: number;
    internal_product_id: number;
    category_id: number;
    website_id: number;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
    parsed_metadata: Record<string, any>;
    product_id: number;
    latest_price: number;
    is_available: boolean;
}

export interface ExternalProductOfInternal {
    external_product_id: number,
    website_id: number,
    name: string,
    url: string,
    image_urls: string[],
}

export function fetchExternalProducts(filter: {
    brandId?: number | 'all', categoryId?: number | 'all',
    url?: string,
    minPrice?: number, maxPrice?: number,
    metadata?: Record<string, any>
} = {}, superFetch?: typeof fetch) {
    const params = new URLSearchParams();
    if (filter.brandId && filter.brandId !== 'all')
        params.append('manufacturer_id', filter.brandId.toString());
    if (filter.categoryId && filter.categoryId !== 'all')
        params.append('category_id', filter.categoryId.toString());
    if (filter.minPrice) params.append('price[gt]', `${filter.minPrice}`);
    if (filter.maxPrice) params.append('price[lt]', `${filter.maxPrice}`);
    if (filter.url) params.append('url', filter.url);

    Object.entries(filter.metadata ?? {}).forEach(([key, value]) => {
        if (value?.min || value?.max) {
            if (value?.min) {
                params.append(`metadata[${key}][gt]`, value.min);
            }
            if (value?.max) {
                params.append(`metadata[${key}][lt]`, value.max);
            }
        } else if (value && value !== 'all') {
            params.append(`metadata[${key}]`, value.toString());
        }
    });
    return api.get<ExternalProduct[]>(`/api/externals?${params.toString()}`, { superFetch });
}

export function fetchExternalPricesOfProduct(internalProductId: number, superFetch?: typeof fetch) {
    return api.get<{
        id: number,
        url: string,
        name: string,
        price: number,
        is_available: boolean,
        website: string,
        last_checked_at: string
    }[]>(`/api/products/${internalProductId}/externalprices`, { superFetch });
}

export type ProductBadge =
    | {
          key: 'new_product';
          label: 'New Product';
      }
    | {
          key: 'lowest_price';
          label: 'Lowest Price';
      };
export function fetchExternalProductBadges(externalProductId: number, superFetch?: typeof fetch) {
    return api.get<ProductBadge[]>(`/api/externals/${externalProductId}/badges`, { superFetch });
}

export function fetchSimilarExternalProducts(externalProductId: number, superFetch?: typeof fetch) {
    return api.get<ExternalProductOfInternal[]>(`/api/externals/${externalProductId}/similar`, { superFetch });
}

export function updateExternalProductMetadata(externalProductId: number, llmMetadata: Record<string, any>) {
    return api.put(`/api/externals/${externalProductId}`, { llm_metadata: llmMetadata });
}
