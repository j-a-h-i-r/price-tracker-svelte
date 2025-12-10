import {
    fetchExternalProductBadges,
    fetchExternalProductMetadata,
    fetchExternalProductPrices,
    fetchExternalProducts,
    fetchExternalProductsByInternalId,
    fetchSimilarExternalProducts,
    type Category,
    type ExternalProduct,
    type ExternalProductOfInternal,
    type ProductBadge,
} from '$lib/api/products.js';
import type { ExternalProductMetadata, ExternalProductPrice } from '$lib/types/Product.js';
import type { Website } from '$lib/types/Website.js';
import { ResultAsync } from 'neverthrow';
import type { PageServerLoad } from './$types';
import { error as loadError } from '@sveltejs/kit';

type ExternalProductWithDetails = ExternalProductOfInternal & {
    metadata: ExternalProductMetadata[];
    badges: ProductBadge[];
    latest_price: ExternalProductPrice | null;
}

type PageData = {
    exists: boolean;
    url: string | null;
    error: string | null;
    externalProduct?: ExternalProduct;
    prices: ExternalProductPrice[];
    metadata: ExternalProductMetadata[];
    badges: ProductBadge[];
    variantProducts: ExternalProductWithDetails[];
    similarProducts: ExternalProductWithDetails[];
    website: Website | null;
    category: Category | null;
    breadcrumb: Array<{ path: string; url: string }>;
};

export const load: PageServerLoad<PageData> = async ({ params, fetch, parent }) => {
    const rawSlug = params.slug;
    if (!rawSlug) {
        loadError(500, 'Missing URL parameter.');
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
        loadError(404, 'Product not found.');
    }

    const [prices, metadata, badges, siblingExternals, similarExternals] = await ResultAsync.combine([
        fetchExternalProductPrices(externalProduct.id, fetch),
        fetchExternalProductMetadata(externalProduct.id, fetch),
        fetchExternalProductBadges(externalProduct.id, fetch),
        fetchExternalProductsByInternalId(
            externalProduct.internal_product_id,
            {},
            fetch
        ),
        fetchSimilarExternalProducts(externalProduct.id, fetch),
    ]).match(
        (values) => values,
        (err) => {
            error = err.message ?? 'Failed to fetch supporting data.';
            return [
                [], [], [], [], [],
            ] as [
                ExternalProductPrice[],
                ExternalProductMetadata[],
                ProductBadge[],
                ExternalProductOfInternal[],
                ExternalProductOfInternal[],
            ];
        }
    );

    const siblingExtras = await ResultAsync.combine(siblingExternals.map((p) => {
        return ResultAsync.combine([
            fetchExternalProductMetadata(p.external_product_id, fetch),
            fetchExternalProductBadges(p.external_product_id, fetch),
            fetchExternalProductPrices(p.external_product_id, fetch),
        ])
        .map(([metadata, badges, prices]) => ({ metadata, badges, latest_price: prices[0] ?? null }))
        .mapErr((err) => ({ metadata: [], badges: [] }))
    })).match(
        (values) => values,
        (err) => {
            console.error('Failed to fetch sibling products:', err);
            return [];
        }
    );

    const siblingProducts = siblingExternals.map((p, idx) => {
        return {
            ...p,
            ...siblingExtras[idx],
        }
    })

    siblingProducts.sort((a, b) => {
        const priceA = a.latest_price?.price ?? Number.MAX_VALUE;
        const priceB = b.latest_price?.price ?? Number.MAX_VALUE;
        return priceA - priceB;
    })

    const similarProductIds = new Set(similarExternals.map(p => p.external_product_id));
    const similarProducts = siblingProducts.filter(p => similarProductIds.has(p.external_product_id));
    const variantProducts = siblingProducts.filter(p => !similarProductIds.has(p.external_product_id) && p.external_product_id !== externalProduct.id);

    return {
        exists: true,
        url: productUrl,
        error,
        externalProduct,
        prices,
        metadata,
        badges,
        variantProducts,
        similarProducts,
        website: parentData.websiteMap?.get(externalProduct.website_id) ?? null,
        category: parentData.categoryMap?.get(externalProduct.category_id) ?? null,
        breadcrumb: [
            { path: 'URL Lookup', url: '/url' },
            { path: externalProduct.name, url: `/url/${rawSlug}` }
        ]
    } satisfies PageData;
};
