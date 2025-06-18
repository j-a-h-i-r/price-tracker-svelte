<script lang="ts">
    import { page } from "$app/state";
    import {
    fetchExternalProductMetadata,
        fetchExternalProductPrices,
        fetchExternalProductsByInternalId,
        fetchProductById,
    } from "$lib/api/products.js";
    import type {
        ExternalProduct,
        ExternalProductPrice,
        ProductVariant,
        ExternalProductMetadata,
        Product,
    } from "$lib/types/Product.js";
    import { onMount } from "svelte";
    import { Chart } from "chart.js/auto";
    import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
    import { trackedProducts } from "$lib/states/tracked.svelte.js";
    import { fetchWebsites, type Website } from "$lib/api/websites.js";
    import { userState } from "$lib/shared.svelte.js";
    import { formatPrice } from "$lib/util.js";

    let productId = Number(page.params.productId);
    let product: Product | null = $state(null);
    let websiteMap: Map<number, Website> = $state(new Map());
    let externalProducts: ExternalProduct[] = $state([]);
    let externalProductPrices: Map<number, ExternalProductPrice[]> = $state(new Map());
    let isEditingMainProduct = $state(false);
    let editedMainName = $state('');
    let variants: ProductVariant[] = $state([]);
    let selectedVariants: Record<string, string> = $state({});
    let externalProductMetadatas: Map<number, ExternalProductMetadata[]> = $state(new Map());

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

    async function fetchVariantAttributes(productId: number) {
        try {
            const response = await fetch(`/api/products/${productId}/variantattributes`);
            if (!response.ok) throw new Error('Failed to fetch variants');
            return response.json();
        } catch (error) {
            console.error('Error fetching variants:', error);
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
            return fetchExternalProductMetadata(productId, external_product_id);
        });
        Promise.all(promises)
        .then((metadatas) => {
            const externalMedatas = new Map<number, ExternalProductMetadata[]>();
            externalProducts.forEach((externalProduct, index) => {
                externalMedatas.set(externalProduct.external_product_id, metadatas[index]);
            });
            externalProductMetadatas = externalMedatas;
        })
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
            if (price?.is_available) {
                return true;
            }
        }
        return false;
    });

    let priceStats30Day: Map<number, { high: number; low: number; average: number; count: number }> = $derived.by(() => {
        const statsMap = new Map();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        externalProductPrices.forEach((prices, externalProductId) => {
            const recentPrices = prices
                .filter(price => price.price != null && new Date(price.created_at) >= thirtyDaysAgo)
                .map(price => price.price);
            
            if (recentPrices.length > 0) {
                const high = Math.max(...recentPrices);
                const low = Math.min(...recentPrices);
                const average = Math.ceil(recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length);
                
                statsMap.set(externalProductId, {
                    high,
                    low,
                    average,
                    count: recentPrices.length
                });
            }
        });
        
        return statsMap;
    });

    let chartCanvas: HTMLCanvasElement | null = $state(null);
    let chart: Chart;

    function createChart() {
        if (!product || !chartCanvas) return;
        let priceDatasets: any[] = [];

        externalProductPrices.forEach((prices, externalProductId) => {
            const product = externalProducts.find((product) => product.external_product_id === externalProductId);
            const websiteName = websiteMap.get(product!.website_id)?.name;
            priceDatasets.push({
                label: `[${websiteName}] ${product!.name}`,
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
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: "Price History",
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        align: 'start',
                    }
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
                        title: {
                            display: true,
                            text: 'Price (৳)',
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
        const targetPriceInput = prompt('Enter your target price:');
        const targetPrice = parseFloat(targetPriceInput ?? '');
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

    async function handleMergeProduct() {
        const mergeProductIdInput = prompt('Enter the product ID to merge with:');
        const mergeProductId = parseInt(mergeProductIdInput ?? '');
        if (isNaN(mergeProductId) || mergeProductId <= 0) {
            alert('Please enter a valid product ID');
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}/merge`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productIds: [mergeProductId] }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to merge product');
            }
            
            alert('Products merged successfully!');
            // Refresh the page to show updated data
            window.location.reload();
        } catch (error) {
            console.error('Error merging product:', error);
            alert('Failed to merge product. Please try again.');
        }
    }

    onMount(async () => {
        try {
            const [_product, _variants] = await Promise.all([
                fetchProductById(productId),
                fetchVariantAttributes(productId),
            ])
            product = _product;
            variants = _variants;
        } catch (error) {
            console.error("Error fetching product:", error);
        }
    });

    $effect(() => {
        const sanitizedVariants: Record<string, string> = {};
        for (const [key, value] of Object.entries(selectedVariants)) {
            if (value !== 'unselected') {
                sanitizedVariants[key] = value;
            }
        }
        fetchExternalProductsByInternalId(productId, sanitizedVariants)
        .then((products) => {
            externalProducts = products;
        });
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
                <div class="admin-actions">
                    <button class="btn-edit" onclick={startEditingMain}>Edit</button>
                    <button class="btn-merge" onclick={handleMergeProduct}>Merge</button>
                </div>
            {/if}
        {/if}
        <div class="availability-indicator">
            <span class="dot" class:available={isAvailable}></span>
            <span class="status-text"
                >{isAvailable ? "Available" : "Unavailable"}</span
            >
        </div>
        {#if userState.email}
            {#if trackedProducts.isTracked(productId)}
                <button class="track-btn untrack" onclick={handleUntrack}> Untrack </button>
            {:else}
                <button class="track-btn" onclick={handleTrack}>Track</button>
            {/if}
        {/if}
    </div>

    {#if trackedProducts.isTracked(productId)}
        <div class="tracked-info">
            <p>
                You are tracking this product.
                The target price is {formatPrice(trackedProducts.getProduct(productId)!.target_price)}.
                If the price falls below target price you'll receive an email
            </p>
        </div>
    {/if}

    {#if variants.length > 0}
        <div class="variants-header">Select Configuration</div>
        <div class="variants-section">
            <div class="variants-grid">
                {#each variants as variant}
                    <div class="variant-selector">
                        <label for={variant.name}>{variant.display_text}</label>
                        <select 
                            id={variant.name}
                            bind:value={selectedVariants[variant.name]}
                        >
                            <option value="unselected"> Choose a value </option>
                            {#each variant.values as value}
                                <option value={value.value}>{value.display_text}</option>
                            {/each}
                        </select>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
    
    {#if externalProductsSorted.length > 0}
        <div class="websites-header">Available retailers</div>

        <div class="details">
            {#each externalProductsSorted as product}
                <div class="price-card">
                    <div class="product-name">
                        {product.name}
                    </div>
                    <div class="price-container">
                        <div
                            style="display: flex; align-items: center; gap: 0.5rem"
                        >
                            {#if latestPrice.get(product.external_product_id)?.price != null}
                                <div class="price-amount">{formatPrice(latestPrice.get(product.external_product_id)!.price)}</div>
                            {:else}
                                <div class="price-not-found">Price not found</div>
                            {/if}
                            {#if latestPrice.get(product.external_product_id)?.is_available}
                                <div class="availability-dot"></div>
                            {/if}
                            {#if latestPrice.get(product.external_product_id)?.price && latestPrice.get(product.external_product_id)!.price < maxPrice}
                                <div class="savings-badge">Save {formatPrice((maxPrice - latestPrice.get(product.external_product_id)!.price))}</div>
                            {/if}
                        </div>
                        {#if latestPrice.get(product.external_product_id)?.created_at}
                            <div class="timestamp">
                                Updated {new Date(latestPrice.get(product.external_product_id)!.created_at).toLocaleDateString()}
                            </div>
                        {/if}
                    </div>
                    <div class="store-info">
                        <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="buy-link"
                        >
                            View in <span class="store-name">{websiteMap.get(product.website_id)?.name}</span> →
                        </a>
                    </div>

                    {#if priceStats30Day.get(product.external_product_id)}
                        <div class="price-stats">
                            <div class="price-stats-grid">
                                <div class="price-stat">
                                    <span class="price-stat-label">30-Day High</span>
                                    <span class="price-stat-value price-high">{formatPrice(priceStats30Day.get(product.external_product_id)!.high)}</span>
                                </div>
                                <div class="price-stat">
                                    <span class="price-stat-label">30-Day Avg</span>
                                    <span class="price-stat-value price-avg">{formatPrice(priceStats30Day.get(product.external_product_id)!.average)}</span>
                                </div>
                                <div class="price-stat">
                                    <span class="price-stat-label">30-Day Low</span>
                                    <span class="price-stat-value price-low">{formatPrice(priceStats30Day.get(product.external_product_id)!.low)}</span>
                                </div>
                            </div>
                            <div class="price-stats-footer">
                                Based on {priceStats30Day.get(product.external_product_id)!.count} price points
                            </div>
                        </div>
                    {/if}

                    <div class="metadata-pills">
                        {#each externalProductMetadatas.get(product.external_product_id) ?? [] as metadata}
                            <div class="metadata-pill">
                                <span class="metadata-pill-label">{metadata.name_display_text}</span>
                                <span class="metadata-pill-value">{metadata.value_display_text}</span>
                            </div>
                        {/each}
                    </div>
                </div>

            {/each}
        </div>

        <div class="chart-container">
            <canvas bind:this={chartCanvas}></canvas>
        </div>
    {:else}
        <div class="no-products">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No products available for this configuration.</p>
            <p class="suggestion">Try selecting different configurations.</p>
        </div>
    {/if}

        <style>
        .variants-header {
            margin-top: 2rem;
        }
        .websites-header {
            margin-top: 2rem;
        }

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

        .btn-merge {
            padding: 0.25rem 0.5rem;
            background: #4f46e5;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-merge:hover {
            background: #4338ca;
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

        .variants-section {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .variants-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
        }

        .variant-selector {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .variant-selector label {
            font-size: 0.875rem;
            color: #6b7280;
            font-weight: 500;
        }

        .variant-selector select {
            padding: 0.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background-color: white;
            color: #374151;
            font-size: 0.875rem;
        }

        .variant-selector select:focus {
            outline: none;
            border-color: #2563eb;
            ring: 2px solid rgba(37, 99, 235, 0.2);
        }
    </style>

    <style>
        .price-card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .price-card:hover {
            transform: translateY(-2px);
        }

        .product-name {
            color: #6b7280;
            font-size: 0.875rem;
            line-height: 1.4;
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

        .btn-merge {
            padding: 0.25rem 0.5rem;
            background: #4f46e5;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-merge:hover {
            background: #4338ca;
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
            font-size: 1.5rem;
            font-weight: bold;
            color: #2563eb;
        }

        @media (min-width: 640px) {
            .price-amount {
                font-size: 1.75rem;
            }
        }

        .price-not-found {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
        }

        @media (min-width: 640px) {
            .price-not-found {
                font-size: 1rem;
            }
        }

        .store-info {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            justify-content: space-between;
            align-items: center;
            margin-left: auto;
        }

        .store-name {
            font-weight: 800;
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
            flex-wrap: wrap;
        }

        @media (max-width: 640px) {
            .product-header {
                flex-direction: column;
                align-items: stretch;
                gap: 0.5rem;
            }

            .product-header > h1 {
                margin-bottom: 0;
            }

            .product-header > h1,
            .product-header > .edit-name-container {
                width: 100%;
                order: -1;
            }

            .product-header > .btn-edit {
                align-self: flex-start;
            }

            .product-header > .availability-indicator {
                margin-left: 0;
                order: 1;
                align-self: flex-end;
            }

            .product-header > .track-btn {
                margin-top: 0.5rem;
                width: 100%;
                margin-left: 0;
                order: 2;
            }

            .edit-name-container {
                flex-direction: column;
                gap: 1rem;
            }

            .product-name-input {
                width: 100%;
                font-size: 1.25rem;
            }
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

        .price-stats {
            background: #f8fafc;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
            border: 1px solid #e2e8f0;
        }

        .price-stats-header {
            font-size: 0.875rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.75rem;
        }

        .price-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
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

        .price-stats-footer {
            margin-top: 0.75rem;
            font-size: 0.75rem;
            color: #6b7280;
            text-align: center;
            font-style: italic;
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

        .metadata-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
            margin-top: auto;
        }

        .metadata-pill {
            display: inline-flex;
            align-items: center;
            background: #f3f4f6;
            border-radius: 9999px;
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            gap: 0.375rem;
            line-height: 1;
        }

        .metadata-pill-label {
            color: #6b7280;
            font-weight: 500;
            white-space: nowrap;
        }

        .metadata-pill-value {
            color: #374151;
            font-weight: 600;
        }

        @media (max-width: 640px) {
            .store-info {
                width: 100%;
            }

            .buy-link {
                width: 100%;
                text-align: center;
                padding: 0.5rem;
                background-color: #2563eb;
                color: white;
                border-radius: 6px;
            }

            .buy-link:hover {
                background-color: #1d4ed8;
                text-decoration: none;
            }
        }
    </style>

    <style>
        .savings-badge {
            background-color: #22c55e;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .timestamp {
            font-size: 0.875rem;
            color: #6b7280;
            margin-left: auto;
            font-style: italic;
        }

        .availability-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #22c55e;
            animation: pulse 2s infinite;
        }
    </style>
</div>

<style>
    .product-details {
        max-width: 800px;
        margin: 1rem auto;
        padding: 0 1rem;
    }

    .details {
        margin: 1rem 0;
    }

    h1 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    @media (max-width: 640px) {
        h1 {
            font-size: 1.5rem;
            /* margin-bottom: 1.5rem; */
            width: 100%;
            line-height: 1.3;
        }

        .details {
            margin-top: 1rem;
        }
    }

    .chart-container {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        height: 60vh;
        position: relative;
    }

    @media (max-width: 640px) {
        .chart-container {
            height: 40vh;
        }
    }

    .no-products {
        background: white;
        border-radius: 8px;
        padding: 3rem 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .no-products .icon {
        width: 48px;
        height: 48px;
        color: #6b7280;
        margin-bottom: 0.5rem;
    }

    .no-products p {
        color: #374151;
        font-size: 1.125rem;
        font-weight: 500;
        margin: 0;
    }

    .no-products .suggestion {
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: normal;
    }

    .price-container {
        display: flex;
        justify-content: space-between;
        align-items: start;
        flex-flow: wrap-reverse;
        gap: 0.5rem;
    }

    .tracked-info {
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
    }
</style>
