import {
    fetchExternalProductBadges,
    fetchExternalProductMetadata,
    fetchExternalProductPrices,
    fetchExternalProducts,
    type Category,
    type ExternalProduct,
    type ProductBadge,
} from '$lib/api/products.js';
import type { ExternalProductMetadata, ExternalProductPrice } from '$lib/types/Product.js';
import type { Website } from '$lib/types/Website.js';
import { ResultAsync } from 'neverthrow';
import type { PageServerLoad } from './$types';

type PageData = {
    exists: boolean;
    url: string | null;
    error: string | null;
    externalProduct?: ExternalProduct;
    prices: ExternalProductPrice[];
    metadata: ExternalProductMetadata[];
    badges: ProductBadge[];
    website: Website | null;
    category: Category | null;
};

export const load: PageServerLoad<PageData> = async ({ params, fetch, parent }) => {
    const rawSlug = params.slug;
    if (!rawSlug) {
        return {
            exists: false,
            url: null,
            error: 'Missing URL parameter.',
            prices: [],
            metadata: [],
            badges: [],
            website: null,
            category: null,
        } satisfies PageData;
    }

    const productUrl = decodeURIComponent(rawSlug);
    let error: string | null = null;
    const parentData = await parent();

    const products = await fetchExternalProducts({ url: productUrl }, fetch).match(
        (result) => result,
        (err) => {
            error = err.message ?? 'Failed to fetch product details.';
            return [] as ExternalProduct[];
        }
    );

    const externalProduct = products[0];
    if (!externalProduct) {
        return {
            exists: false,
            url: productUrl,
            error,
            prices: [],
            metadata: [],
            badges: [],
            website: null,
            category: null,
        } satisfies PageData;
    }

    const [prices, metadata, badges] = await ResultAsync.combine([
        fetchExternalProductPrices(externalProduct.id, fetch),
        fetchExternalProductMetadata(externalProduct.id, fetch),
        fetchExternalProductBadges(externalProduct.id, fetch),
    ]).match(
        (values) => values,
        (err) => {
            error = err.message ?? 'Failed to fetch supporting data.';
            return [[], [], []] as [ExternalProductPrice[], ExternalProductMetadata[], ProductBadge[]];
        }
    );

    return {
        exists: true,
        url: productUrl,
        error,
        externalProduct,
        prices,
        metadata,
        badges,
        website: parentData.websiteMap?.get(externalProduct.website_id) ?? null,
        category: parentData.categoryMap?.get(externalProduct.category_id) ?? null,
    } satisfies PageData;
};
