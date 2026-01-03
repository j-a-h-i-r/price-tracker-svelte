<script lang="ts">
    import type { ExternalProductOfInternal, ProductBadge } from '$lib/api/products.js';
    import type { ExternalProductPrice, ExternalProductMetadata } from '$lib/types/Product.js';
    import { formatPrice, linkWithUtmSource } from '$lib/util.js';
    import Pill from './Pill.svelte';
    import PriceChart from './PriceChart.svelte';
    import PriceStat from './PriceStat.svelte';

    interface Props {
        product: ExternalProductOfInternal;
        stackIndex: number;
        badges: ProductBadge[];
        latestPrice: ExternalProductPrice | undefined;
        maxPrice: number;
        websiteName: string;
        metadata: ExternalProductMetadata[];
        prices: ExternalProductPrice[];
        priceStats?: { high: number; low: number; average: number; count: number };
        selectedVariants: Record<string, string | 'unselected'>;
        isHighlighted?: boolean;
        isAdmin?: boolean;
        onToggle: () => void;
        onFlagIncorrectGrouping: (externalProductId: number) => void;
        onUnmerge: (externalProductId: number) => void;
        onAttach?: (node: Element) => void;
        getLastUpdatedText: (date: string) => string;
    }

    let {
        product,
        stackIndex,
        badges,
        latestPrice,
        maxPrice,
        websiteName,
        metadata,
        prices,
        priceStats,
        selectedVariants,
        isHighlighted = false,
        isAdmin = false,
        onToggle,
        onFlagIncorrectGrouping,
        onUnmerge,
        onAttach,
        getLastUpdatedText,
    }: Props = $props();

    const isExpanded = true;
    let cardElement: HTMLDivElement;

    let hasPrice = $derived(latestPrice?.price != null);
    let isAvailable = $derived(latestPrice?.is_available ?? false);
    let savings = $derived(hasPrice && latestPrice!.price < maxPrice ? maxPrice - latestPrice!.price : 0);

    function getBadgeIcon(badge: ProductBadge): string {
        if (badge.key === 'lowest_price') return '🔥';
        if (badge.key === 'new_product') return '⭐';
        return '';
    }

    function getVisibleMetadata(limit: number) {
        if (!metadata || metadata.length === 0) return [];
        return metadata
            .filter((meta) => {
                const selectedValue = selectedVariants[meta.name];
                return selectedValue === 'unselected' || selectedValue !== meta.value;
            })
            .slice(0, limit);
    }

    let keySpecs = $derived.by(() => getVisibleMetadata(1));
</script>

<div
    bind:this={cardElement}
    class="variant-card"
    class:expanded={isExpanded}
    class:highlighted={isHighlighted}
    class:unavailable={!hasPrice}
    style:z-index={isExpanded ? 100 : stackIndex}
    use:onAttach
