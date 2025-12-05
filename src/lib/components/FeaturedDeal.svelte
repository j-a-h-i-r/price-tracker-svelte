<script lang="ts">
    import type { Deal } from '$lib/types/Deal.js';
    import { formatPrice } from '$lib/util.js';
    import { goto } from '$app/navigation';

    interface Props {
        deal: Deal;
        categoryMap?: Map<number, { name: string }>;
        manufacturerMap?: Map<number, { name: string }>;
    }

    let { deal, categoryMap, manufacturerMap }: Props = $props();

    let discountPercent = $derived(Math.round((1 - deal.current_price / deal.max_price_last_days) * 100));
    let savings = $derived(deal.max_price_last_days - deal.current_price);

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
</script>

<a
    href="/products/{deal.product_id}"
    onclick={() => goto(`/products/${deal.product_id}`, {
        state: { highlight_external_product_id: deal.external_product_id }
    })}
    class="featured-deal"
>
    <div class="featured-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Top Deal
    </div>

    <div class="featured-content">
        <div class="featured-main">
            <div class="featured-header">
                <h3 class="product-name">{deal.product_name}</h3>
                <div class="meta-row">
                    {#if manufacturerMap}
                        <span class="meta-pill brand">
                            {manufacturerMap.get(deal.manufacturer_id)?.name || 'Unknown'}
                        </span>
                    {/if}
                    {#if categoryMap}
                        <span class="meta-pill category">
                            {categoryMap.get(deal.category_id)?.name || 'Unknown'}
                        </span>
                    {/if}
                    <span class="meta-pill store">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                            <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
                            <path d="M12 3v6"/>
                        </svg>
                        {deal.website_name}
                    </span>
                </div>
            </div>

            <div class="featured-pricing">
                <div class="price-block">
                    <span class="current-price">{formatPrice(deal.current_price)}</span>
                    <span class="original-price">{formatPrice(deal.max_price_last_days)}</span>
                </div>
                <div class="savings-block">
                    <div class="discount-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                            <polyline points="16 7 22 7 22 13"/>
                        </svg>
                        <span class="discount-text">Save {formatPrice(savings)}</span>
                        <span class="discount-percent">-{discountPercent}%</span>
                    </div>
                    <span class="freshness">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {formatDate(deal.current_price_date)}
                    </span>
                </div>
            </div>
        </div>

        <div class="featured-cta">
            <span class="cta-text">View Deal</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
            </svg>
        </div>
    </div>
</a>

<style>
    .featured-deal {
        display: block;
        position: relative;
        background: linear-gradient(135deg, #fefce8 0%, #fef9c3 50%, #fef08a 100%);
        border: 2px solid #fcd34d;
        border-radius: 20px;
        padding: 1.5rem;
        text-decoration: none;
        color: inherit;
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
        overflow: hidden;
    }

    .featured-deal::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%);
        pointer-events: none;
    }

    .featured-deal:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(251, 191, 36, 0.25);
        border-color: #f59e0b;
    }

    .featured-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        font-size: 0.8rem;
        font-weight: 700;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .featured-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        position: relative;
        z-index: 1;
    }

    .featured-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .featured-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .product-name {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
        line-height: 1.4;
        max-width: 80%;
    }

    .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .meta-pill.brand {
        background: #e0e7ff;
        color: #4338ca;
    }

    .meta-pill.category {
        background: #f3f4f6;
        color: #4b5563;
    }

    .meta-pill.store {
        background: #fef3c7;
        color: #92400e;
    }

    .featured-pricing {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1.5rem;
    }

    .price-block {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
    }

    .current-price {
        font-size: 2rem;
        font-weight: 800;
        color: #16a34a;
    }

    .original-price {
        font-size: 1.125rem;
        color: #9ca3af;
        text-decoration: line-through;
    }

    .savings-block {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .discount-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        border: 1px solid #86efac;
        border-radius: 10px;
        color: #15803d;
    }

    .discount-badge svg {
        flex-shrink: 0;
    }

    .discount-text {
        font-size: 0.9rem;
        font-weight: 600;
    }

    .discount-percent {
        background: #16a34a;
        color: white;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 700;
    }

    .freshness {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8rem;
        color: #6b7280;
    }

    .featured-cta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        color: white;
        border-radius: 12px;
        font-weight: 600;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }

    .featured-deal:hover .featured-cta {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        transform: translateX(4px);
    }

    @media (max-width: 768px) {
        .featured-deal {
            padding: 1.25rem;
        }

        .featured-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1.25rem;
        }

        .featured-badge {
            position: static;
            align-self: flex-start;
            margin-bottom: 0.5rem;
        }

        .product-name {
            font-size: 1.125rem;
            max-width: 100%;
        }

        .current-price {
            font-size: 1.75rem;
        }

        .featured-pricing {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }

        .featured-cta {
            justify-content: center;
            padding: 0.875rem 1.25rem;
        }
    }
</style>
