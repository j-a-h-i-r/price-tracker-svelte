<script lang="ts">
    import { formatPrice } from '$lib/util.js';
    import type { Snippet } from 'svelte';

    interface Props {
        stats: {
            high: number;
            average: number;
            low: number;
            count: number;
        },
        children?: Snippet,
    }
    let { stats, children }: Props = $props();
</script>

<div class="price-stats">
    <div class="price-stats-grid">
        <div class="price-stat">
            <span class="price-stat-label">30-Day High</span>
            <span class="price-stat-value price-high"
                >{formatPrice(
                    stats.high,
                )}</span
            >
        </div>
        <div class="price-stat">
            <span class="price-stat-label">30-Day Avg</span>
            <span class="price-stat-value price-avg"
                >{formatPrice(
                    stats.average,
                )}</span
            >
        </div>
        <div class="price-stat">
            <span class="price-stat-label">30-Day Low</span>
            <span class="price-stat-value price-low"
                >{formatPrice(
                    stats.low,
                )}</span
            >
        </div>
    </div>
    <div class="price-stats-footer">
        Based on {stats.count} price points
        points
    </div>

    {#if children}
        {@render children()}
    {/if}
</div>

<style>
    .price-stats {
        background: linear-gradient(180deg, #f8fafc, transparent);
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
        border: 1px solid #e2e8f0;
    }

    .price-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }

    .price-stats-footer {
        margin-top: 0.75rem;
        font-size: 0.75rem;
        color: #6b7280;
        text-align: center;
        font-style: italic;
    }

    .price-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .price-stat-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
    }

    .price-stat-value {
        font-size: 0.875rem;
        font-weight: 700;
    }

    .price-high {
        color: #dc2626;
    }

    .price-avg {
        color: #374151;
    }

    .price-low {
        color: #059669;
    }

    @media (max-width: 640px) {
        .price-stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
        }
        
        .price-stat-value {
            font-size: 0.75rem;
        }
    }
</style>