<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import {
        fetchProductPricesById,
        fetchProductWebsites,
    } from "$lib/api/products.js";
    import type {
        ProductWebsiteWithPrice,
        ProductWithPrice,
        WebsitePrice,
    } from "$lib/types/Product.js";
    import { onMount } from "svelte";
    import { Chart } from "chart.js/auto";
    import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
    import { trackedProducts } from "$lib/states/tracked.svelte.js";
    import { callback } from "chart.js/helpers";

    let { productId } = page.params;
    let product: ProductWithPrice | null = $state(null);
    let productWebsites: ProductWebsiteWithPrice[] = $state([]);
    let isAvailable = $derived.by(() => {
        if (!product || product.prices.length === 0) {
            return false;
        }
        let latestPrice = product.prices[0];
        return latestPrice.is_available;
    });
    let websites: string[] = $derived.by(() => {
        if (!product || product.prices.length === 0) {
            return [];
        }
        let websites = new Set<string>();
        product.prices.forEach((price) => {
            websites.add(price.website);
        });
        return Array.from(websites);
    });

    let selectedWebsites = $state(new Set<string>());

    $effect(() => {
        if (websites.length > 0 && selectedWebsites.size === 0) {
            selectedWebsites = new Set(websites);
        }
    });


    let chartCanvas: HTMLCanvasElement;
    let chart: Chart;

    function createChart() {
        if (!product || !chartCanvas) return;

        // Group prices by website
        const pricesByWebsite = new Map<string, WebsitePrice[]>();
        product.prices.forEach((p) => {
            if (selectedWebsites.has(p.website)) {
                if (!pricesByWebsite.has(p.website)) {
                    pricesByWebsite.set(p.website, [p]);
                } else {
                    pricesByWebsite.get(p.website)?.push(p);
                }
            }
        });
        let priceDatasets: any[] = [];
        pricesByWebsite.forEach((prices, website) => {
            priceDatasets.push({
                label: website,
                data: prices.map((p) => ({
                    x: p.created_at,
                    y: p.price,
                })),
                // fill: false,
                // borderColor: '#2563eb',
                // tension: 0.1
            });
        });

        const data = {
            datasets: priceDatasets,
            // labels: product.prices.map(p => new Date(p.created_at).toLocaleDateString())
        };

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(chartCanvas, {
            type: "line",
            data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: "Price History",
                    },
                },
                scales: {
                    x: {
                        type: "timeseries",
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => `${value}`,
                        },
                    },
                },
            },
        });
    }

    async function handleUntrack() {
        try {
            const response = await fetch(`/api/products/${productId}/track`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to track product');
            }
            
            // Optional: Show some feedback to the user that tracking was successful
            alert('Product tracking disabled!');
            await trackedProducts.refresh();
        } catch (error) {
            console.error('Error tracking product:', error);
            alert('Failed to track product. Please try again.');
        }
    }

    async function handleTrack() {
        const targetPrice = parseFloat(prompt('Enter your target price:'));
        if (isNaN(targetPrice) || targetPrice <= 0) {
            alert('Please enter a valid target price');
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target_price: targetPrice }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to track product');
            }
            
            alert('Product tracking enabled!');
            await trackedProducts.refresh();
        } catch (error) {
            console.error('Error tracking product:', error);
            alert('Failed to track product. Please try again.');
        }
    }

    onMount(async () => {
        try {
            product = await fetchProductPricesById(productId);
            let productWithWebsites = await fetchProductWebsites(productId);
            let { websites } = productWithWebsites;
            let currentPrices = websites.map((website) => {
                return product?.prices.find(
                    (price) => price.website === website.website_name,
                );
            })
            let maxCurrentPrice = Math.max(
                ...currentPrices.map((price) => price?.price || 0),
            );
            productWebsites = websites.map((website, index) => {
                let currentPrice = currentPrices[index];
                let savedPrice = null;
                if (currentPrice && currentPrice.price) {
                    savedPrice = maxCurrentPrice - currentPrice.price;
                }
                return {
                    ...website,
                    price: currentPrice?.price ? currentPrice.price : null,
                    is_available: currentPrice
                        ? currentPrice.is_available
                        : false,
                    created_at: currentPrice ? currentPrice.created_at : null,
                    saved_price: savedPrice,
                };
            });

            if (product) {
                setTimeout(createChart, 0);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
        }
    });

    onMount(() => {
        return () => {
            if (chart) chart.destroy();
        };
    });
</script>

<div class="product-details">
    <div class="product-header">
        <h1>{product?.name}</h1>
        <div class="flex-spacer"></div>
        <div class="availability-indicator">
            <span class="dot" class:available={isAvailable}></span>
            <span class="status-text"
                >{isAvailable ? "Available" : "Unavailable"}</span
            >
        </div>
        {#if trackedProducts.isTracked(productId)}
            <button class="track-btn untrack" onclick={handleUntrack}> Untrack </button>
        {:else}
            <button class="track-btn" onclick={handleTrack}>Track</button>
        {/if}
    </div>

    <style>
        .untrack {
            background-color: #dc2626;
        }

        .track-btn {
            padding: 0.5rem 1rem;
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-left: 1rem;
        }

        .track-btn:hover {
            background-color: #1d4ed8;
        }
    </style>

    <div class="websites-header">Available retailers</div>

    <style>
        .websites-header {
            color: #6b7280;
            font-size: 1rem;
            margin-bottom: 1rem;
            font-weight: 500;
        }
    </style>

    <div class="details">
        {#each productWebsites as website}
            <div class="price-card">
                <div
                    style="display: flex; justify-content: space-between; align-items: start"
                >
                    <div
                        style="display: flex; align-items: center; gap: 0.5rem"
                    >
                        {#if website.price !== null}
                            <div class="price-amount">{website.price}</div>
                        {:else}
                            <div class="price-not-found">Price not found</div>
                        {/if}
                        {#if website.is_available}
                            <div class="availability-dot"></div>
                        {/if}
                        {#if website.saved_price && website.saved_price > 0}
                            <div class="savings-badge">Save {website.saved_price.toFixed(2)}</div>
                        {/if}
                    </div>
                    {#if website.created_at}
                        <div class="timestamp">
                            {new Date(website.created_at).toLocaleDateString()}
                        </div>
                    {/if}
                </div>
                <div class="store-info">
                    <span class="store-name">{website.website_name}</span>
                    <a
                        href={website.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="buy-link"
                    >
                        Visit Store →
                    </a>
                </div>
            </div>

            <style>
                .savings-badge {
                    background-color: #22c55e;
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
            </style>

            <style>
                .timestamp {
                    font-size: 0.875rem;
                    color: #6b7280;
                }
            </style>

            <style>
                .availability-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #22c55e;
                    animation: pulse 2s infinite;
                }
            </style>
        {/each}
    </div>

    <div class="chart-container">
        <canvas bind:this={chartCanvas}></canvas>
    </div>

    {#if product?.raw_metadata}
        <div class="metadata-section">
            <h2>Product Specifications</h2>
            <div class="metadata-grid">
                {#each Object.entries(product.raw_metadata) as [key, value]}
                    <div class="metadata-item">
                        <span class="metadata-key">{key}</span>
                        <span class="metadata-value">{value}</span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <style>
        .price-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }

        .price-card:hover {
            transform: translateY(-2px);
        }

        .price-amount {
            font-size: 1.75rem;
            font-weight: bold;
            color: #2563eb;
        }

        .price-not-found {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
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

        .website-filters {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 0.5rem;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
            width: 1rem;
            height: 1rem;
        }

        .metadata-section {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 2rem 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .metadata-section h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 1.5rem;
        }

        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }

        .metadata-item {
            padding: 0.75rem;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .metadata-key {
            color: #6b7280;
            font-size: 0.875rem;
            text-transform: uppercase;
            font-weight: 500;
        }

        .metadata-value {
            color: #1f2937;
            font-size: 1rem;
            font-weight: 500;
        }
    </style>
</div>

<style>
    .product-details {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .details {
        margin-top: 2rem;
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
