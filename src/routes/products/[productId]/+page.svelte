<script lang="ts">
    import { page } from "$app/state";
    import {
        fetchExternalProductPrices,
        fetchExternalProductsByInternalId,
        fetchProductPricesById,
    } from "$lib/api/products.js";
    import type {
        ExternalProduct,
        ExternalProductPrice,
        ProductWithPrice,
    } from "$lib/types/Product.js";
    import { onMount } from "svelte";
    import { Chart } from "chart.js/auto";
    import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
    import { trackedProducts } from "$lib/states/tracked.svelte.js";
    import { fetchWebsites, type Website } from "$lib/api/websites.js";
    import { userState } from "$lib/shared.svelte.js";

    let productId = Number(page.params.productId);
    let product: ProductWithPrice | null = $state(null);
    let websiteMap: Map<number, Website> = $state(new Map());
    let externalProducts: ExternalProduct[] = $state([]);
    let externalProductPrices: Map<number, ExternalProductPrice[]> = $state(new Map());
    let isEditingMainProduct = $state(false);
    let editedMainName = $state('');

    async function handleSaveMainProduct() {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: editedMainName }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update product name');
            }
            
            if (product) {
                product = { ...product, name: editedMainName };
            }
            isEditingMainProduct = false;
            editedMainName = '';
        } catch (error) {
            console.error('Error updating product name:', error);
            alert('Failed to update product name. Please try again.');
        }
    }

    function startEditingMain() {
        if (product) {
            isEditingMainProduct = true;
            editedMainName = product.name;
        }
    }

    onMount(async () => {
        try {
            let websites = await fetchWebsites();
            websiteMap = new Map(websites.map((website: Website) => [website.id, website]));
        } catch (error) {
            console.error('Error fetching websites:', error);
        }
    });
    
    $effect(() => {
        const promises = externalProducts.map(async (externalProduct) => {
            const { external_product_id } = externalProduct;
            const prices = await fetchExternalProductPrices(productId, external_product_id);
            return prices;
        });
        Promise.all(promises)
        .then((prices) => {
            const productPrices = new Map<number, ExternalProductPrice[]>();
            externalProducts.forEach((externalProduct, index) => {
                productPrices.set(externalProduct.external_product_id, prices[index]);
            });
            externalProductPrices = productPrices;

            setTimeout(() => {
                createChart();
            }, 0);
        })
    })

    let latestPrice: Map<number, ExternalProductPrice> = $derived.by(() => {
        let latestPriceMap = new Map<number, ExternalProductPrice>();
        externalProductPrices.forEach((prices, externalProductId) => {
            let latestPrice = prices[0];
            latestPriceMap.set(externalProductId, latestPrice);
        });
        return latestPriceMap;
    });

    let externalProductsSorted = $derived.by(() => {
        return externalProducts.toSorted((a, b) => {
            const aPrice = latestPrice.get(a.external_product_id)?.price || +Infinity;
            const bPrice = latestPrice.get(b.external_product_id)?.price || +Infinity;
            return aPrice - bPrice;
        });
    });

    let maxPrice = $derived.by(() => {
        let maxPrice = 0;
        for (const price of latestPrice.values()) {
            if (price?.price > maxPrice) {
                maxPrice = price.price;
            }
        }
        return maxPrice;
    });

    let isAvailable = $derived.by(() => {
        for (const price of latestPrice.values()) {
            if (price.is_available) {
                return true;
            }
        }
        return false;
    });

    let chartCanvas: HTMLCanvasElement;
    let chart: Chart;

    function createChart() {
        if (!product || !chartCanvas) return;
        let priceDatasets: any[] = [];

        externalProductPrices.forEach((prices, externalProductId) => {
            const product = externalProducts.find((product) => product.external_product_id === externalProductId);
            const websiteName = websiteMap.get(product!.website_id)?.name;
            priceDatasets.push({
                label: `${websiteName} : ${product!.name}`,
                data: prices.map((p) => ({
                    x: p.created_at,
                    y: p.price,
                })),
            })
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
                        type: "time",
                        time: {
                            unit: 'day'
                        }
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
            externalProducts = await fetchExternalProductsByInternalId(productId);
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
        {#if isEditingMainProduct}
            <div class="edit-name-container">
                <input
                    type="text"
                    class="product-name-input"
                    bind:value={editedMainName}
                    placeholder="Enter product name"
                />
                <div class="edit-buttons">
                    <button class="btn-save" onclick={handleSaveMainProduct}>Save</button>
                    <button class="btn-cancel" onclick={() => isEditingMainProduct = false}>Cancel</button>
                </div>
            </div>
        {:else}
            <h1>{product?.name}</h1>
            {#if userState.isAdmin}
                <button class="btn-edit" onclick={startEditingMain}>Edit</button>
            {/if}
        {/if}
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
        .edit-name-container {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .product-name-input {
            padding: 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 1.5rem;
            color: #374151;
            width: 400px;
        }

        .btn-edit {
            padding: 0.25rem 0.5rem;
            background: transparent;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            color: #6b7280;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: 0.5rem;
        }

        .btn-edit:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }

        .edit-buttons {
            display: flex;
            gap: 0.5rem;
        }

        .btn-save {
            padding: 0.25rem 0.5rem;
            background: #2563eb;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
        }

        .btn-save:hover {
            background: #1d4ed8;
        }

        .btn-cancel {
            padding: 0.25rem 0.5rem;
            background: transparent;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            color: #6b7280;
            font-size: 0.875rem;
            cursor: pointer;
        }

        .btn-cancel:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }

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
        {#each externalProductsSorted as product}
            <div class="price-card">
                <div class="product-name">
                    {product.name}
                </div>
                <div
                    style="display: flex; justify-content: space-between; align-items: start"
                >
                    <div
                        style="display: flex; align-items: center; gap: 0.5rem"
                    >
                        {#if latestPrice.get(product.external_product_id)?.price != null}
                            <div class="price-amount">{latestPrice.get(product.external_product_id)?.price}</div>
                        {:else}
                            <div class="price-not-found">Price not found</div>
                        {/if}
                        {#if latestPrice.get(product.external_product_id)?.is_available}
                            <div class="availability-dot"></div>
                        {/if}
                        {#if latestPrice.get(product.external_product_id)?.price && latestPrice.get(product.external_product_id)!.price < maxPrice}
                            <div class="savings-badge">Save {(maxPrice - latestPrice.get(product.external_product_id)!.price).toFixed(2)}</div>
                        {/if}
                    </div>
                    {#if latestPrice.get(product.external_product_id)?.created_at}
                        <div class="timestamp">
                            {new Date(latestPrice.get(product.external_product_id)!.created_at).toLocaleDateString()}
                        </div>
                    {/if}
                </div>
                <div class="store-info">
                    <span class="store-name">{websiteMap.get(product.website_id)?.name}</span>
                    <a
                        href={product.url}
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

        .product-name-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .product-name {
            color: #6b7280;
            font-size: 0.875rem;
            flex: 1;
        }

        .product-name-input {
            flex: 1;
            padding: 0.25rem 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            font-size: 0.875rem;
            color: #374151;
        }

        .btn-edit {
            padding: 0.25rem 0.5rem;
            background: transparent;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            color: #6b7280;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-edit:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }

        .edit-buttons {
            display: flex;
            gap: 0.5rem;
        }

        .btn-save {
            padding: 0.25rem 0.5rem;
            background: #2563eb;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 0.75rem;
            cursor: pointer;
        }

        .btn-save:hover {
            background: #1d4ed8;
        }

        .btn-cancel {
            padding: 0.25rem 0.5rem;
            background: transparent;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            color: #6b7280;
            font-size: 0.75rem;
            cursor: pointer;
        }

        .btn-cancel:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
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
