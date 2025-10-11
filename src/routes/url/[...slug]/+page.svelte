<script lang="ts">
    import Badge from '$lib/components/Badge.svelte';
    import NoResult from '$lib/components/NoResult.svelte';
    import { formatPrice, linkWithUtmSource } from '$lib/util.js';
    import dayjs from 'dayjs';
    import type { PageProps } from './$types.js';

    let { data }: PageProps = $props();

    const priceHistory = $derived.by(() =>
        data.prices.toSorted((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    );

    const latestPrice = $derived.by(() => priceHistory[0] ?? null);
    const isAvailable = $derived.by(() =>
        latestPrice?.is_available ?? data.externalProduct?.is_available ?? false
    );
    const internalProductUrl = $derived.by(() =>
        data.externalProduct?.internal_product_id ? `/products/${data.externalProduct.internal_product_id}` : null
    );
    const badges = $derived.by(() => data.badges ?? []);
    const metadata = $derived.by(() => data.metadata ?? []);
</script>

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
                <span>{data.error}</span>
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
                            View internal product
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

        <section class="content-grid">
            <div class="card">
                <h2>Price history</h2>
                {#if priceHistory.length > 0}
                    <ul class="price-list">
                        {#each priceHistory as price (price.created_at)}
                            <li class="price-item">
                                <div class="price-head">
                                    <span class="price-amount">{formatPrice(price.price)}</span>
                                    <span class:available={price.is_available} class:unavailable={!price.is_available}>
                                        {price.is_available ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                <p class="price-date">{dayjs(price.created_at).format('MMM D, YYYY • h:mm A')}</p>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="empty-state">No price data recorded yet.</p>
                {/if}
            </div>

            <div class="card">
                <h2>Metadata</h2>
                {#if metadata.length > 0}
                    <div class="metadata-grid">
                        {#each metadata as item (item.name + item.value)}
                            <div class="metadata-item">
                                <p class="metadata-label">{item.name_display_text ?? item.name}</p>
                                <p class="metadata-value">
                                    {#if item.value_display_text}
                                        {item.value_display_text}
                                    {:else}
                                        {item.value}
                                        {#if item.unit}
                                            <span class="metadata-unit">{item.unit}</span>
                                        {/if}
                                    {/if}
                                </p>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="empty-state">No metadata available for this product.</p>
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
        background: var(--color-bg-primary);
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
        color: var(--color-text-primary);
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
        background: var(--color-bg-primary);
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

    .price-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .price-item {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: linear-gradient(135deg, rgba(248, 250, 252, 0.65), rgba(226, 232, 240, 0.35));
    }

    .price-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .price-amount {
        font-size: 1.35rem;
        font-weight: 700;
        color: #111827;
    }

    .price-date {
        font-size: 0.9rem;
        color: #4b5563;
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
        background: var(--color-bg-primary);
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
        color: var(--color-text-primary);
    }

    .metadata-unit {
        font-size: 0.85rem;
        margin-left: 0.35rem;
        color: #6b7280;
    }
</style>
