<script lang="ts">
    import { userState } from '$lib/shared.svelte.js';
    import { onMount } from 'svelte';
    import { trackedProducts } from '$lib/states/tracked.svelte.js';
    import { formatPrice } from '$lib/util.js';
    import { fetchTrackedProductPriceHistory } from '$lib/api/products.js';
    import type { ExternalProductPrice } from '$lib/types/Product.js';
    import PriceHistoryChart from '$lib/components/PriceHistoryChart.svelte';

    let email = $state('');
    let message = $state('');
    let isLoading = $state(false);
    let isSignedIn = $state(false);
    let priceHistoryData: Map<number, ExternalProductPrice[]> = $state(new Map());
    let loadingPriceHistory: Set<number> = $state(new Set());

    onMount(async () => {
        if (userState.email) {
            email = userState.email;
            isSignedIn = true;
        }
    });

    async function loadPriceHistory(productId: number) {
        if (loadingPriceHistory.has(productId) || priceHistoryData.has(productId)) return;
        
        loadingPriceHistory.add(productId);
        try {
            const history = await fetchTrackedProductPriceHistory(productId);
            priceHistoryData.set(productId, history);
            priceHistoryData = new Map(priceHistoryData); // Trigger reactivity
        } catch (error) {
            console.error(`Error loading price history for product ${productId}:`, error);
            // Set empty array to indicate we tried to load but failed
            priceHistoryData.set(productId, []);
            priceHistoryData = new Map(priceHistoryData);
        } finally {
            loadingPriceHistory.delete(productId);
            loadingPriceHistory = new Set(loadingPriceHistory);
        }
    }

    async function handleSignup() {
        isLoading = true;
        try {
            const response = await fetch('/api/auth/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            if (result === true) {
                message = 'Check your email for an authorization link';
                email = '';
            }
        } catch (error) {
            message = 'An error occurred. Please try again.';
        }
        isLoading = false;
    }

    async function signOut() {
        await fetch('/api/auth/logout', { method: 'POST' });
        userState.signOut();
        isSignedIn = false;
        trackedProducts.clear();
        email = '';
    }

    async function handleUntrack(productId: number) {
        try {
            const response = await fetch(`/api/products/${productId}/track`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to untrack product');
            }
            
            await trackedProducts.refresh();
        } catch (error) {
            console.error('Error untracking product:', error);
            alert('Failed to untrack product. Please try again.');
        }
    }
</script>

