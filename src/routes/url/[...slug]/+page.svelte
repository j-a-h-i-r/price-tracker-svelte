<script lang="ts">
    import Badge from '$lib/components/Badge.svelte';
    import NoResult from '$lib/components/NoResult.svelte';
    import { formatPrice, linkWithUtmSource } from '$lib/util.js';
    import type { PageProps } from './$types.js';
    import PriceChart from '$lib/components/PriceChart.svelte';
    import PriceStat from '$lib/components/PriceStat.svelte';
    import Pill from '$lib/components/Pill.svelte';
    import type { ExternalProductPrice } from '$lib/types/Product.js';

    let { data }: PageProps = $props();

    const priceHistory = $derived.by(() =>
        data.prices.toSorted((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    );

    let priceStats30Day = calculate30DayStats();

    function calculate30DayStats() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPrices = data.prices
            .filter(price => price.price != null && new Date(price.created_at) >= thirtyDaysAgo)
            .map(price => price.price);
        
        if (recentPrices.length > 0) {
            const high = Math.max(...recentPrices);
            const low = Math.min(...recentPrices);
            const average = Math.ceil(recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length);
            return {
                high,
                low,
                average,
                count: recentPrices.length
            }
        }
        return null;
    }

    const latestPrice = $derived.by(() => priceHistory[0] ?? null);
    const isAvailable = $derived.by(() =>
        latestPrice?.is_available ?? data.externalProduct?.is_available ?? false
    );
    const internalProductUrl = $derived.by(() =>
        data.externalProduct?.internal_product_id ? `/products/${data.externalProduct.internal_product_id}` : null
    );
    const badges = $derived.by(() => data.badges ?? []);
    const metadata = $derived.by(() => data.metadata ?? []);

    function getPriceOrNotAvailable(price: ExternalProductPrice) {
        if (!price) return 'Not Available';
        if (!price.is_available) return 'Not Available';
        if (price.price == null) return 'Not Available';
        return formatPrice(price.price);
    }
</script>

{#snippet productDetail(product: typeof data.similarProducts[number])}
    <div class={['similar-product-card', product.latest_price?.price < latestPrice?.price ? 'highlight' : '']}>
        <h3 class="similar-product-title">{product.name}</h3>
        <h4>{getPriceOrNotAvailable(product.latest_price)}</h4>
        {#if product.metadata.length > 0}
            <div class="similar-metadata">
                {#each product.metadata as metadata (metadata.name)}
                    <Pill label={metadata.name_display_text} value={metadata.value_display_text} />
                {/each}
            </div>
        {/if}
        {#if product.badges.length > 0}
            <div class="badges-row">
                {#each product.badges as badge (badge.key)}
                    <Badge label={badge.label} />
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

<div class="url-page">
    {#if !data.exists}
        <NoResult
            message="We couldn't find a product for this link."
            suggestion="Double-check the URL or try searching from the products page."
        />
    {:else}
        {#if data.error}
            <div class="error-banner">
                <strong>Heads up:</strong>
                <span>{data?.error}</span>
            </div>
        {/if}

        <section class="summary-card">
            <div class="summary-header">
                <div>
                    <p class="summary-label">Product</p>
                    <h1 class="summary-title">{data.externalProduct?.name ?? data.url}</h1>
                </div>
                <div class="summary-actions">
                    {#if internalProductUrl}
                        <a class="button secondary" href={internalProductUrl}>
                            View product
                        </a>
                    {/if}
                    {#if data.externalProduct?.url}
                        <a
                            class="button primary"
                            href={linkWithUtmSource(data.externalProduct.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on retailer
                        </a>
                    {/if}
                </div>
            </div>
            <div class="summary-meta">
                <div>
                    <p class="meta-label">Source website</p>
                    <p class="meta-value">{data.website?.name ?? 'Unknown'}</p>
                </div>
                <div>
                    <p class="meta-label">Availability</p>
                    <p class="meta-value" class:available={isAvailable} class:unavailable={!isAvailable}>
                        {isAvailable ? 'In stock' : 'Unavailable'}
                    </p>
                </div>
                <div>
                    <p class="meta-label">Latest price</p>
                    <p class="meta-value price">
                        {#if latestPrice}
                            {formatPrice(latestPrice.price)}
                        {:else}
                            Not available
                        {/if}
                    </p>
                </div>
                <div>
                    <p class="meta-label">Tracked URL</p>
                    <p class="meta-value url" title={data.url ?? ''}>{data.url ?? '—'}</p>
                </div>
            </div>

            {#if badges.length > 0}
                <div class="badges-row">
                    {#each badges as badge (badge.key)}
                        <Badge label={badge.label} />
                    {/each}
                </div>
            {/if}
        </section>

        {#if data.prices.length > 0}
            <section aria-label="Price chart">
                <div class="card">
                    <h2>Price History</h2>

                    {#if priceStats30Day}
                        <div>
                            <PriceStat stats={priceStats30Day} />
                        </div>
                    {/if}
                    <div class="price-chart">
                        <PriceChart product={data.externalProduct} prices={data.prices} />
                    </div>
                </div>
            </section>
        {/if}

        <section aria-label="Similar products">
            <div class="card">
                <h2>Similar Products</h2>
                {#if data.similarProducts && data.similarProducts.length > 0}
                    <h3>We found {data.similarProducts.length} similar products that share the same configuration</h3>
                    <h4 class="flex gap-1 flex-wrap">
                        {#each metadata as item (item.name)}
                            <Pill label={item.name_display_text} value={item.value_display_text} />
                        {/each}
                    </h4>
                    <div class="similar-products-grid">
                        {#each data.similarProducts as similar (similar.external_product_id)}
                            {@render productDetail(similar)}
                        {/each}
                    </div>

                    {#if data.variantProducts.length > data.similarProducts.length}
                        <h3>We found {data.variantProducts.length} products that have different configurations</h3>
                        <div class="similar-products-grid">
                            {#each data.variantProducts as variant (variant.external_product_id)}
                                {@render productDetail(variant)}
                            {/each}
                        </div>
                    {/if}
                {:else}
                    <p class="empty-state">No similar products found.</p>
                {/if}
            </div>
        </section>
    {/if}
</div>

<style>
    .url-page {
        padding: 1.5rem 0;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        color: #92400e;
    }

    .summary-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }

    .summary-header {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    @media (min-width: 768px) {
        .summary-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }
    }

    .summary-label {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 0.25rem;
    }

    .summary-title {
        font-size: clamp(1.5rem, 2vw + 1rem, 2.5rem);
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .summary-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.65rem 1.25rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.95rem;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .button.primary {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        box-shadow: 0 12px 24px -12px rgba(37, 99, 235, 0.5);
    }

    .button.primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 28px -12px rgba(37, 99, 235, 0.6);
    }

    .button.secondary {
        background: white;
        border: 1px solid #cbd5f5;
        color: #1e3a8a;
    }

    .button.secondary:hover {
        box-shadow: 0 6px 18px -12px rgba(30, 58, 138, 0.4);
    }

    .summary-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1.25rem;
    }

    .meta-label {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 0.35rem;
    }

    .meta-value {
        font-size: 1.05rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
        word-break: break-word;
    }

    .meta-value.price {
        font-size: 1.35rem;
        color: #2563eb;
    }

    .meta-value.url {
        font-size: 0.95rem;
        font-weight: 500;
        color: #1f2937;
        max-width: 100%;
        overflow-wrap: anywhere;
    }

    .available {
        color: #15803d;
    }

    .unavailable {
        color: #dc2626;
    }

    .badges-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .content-grid {
        display: grid;
        gap: 1.5rem;
    }

    @media (min-width: 900px) {
        .content-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
    }

    .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .card h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .empty-state {
        font-size: 0.95rem;
        color: #6b7280;
        margin: 0;
    }

    .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
    }

    .metadata-item {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.75rem 1rem;
        background: white;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .metadata-label {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #475569;
    }

    .metadata-value {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
    }

    .metadata-unit {
        font-size: 0.85rem;
        margin-left: 0.35rem;
        color: #6b7280;
    }

    .price-chart {
        background: linear-gradient(180deg, #f8fafc, transparent);
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
        border: 1px solid #e2e8f0;
    }

    .similar-products-grid {
        display: grid;
        gap: 1rem;
    }

    @media (min-width: 640px) {
        .similar-products-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (min-width: 1024px) {
        .similar-products-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    .similar-product-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
        background: linear-gradient(135deg, rgba(248, 250, 252, 0.65), rgba(255, 255, 255, 1));
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        transition: all 0.2s ease;
    }

    .similar-product-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        transform: translateY(-2px);
    }

    .similar-product-title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
        line-height: 1.4;
    }

    .similar-metadata {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .highlight {
        border-color: #34d399;
        background: linear-gradient(135deg, rgba(236, 253, 245, 0.8), rgba(209, 250, 229, 0.6));
        box-shadow: 0 8px 24px rgba(52, 211, 153, 0.2);
    }

</style>
