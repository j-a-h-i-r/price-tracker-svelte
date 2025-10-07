import { fetchExternalPricesOfProduct, fetchExternalProductsByInternalId, fetchProductById, fetchVariantAttributes } from '$lib/api/products.js'
import { ResultAsync } from 'neverthrow';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, fetch }) => {
    const productId = Number(params.productId);
    const product = await fetchProductById(productId, fetch).orTee((error) => {console.log(error)}).unwrapOr(null);
    if (!product) {
        return { exists: false };
    }
    const resp = await ResultAsync.combine([
        fetchVariantAttributes(productId, fetch),
        fetchExternalProductsByInternalId(productId, {}, fetch),
        fetchExternalPricesOfProduct(productId, fetch),
    ])
    return {
        exists: true,
        product,
        variantAttributes: resp.isOk() ? resp.value[0] : [],
        externalProducts: resp.isOk() ? resp.value[1] : [],
        externalPrices: resp.isOk() ? resp.value[2] : [],
    };
}
