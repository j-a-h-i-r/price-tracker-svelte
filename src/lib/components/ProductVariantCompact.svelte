<script lang="ts">
    import type { ProductBadge } from '$lib/api/products.js';
    import type { ExternalProductPrice, ExternalProductMetadata } from '$lib/types/Product.js';
    import { formatPrice } from '$lib/util.js';

    interface Props {
        stackIndex: number;
        isExpanded: boolean;
        onToggle: () => void;
        badges: ProductBadge[];
        latestPrice: ExternalProductPrice | undefined;
        maxPrice: number;
        websiteName: string;
        metadata: ExternalProductMetadata[];
        selectedVariants: Record<string, string | 'unselected'>;
        isHighlighted?: boolean;
        onAttach?: (node: Element) => void;
    }

    let {
        stackIndex,
        isExpanded,
        onToggle,
        badges,
        latestPrice,
        maxPrice,
        websiteName,
        metadata,
        selectedVariants,
        isHighlighted = false,
        onAttach,
    }: Props = $props();
    
    let cardElement: HTMLDivElement;

    let hasPrice = $derived(latestPrice?.price != null);
    let isAvailable = $derived(latestPrice?.is_available ?? false);
    let savings = $derived(hasPrice && latestPrice!.price < maxPrice ? maxPrice - latestPrice!.price : 0);

    // Get icon for badge
    function getBadgeIcon(badge: ProductBadge): string {
        if (badge.key === 'lowest_price') return '🔥';
        if (badge.key === 'new_product') return '⭐';
        return '';
    }

    // Filter metadata to show only key specs in collapsed view
    function getVisibleMetadata(limit: number) {
        if (!metadata || metadata.length === 0) return [];
        return metadata.filter(meta => {
            const selectedValue = selectedVariants[meta.name];
            return selectedValue === 'unselected' || selectedValue !== meta.value;
        }).slice(0, limit);
    }

    let keySpecs = $derived.by(() => getVisibleMetadata(1));
    let compactMetadata = $derived.by(() => getVisibleMetadata(3));
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

    <!-- Header (always visible) -->
    <button
        class="card-header"
        onclick={onToggle}
        aria-expanded={isExpanded}
    >
        <div class="header-content">
            <div class="header-left">
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
        {#if compactMetadata.length > 0}
            <div class="metadata-row">
                {#each compactMetadata as meta (meta.name)}
                    <span class="metadata-chip">
                        <span class="metadata-chip-name">{meta.name_display_text}</span>
                        <span class="metadata-chip-separator">·</span>
                        <span class="metadata-chip-value">{meta.value_display_text}</span>
                    </span>
                {/each}
            </div>
        {/if}
    </button>
</div>

<style>
    /* Deal pointer */
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

    /* Card header (always visible) */
    .card-header {
        width: 100%;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.2s;
    }

    .card-header:hover {
        background: #f9fafb;
    }

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
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        background: #eef2ff;
        color: #3730a3;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .badge-chip-icon {
        font-size: 0.9rem;
        line-height: 1;
    }

    .badge-chip-label {
        line-height: 1;
    }

    .metadata-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin-top: 0.375rem;
    }

    .metadata-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        background: #f3f4f6;
        color: #4b5563;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .metadata-chip-name {
        color: #6b7280;
    }

    .metadata-chip-separator {
        color: #9ca3af;
    }

    .metadata-chip-value {
        color: #111827;
        font-weight: 600;
    }

    /* Price */
    .price {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2563eb;
    }

    .price-unavailable {
        font-size: 1.25rem;
        font-weight: 700;
        color: #9ca3af;
    }

    /* Availability dot */
    .availability-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    /* Retailer */
    .retailer {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .header-content {
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .header-left {
            flex: 1;
            min-width: 0;
        }
    }
</style>