>
    {#if isHighlighted}
        <div class="deal-pointer">
            <span class="pointer-arrow">👉</span>
            <span class="pointer-text">This is the deal you just clicked on</span>
        </div>
    {/if}

    <button
        class="card-header"
        onclick={onToggle}
        aria-expanded={isExpanded}
    >
        <div class="header-content">
            <div class="header-left">
                {#if badges.length > 0}
                    <div class="badges">
                        {#each badges as badge (badge.key)}
                            <span class="badge-icon" title={badge.label}>{getBadgeIcon(badge)}</span>
                        {/each}
                    </div>
                {/if}

                {#if hasPrice}
                    <div class="price">{formatPrice(latestPrice!.price)}</div>
                    {#if isAvailable}
                        <div class="availability-dot" title="In stock"></div>
                    {/if}
                {:else}
                    <div class="price-unavailable">—</div>
                {/if}
            </div>

            <div class="header-right">
                <span class="retailer">{websiteName}</span>
            </div>
        </div>

        {#if badges.length > 0}
            <div class="badge-row">
                {#each badges as badge (badge.key)}
                    <span class="badge-chip">
                        <span class="badge-chip-icon">{getBadgeIcon(badge)}</span>
                        <span class="badge-chip-label">{badge.label}</span>
                    </span>
                {/each}
            </div>
        {/if}

    </button>

    <div class="card-body">
        <div class="product-info">
            <div class="product-name">{product.name}</div>
            <button
                class="flag-btn"
                onclick={(e) => {
                    e.stopPropagation();
                    onFlagIncorrectGrouping(product.external_product_id);
                }}
                title="Flag incorrect information"
                aria-label="Flag incorrect information"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
            </button>
        </div>

        <div class="price-section">
            {#if hasPrice}
                <div class="price-row">
                    <div class="price-large">{formatPrice(latestPrice!.price)}</div>
                    {#if isAvailable}
                        <div class="availability-dot-large" title="In stock"></div>
                    {/if}
                    {#if savings > 0}
                        <div class="savings">Save {formatPrice(savings)}</div>
                    {/if}
                </div>
                {#if latestPrice?.created_at}
                    <div class="update-time">
                        Updated {getLastUpdatedText(latestPrice.created_at)}
                    </div>
                {/if}
            {:else}
                <div class="no-price">Price not available</div>
            {/if}
        </div>

        <a
            href={linkWithUtmSource(product.url)}
            target="_blank"
            rel="noopener noreferrer"
            class="store-link"
            onclick={(e) => e.stopPropagation()}
        >
            View in <strong>{websiteName}</strong> →
        </a>

        {#if priceStats && prices.length > 0}
            <PriceStat stats={priceStats}>
                <div class="chart-wrapper">
                    <PriceChart {product} {prices} />
                </div>
            </PriceStat>
        {/if}

        {#if metadata.length > 0}
            <div class="metadata-section">
                {#each metadata as meta (meta.name)}
                    <Pill label={meta.name_display_text} value={meta.value_display_text} />
                {/each}
            </div>
        {/if}

        {#if isAdmin}
            <div class="admin-section">
                <button
                    class="admin-btn unmerge"
                    onclick={(e) => {
                        e.stopPropagation();
                        onUnmerge(product.external_product_id);
                    }}
                >
                    Unmerge
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    .deal-pointer {
        position: absolute;
        top: -2.5rem;
        left: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #2563eb;
        font-weight: 500;
        pointer-events: none;
    }

    .pointer-arrow {
        font-size: 1.25rem;
    }

    .card-header {
        width: 100%;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.2s;
    }

    .card-header:hover,
    .variant-card.expanded .card-header {
        background: #f9fafb;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .header-right {
        margin-left: auto;
    }

    .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-top: 0.5rem;
    }

    .badge-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.625rem;
    }

    .badge-chip {
        background: #eef2ff;
        color: #3730a3;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
    }

    .badges {
        display: flex;
        gap: 0.25rem;
    }

    .badge-icon {
        font-size: 1rem;
        line-height: 1;
    }

    .price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2563eb;
        line-height: 1;
    }

    .price-unavailable {
        font-size: 1.5rem;
        font-weight: 700;
        color: #9ca3af;
    }

    .availability-dot,
    .availability-dot-large {
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .availability-dot {
        width: 8px;
        height: 8px;
    }

    .availability-dot-large {
        width: 10px;
        height: 10px;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .retailer {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-body {
        padding: 1rem 1rem 1.5rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border-top: 1px solid #f3f4f6;
    }

    .product-info {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .product-name {
        flex: 1;
        font-size: 0.875rem;
        color: #6b7280;
        line-height: 1.4;
    }

    .flag-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .flag-btn:hover {
        background: #f3f4f6;
        color: #ef4444;
    }

    .price-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .price-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .price-large {
        font-size: 2rem;
        font-weight: 700;
        color: #2563eb;
    }

    .savings {
        background: #22c55e;
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .update-time {
        font-size: 0.75rem;
        color: #9ca3af;
        font-style: italic;
    }

    .no-price {
        background: #fef2f2;
        color: #dc2626;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .store-link {
        color: #2563eb;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: color 0.2s;
    }

    .store-link:hover {
        color: #1d4ed8;
        text-decoration: underline;
    }

    .store-link strong {
        font-weight: 600;
    }

    .chart-wrapper {
        padding-top: 0.5rem;
    }

    .metadata-section {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .admin-section {
        display: flex;
        gap: 0.5rem;
    }

    .admin-btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .admin-btn.unmerge {
        background: #ef4444;
        color: white;
    }

    .admin-btn.unmerge:hover {
        background: #dc2626;
    }

    @media (max-width: 768px) {
        .header-content {
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .header-left {
            flex: 1;
            min-width: 0;
        }

        .price-large {
            font-size: 1.5rem;
        }
    }
</style>
