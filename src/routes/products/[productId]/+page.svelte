<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { fetchProductPricesById } from '$lib/api/products.js';
    import type { ProductWithPrice } from '$lib/types/Product.js';
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';

    let { productId } = page.params;
    let product: ProductWithPrice | null = $state(null)
    let isAvailable = $derived.by(() => {
        if (!product || product.prices.length === 0) {
            return false;
        }
        let latestPrice = product.prices[0];
        return latestPrice.is_available
    })

    let chartCanvas: HTMLCanvasElement;
    let chart: Chart;

    function createChart() {
        if (!product || !chartCanvas) return;
        
        const prices = [...product.prices].reverse();
        const data = {
            labels: prices.map(p => new Date(p.created_at).toLocaleDateString()),
            datasets: [{
                label: 'Price History',
                data: prices.map(p => p.price),
                fill: false,
                borderColor: '#2563eb',
                tension: 0.1
            }]
        };

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(chartCanvas, {
            type: 'line',
            data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Price History'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => `${value}`
                        }
                    }
                }
            }
        });
    }

    onMount(async () => {
        try {
            product = await fetchProductPricesById(productId);
            console.log($state.snapshot(product))
            if (product) {
                setTimeout(createChart, 0);
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    })

    onMount(() => {
        return () => {
            if (chart) chart.destroy();
        };
    });
    
</script>

<div class="product-details">
    <button class="back-button" onclick={() => goto('/products')}>
        ← Back to Products
    </button>

    <div class="product-header">
        <h1>{product?.name}</h1>
        <div class="flex-spacer"></div>
        <div class="availability-indicator">
            <span class="dot" class:available={isAvailable}></span>
            <span class="status-text">{isAvailable ? 'Available' : 'Unavailable'}</span>
        </div>
    </div>

    <div class="chart-container">
        <canvas bind:this={chartCanvas}></canvas>
    </div>

    <div class="details">
        {#each (product?.prices ?? []) as price }
        <div class="price-card">
            <div style="display: flex; justify-content: space-between; align-items: start">
                <div class="price-amount">{price.price}</div>
                <div class="date">{new Date(price.created_at).toLocaleDateString()}</div>
            </div>
            <div class="store-info">
                <span class="store-name">{price.website}</span>
                <a href={price.url} target="_blank" rel="noopener noreferrer" class="buy-link">
                    Visit Store →
                </a>
            </div>
        </div>
        {/each}
    </div>

<style>
    .price-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    }

    .price-card:hover {
        transform: translateY(-2px);
    }

    .price-amount {
        font-size: 1.75rem;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 0.5rem;
    }

    .store-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .store-name {
        color: #4b5563;
        font-weight: 500;
    }

    .buy-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .buy-link:hover {
        text-decoration: underline;
    }

    .product-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        width: 100%;
    }

    .flex-spacer {
        flex: 1;
    }

    .availability-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: auto;
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #d1d5db;
    }

    .dot.available {
        background-color: #22c55e;
        animation: pulse 2s infinite;
    }

    .status-text {
        font-size: 0.875rem;
        color: #6b7280;
    }

    @keyframes pulse {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        
        70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
        }
        
        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
    }
</style>
</div>

<style>
    .product-details {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .back-button {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
        margin-bottom: 2rem;
    }

    .back-button:hover {
        background-color: #f8f9fa;
    }

    .details {
        margin-top: 2rem;
    }

    .price {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 1rem;
    }

    .description {
        line-height: 1.6;
        color: #4b5563;
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
    }

    .chart-container {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
</style>
