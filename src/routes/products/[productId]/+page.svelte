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

    function toggleWebsite(website: string) {
        if (selectedWebsites.has(website)) {
            selectedWebsites.delete(website);
        } else {
            selectedWebsites.add(website);
        }
        createChart();
    }

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

        console.log(pricesByWebsite);
        let priceDatasets: any[] = [];
        const colors = [
            "#2563eb",
            "#dc2626",
            "#16a34a",
            "#d97706",
            "#7c3aed",
            "#db2777",
        ];
        pricesByWebsite.forEach((prices, website) => {
            console.log(prices);
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

        console.log(priceDatasets);

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
                return {
                    ...website,
                    price: currentPrice?.price ? currentPrice.price : null,
                    is_available: currentPrice
                        ? currentPrice.is_available
                        : false,
                    created_at: currentPrice ? currentPrice.created_at : null,
                    saved_price: maxCurrentPrice - 
                        (currentPrice ? currentPrice.price : 0),
                };
            });

            console.log($state.snapshot(product));
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
    <button class="back-button" onclick={() => goto("/products")}>
        ← Back to Products
    </button>

    <div class="product-header">
        <h1>{product?.name}</h1>
        <div class="flex-spacer"></div>
        <div class="availability-indicator">
            <span class="dot" class:available={isAvailable}></span>
            <span class="status-text"
                >{isAvailable ? "Available" : "Unavailable"}</span
            >
        </div>
    </div>

    <div class="website-filters">
        <h3>Filter by Website</h3>
        <div class="checkbox-group">
            {#each websites as website}
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        checked={selectedWebsites.has(website)}
                        onchange={() => toggleWebsite(website)}
                    />
                    {website}
                </label>
            {/each}
        </div>
    </div>

    <div class="chart-container">
        <canvas bind:this={chartCanvas}></canvas>
    </div>

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
                        <div class="price-amount">{website.price}</div>
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
