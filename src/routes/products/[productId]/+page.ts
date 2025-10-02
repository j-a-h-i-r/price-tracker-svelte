import { fetchExternalProductsByInternalId, fetchProductById, fetchVariantAttributes } from '$lib/api/products.js'
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ params, fetch }) => {
    const productId = Number(params.productId);
    const product = await fetchProductById(productId, fetch).unwrapOr(null);
    const variantAttributes = await fetchVariantAttributes(productId, fetch).unwrapOr([]);
    const externalProducts = await fetchExternalProductsByInternalId(productId, {}, fetch).unwrapOr([]);
    return {
        exists: product !== null,
        product,
        variantAttributes,
        externalProducts,
    };
}
