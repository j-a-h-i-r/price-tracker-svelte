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
    
    let discountPercent = $derived(Math.round((1 - deal.current_price / deal.max_price_last_days) * 100));
    
    function formatFreshness(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    function getDiscountTier(percent: number): 'hot' | 'warm' | 'normal' {
        if (percent >= 25) return 'hot';
        if (percent >= 15) return 'warm';
        return 'normal';
    }
    
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
    class:deal-hot={getDiscountTier(discountPercent) === 'hot'}
    class:deal-warm={getDiscountTier(discountPercent) === 'warm'}
>
    <div class="deal-content">
        <div class="card-header">
            {#if badges.length > 0}
                <div class="badges-container">
                    {#each badges as badge (badge.key)}
                        <Badge label={badge.label} />
                    {/each}
                </div>
            {/if}
            {#if discountPercent >= 25}
                <span class="hot-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2c1 3 2.5 5.5 1.5 9.5 1-1.5 1.5-3.5 1.5-5.5 3.5 3 5 7 5 11a8 8 0 1 1-16 0c0-4 1.5-8 5-11 0 2-.5 4 1.5 5.5-1-4 .5-6.5 1.5-9.5z"/>
                    </svg>
                    Hot
                </span>
            {/if}
        </div>
        
        {#if deal.current_price}
            <div class="discount-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="discount-icon">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                <span class="discount-text">Save <strong>{formatPrice(deal.max_price_last_days - deal.current_price)}</strong></span>
                <span class="percentage-pill">-{discountPercent}%</span>
            </div>
        {/if}
        
        <h3 class={showFullProductName ? '' : 'clamp-text'}>{deal.product_name}</h3>
        
        <div class="price-section">
            <span class="current-price">{formatPrice(deal.current_price)}</span>
            {#if deal.current_price}
                <span class="msrp">{formatPrice(deal.max_price_last_days)}</span>
            {/if}
        </div>
    </div>
    
    <div class="card-footer">
        <div class="store-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
            </svg>
            <span class="store-name">{deal.website_name}</span>
        </div>
        <div class="freshness">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
            {formatFreshness(deal.current_price_date)}
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
        padding: 1.25rem;
        border-radius: 16px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
        transition: all 0.25s ease;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
    }

    .deal-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: #e5e7eb;
        transition: background 0.25s ease;
    }

    .deal-card.deal-hot::before {
        background: linear-gradient(90deg, #ef4444 0%, #f97316 100%);
    }

    .deal-card.deal-warm::before {
        background: linear-gradient(90deg, #f59e0b 0%, #eab308 100%);
    }

    .deal-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        border-color: #d1d5db;
    }

    .deal-content {
        display: flex;
        flex-direction: column;
        flex: 1;
    }

    .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        min-height: 24px;
    }

    .hot-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .discount-row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.75rem;
        color: #16a34a;
    }

    .discount-icon {
        flex-shrink: 0;
    }

    .discount-text {
        font-size: 0.8rem;
        font-weight: 500;
    }

    .discount-text strong {
        font-weight: 700;
    }

    .percentage-pill {
        background: #16a34a;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 700;
        margin-left: auto;
    }

    .deal-content h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        color: #1f2937;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-weight: 600;
    }

    .clamp-text {
        -webkit-line-clamp: 3;
        line-clamp: 3;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: auto;
    }

    .current-price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #16a34a;
    }

    .msrp {
        font-size: 0.9rem;
        text-decoration: line-through;
        color: #9ca3af;
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 0.875rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f3f4f6;
    }

    .store-info {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: #6b7280;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .store-info svg {
        color: #9ca3af;
    }

    .freshness {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.7rem;
        color: #9ca3af;
        background: #f9fafb;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
    }

    .info-section {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
        flex-wrap: wrap;
    }

    .info-section > span {
        font-size: 0.7rem;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        background: #f3f4f6;
        color: #4b5563;
        font-weight: 500;
    }

    .info-section > .manufacturer {
        background: #e0e7ff;
        color: #4338ca;
    }

    .info-section > .category {
        background: #f3f4f6;
        color: #6b7280;
    }

    .badges-container {
        display: flex;
        gap: 0.375rem;
        flex-wrap: wrap;
    }
</style>


