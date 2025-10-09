<script lang="ts">
    import type { Deal } from '$lib/types/Deal.js';
    import { formatPrice } from '$lib/util.js';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import type { ProductBadge } from '$lib/api/products.js';
    import Badge from '$lib/components/Badge.svelte';

    interface Props {
        deal: Deal;
        showFullProductName?: boolean;
        manufacturerMap?: Map<number, { name: string }>;
        categoryMap?: Map<number, { name: string }>;
        // Refactor: Should I just fetch the badges directly here from 
        // the API? Maybe add a flag?
        onScrollToViewOnce?: (deal: Deal) => void;
        badges?: ProductBadge[];
    }

    let { deal,
        showFullProductName = false,
        manufacturerMap,
        categoryMap,
        onScrollToViewOnce,
        badges = [],
    }: Props = $props();

    let element: HTMLElement;
    onMount(() => {
        if (!onScrollToViewOnce) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                onScrollToViewOnce(deal);
                observer.disconnect();
            }
        }, {
            threshold: 0.1,
        })
        observer.observe(element)
        return () => observer.disconnect();
    });
</script>

<a
    href="/products/{deal.product_id}"
    bind:this={element}
    onclick={() =>
        goto(`/products/${deal.product_id}`, {
            state: {
                highlight_external_product_id:
                    deal.external_product_id,
            },
        })}
    class="deal-card"
>
    <div class="deal-content">
        {#if badges.length > 0}
            <div class="badges-container">
                {#each badges as badge (badge.key)}
                    <Badge label={badge.label} />
                {/each}
            </div>
        {/if}
        {#if deal.current_price}
            <span class="discount discount-top">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="discount-icon">
                    <polyline points="1 6 10.5 15.5 15.5 10.5 23 18"></polyline>
                    <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
                Save <span class="font-bold">{formatPrice(deal.max_price_last_days - deal.current_price)}</span>
                <span class="percentage-pill">-{Math.round((1 - deal.current_price / deal.max_price_last_days) * 100)}%</span>
            </span>
        {/if}
        <h3 class={showFullProductName ? '' : 'clamp-text'}>{deal.product_name}</h3>
        <div class="price-section">
            <span class="current-price"
                >{formatPrice(deal.current_price)}</span
            >
            {#if deal.current_price}
                <span class="msrp"
                    >{formatPrice(
                        deal.max_price_last_days,
                    )}</span
                >
            {/if}
        </div>
    </div>
    {#if manufacturerMap && categoryMap}
        <div class="info-section">
            <span class="manufacturer">{manufacturerMap.get(deal.manufacturer_id)?.name || 'Unknown Brand'}</span>
            <span class="category">{categoryMap.get(deal.category_id)?.name || 'Uncategorized'}</span>
        </div>
    {/if}
</a>

<style>
    .deal-card {
        flex: 0 0 280px;
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition:
            transform 0.2s,
            box-shadow 0.2s;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
    }

    .deal-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .deal-content {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .deal-content h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #1f2937;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .clamp-text {
        -webkit-line-clamp: 4;
        line-clamp: 4;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: auto;
    }

    .current-price {
        font-size: 1.4rem;
        font-weight: 600;
        color: #16a34a;
    }

    .msrp {
        font-size: 1rem;
        text-decoration: line-through;
        color: #6b7280;
    }

    .discount {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ef4444;
        background: #fee2e2;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .discount-top {
        margin-bottom: 0.75rem;
        align-self: flex-start;
        font-size: 0.8rem;
        padding: 0;
        border-radius: 0;
        background: transparent;
        border: none;
        box-shadow: none;
        color: #16a34a;
    }

    .discount-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: #16a34a;
    }

    .font-bold {
        font-weight: 700;
    }

    .percentage-pill {
        background: #16a34a;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-left: 0.25rem;
    }

    .info-section {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        flex-wrap: wrap;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        justify-content: space-between;
    }

    .info-section > span {
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        background: #f3f4f6;
        color: #4b5563;
    }

    .info-section > .manufacturer {
        background: #e0e7ff;
        color: #4338ca;
        font-weight: 500;
    }

    .info-section > .category {
        background: #f3f4f6;
        color: #4b5563;
    }

    .badges-container {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
    }
</style>


