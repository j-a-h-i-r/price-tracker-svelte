<script lang="ts">
    import type { Deal } from '$lib/types/Deal.js';
    import { formatPrice } from '$lib/util.js';

    interface Props {
        deals: Deal[];
        days: number;
    }

    let { deals, days }: Props = $props();

    let stats = $derived.by(() => {
        if (deals.length === 0) {
            return {
                totalDeals: 0,
                biggestDiscount: 0,
                totalSavings: 0,
                avgDiscount: 0
            };
        }

        let totalSavings = 0;
        let biggestDiscount = 0;

        for (const deal of deals) {
            const discount = Math.round((1 - deal.current_price / deal.max_price_last_days) * 100);
            const savings = deal.max_price_last_days - deal.current_price;
            
            totalSavings += savings;
            if (discount > biggestDiscount) {
                biggestDiscount = discount;
            }
        }

        return {
            totalDeals: deals.length,
            biggestDiscount,
            totalSavings,
            avgDiscount: Math.round(totalSavings / deals.length)
        };
    });
</script>

<div class="stats-bar">
    <div class="stats-header">
        <h1>
            <span class="title-icon">🔥</span>
            Hot Deals
        </h1>
        <p class="subtitle">Price drops in the last {days} days</p>
    </div>
    
    <div class="stats-cards">
        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                    <path d="M3 6h18"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats.totalDeals}</span>
                <span class="stat-label">Active Deals</span>
            </div>
        </div>

        <div class="stat-card highlight">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                    <polyline points="16 7 22 7 22 13"/>
                </svg>
            </div>
            <div class="stat-content">
                <span class="stat-value">{stats.biggestDiscount}%</span>
                <span class="stat-label">Biggest Drop</span>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                    <path d="M12 18V6"/>
                </svg>
            </div>
            <div class="stat-content">
                <span class="stat-value">{formatPrice(stats.totalSavings)}</span>
                <span class="stat-label">Total Savings</span>
            </div>
        </div>
    </div>
</div>

<style>
    .stats-bar {
        margin-bottom: 1.5rem;
    }

    .stats-header {
        margin-bottom: 1.25rem;
    }

    .stats-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.25rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .title-icon {
        font-size: 1.75rem;
    }

    .subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin: 0;
    }

    .stats-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }

    .stat-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        background: white;
        border-radius: 16px;
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    }

    .stat-card.highlight {
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border-color: #a7f3d0;
    }

    .stat-card.highlight .stat-icon {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
    }

    .stat-card.highlight .stat-value {
        color: #059669;
    }

    .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #f3f4f6;
        color: #6b7280;
        flex-shrink: 0;
    }

    .stat-content {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1f2937;
        line-height: 1.2;
    }

    .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    @media (max-width: 768px) {
        .stats-cards {
            grid-template-columns: 1fr;
        }

        .stats-header h1 {
            font-size: 1.75rem;
        }

        .stat-card {
            padding: 1rem;
        }

        .stat-value {
            font-size: 1.25rem;
        }

        .stat-icon {
            width: 40px;
            height: 40px;
        }

        .stat-icon svg {
            width: 20px;
            height: 20px;
        }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
        .stats-cards {
            grid-template-columns: repeat(3, 1fr);
        }

        .stat-value {
            font-size: 1.25rem;
        }
    }
</style>