{#if isSignedIn}
    <div class="outer-container">
        <button class="logout-button" onclick={signOut}>
            Sign Out
        </button>
        <div class="container">
            <div class="header">
                <h1>Your Tracked Products</h1>
            </div>
            
            {#if trackedProducts.products.length === 0}
                <p class="empty-state">You haven't tracked any products yet.</p>
            {:else}
                <div class="products-grid">
                    {#each trackedProducts.products as product}
                        <div class="product-card {product.current_price < product.target_price ? 'highlight' : ''}">
                            <div class="product-header">
                                <h3>
                                    <a href={`products/${product.product_id}`}>{product.name}</a>
                                </h3>
                                <button 
                                    class="untrack-button"
                                    onclick={() => handleUntrack(product.product_id)}
                                >
                                    Untrack
                                </button>
                            </div>
                            
                            <div class="price-info">
                                <div class="price-row">
                                    <span class="price-label">Current:</span>
                                    <span class="price-value current">{formatPrice(product.current_price)}</span>
                                </div>
                                <div class="price-row">
                                    <span class="price-label">Target:</span>
                                    <span class="price-value target">{formatPrice(product.target_price)}</span>
                                </div>
                                {#if product.current_price < product.target_price}
                                    <div class="savings-info">
                                        🎯 Target reached! Save {formatPrice(product.target_price - product.current_price)}
                                    </div>
                                {/if}
                            </div>

                            <!-- Price History Chart -->
                            <div class="chart-section">
                                {#if !priceHistoryData.has(product.product_id) && !loadingPriceHistory.has(product.product_id)}
                                    <button 
                                        class="load-chart-btn"
                                        onclick={() => loadPriceHistory(product.product_id)}
                                    >
                                        📊 Show Price History
                                    </button>
                                {:else if loadingPriceHistory.has(product.product_id)}
                                    <div class="chart-loading">Loading price history...</div>
                                {:else if priceHistoryData.get(product.product_id)}
                                    <PriceHistoryChart 
                                        priceData={priceHistoryData.get(product.product_id) || []}
                                        productName={product.name}
                                        height="180px"
                                        showTitle={false}
                                        targetPrice={product.target_price}
                                    />
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{:else}
    <div class="container">
        <h1>Sign In</h1>
        
        <form onsubmit={(e) => { e.preventDefault(); handleSignup(); }}>
            <div class="form-group">
                <label for="email">Email address</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    required
                    placeholder="Enter your email"
                />
            </div>

            {#if message}
                <div class="message {message.includes('Check your email') ? 'success' : 'error'}">
                    {message}
                </div>
            {/if}

            <button
                type="submit"
                disabled={isLoading}
            >
                {isLoading ? 'Signing up...' : 'Sign up'}
            </button>
        </form>
    </div>
{/if}

<style>
    .container {
        max-width: 1200px;
        margin: 4rem auto 0;
        padding: 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    h1 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #111827;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #374151;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .message {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    .success {
        background-color: #ecfdf5;
        color: #047857;
    }

    .error {
        background-color: #fef2f2;
        color: #b91c1c;
    }

    button {
        width: 100%;
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #1d4ed8;
    }

    button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .product-card {
        padding: 1.5rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: white;
        transition: all 0.2s ease-in-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .product-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }

    .product-card.highlight {
        background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
        border-color: #059669;
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
    }

    .product-card h3 {
        font-size: 1.1rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #1f2937;
    }

    .product-card h3 a {
        color: #2563eb;
        text-decoration: none;
    }

    .product-card h3 a:hover {
        text-decoration: underline;
    }

    .price-info {
        margin: 1rem 0;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
    }

    .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .price-row:last-child {
        margin-bottom: 0;
    }

    .price-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
    }

    .price-value {
        font-size: 1rem;
        font-weight: 700;
    }

    .price-value.current {
        color: #2563eb;
    }

    .price-value.target {
        color: #dc2626;
    }

    .savings-info {
        margin-top: 0.75rem;
        padding: 0.5rem;
        background: #dbeafe;
        border: 1px solid #93c5fd;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1e40af;
        text-align: center;
    }

    .chart-section {
        margin-top: 1rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
    }

    .load-chart-btn {
        width: 100%;
        padding: 0.75rem;
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s;
    }

    .load-chart-btn:hover {
        background: linear-gradient(135deg, #e5e7eb, #d1d5db);
        border-color: #9ca3af;
    }

    .chart-loading {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
        font-style: italic;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    .empty-state {
        text-align: center;
        color: #6b7280;
        padding: 2rem 0;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .header h1 {
        margin-bottom: 0;
    }

    .outer-container {
        position: relative;
        max-width: 1200px;
        margin: 4rem auto 0;
    }

    .logout-button {
        position: absolute;
        top: -2.5rem;
        right: 1.5rem;
        width: auto;
        background-color: #ef4444;
    }

    .logout-button:hover {
        background-color: #dc2626;
    }

    .product-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.5rem;
    }

    .untrack-button {
        width: auto;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background-color: #dc2626;
    }

    .untrack-button:hover {
        background-color: #b91c1c;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .products-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .outer-container {
            max-width: 100%;
            margin: 2rem auto 0;
            padding: 0 1rem;
        }

        .container {
            max-width: 100%;
            margin: 0;
            padding: 1rem;
        }

        .product-card {
            padding: 1rem;
        }

        .price-info {
            margin: 0.75rem 0;
            padding: 0.75rem;
        }

        .logout-button {
            position: static;
            width: 100%;
            margin-bottom: 1rem;
        }
    }
</style>