<script lang="ts">
    import { fetchPotentiallySimilarProducts, fetchProductById } from '$lib/api/products';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { userState } from '$lib/user.svelte.js';
    import { toasts } from '$lib/states/toast';
    import type { PotentialProductMatch, Product } from '$lib/types/Product.js';
    import { ResultAsync } from 'neverthrow';

    let products: PotentialProductMatch[] = $state([]);
    let isLoading = $state(true);
    let error = $state('');
    let showModal = $state(false);
    let selectedProduct: Product | null = $state(null);
    let selectedSimilarProduct: Product | null = $state(null);
    let minScore = $state(0.8); // Default to 0.8

    onMount(async () => {
        if (!userState.isAdmin) {
            goto('/');
            return;
        }
        await fetchProducts();
    });

    async function fetchProducts() {
        isLoading = true;
        const resp = await fetchPotentiallySimilarProducts({ minScore });
        if (resp.isOk()) {
            products = resp.value;
            error = '';
        } else {
            error = 'An error occured';
        }
        isLoading = false;
    }

    async function handleScoreChange() {
        await fetchProducts();
    }

    async function handleMerge(product1Id: number, product2Id: number) {
        try {
            const response = await fetch(`/api/products/${product1Id}/merge`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productIds: [product2Id]})
            });

            if (!response.ok) {
                throw new Error('Failed to merge products');
            }

            toasts.success('Products merged successfully');
            closeModal();
            // Refresh the products list
            await fetchProducts();
        } catch (error) {
            console.error('Error merging products:', error);
            toasts.error('Failed to merge products. Please try again.');
        }
    }

    async function handleIgnore(product1Id: number, product2Id: number) {
        try {
            const response = await fetch(`/api/products/${product1Id}/ignore`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productIds: [product2Id]})
            });

            if (!response.ok) {
                throw new Error('Failed to ignore product match');
            }

            toasts.success('Products marked as not similar');
            closeModal();
            // Refresh the products list
            await fetchProducts();
        } catch (error) {
            console.error('Error ignoring product match:', error);
            toasts.error('Failed to ignore product match. Please try again.');
        }
    }

    async function openComparisonModal(product: PotentialProductMatch, similarProduct: { product_id: number }) {
        selectedProduct = null;
        selectedSimilarProduct = null;
        showModal = true;

        const resp = await ResultAsync.combine([
            fetchProductById(product.product_id),
            fetchProductById(similarProduct.product_id)
        ])
        if (resp.isOk()) {
            selectedProduct = resp.value[0];
            selectedSimilarProduct = resp.value[1];
        } else {
            error = 'Failed to load product details';
            console.error(resp.error);
            closeModal();
        }
    }

    function closeModal() {
        showModal = false;
        selectedProduct = null;
        selectedSimilarProduct = null;
    }

    function getMetadataValue(product: Product, key: string) {
        const productMetadata = { ...product.parsed_metadata, ...product.raw_metadata };
        return productMetadata[key] !== undefined ? productMetadata[key] : 'N/A';
    }

    function metadataMatches(product: Product, similarProduct: Product, key: string) {
        const productMetadata = { ...product.parsed_metadata, ...product.raw_metadata };
        const similarProductMetadata = { ...similarProduct.parsed_metadata, ...similarProduct.raw_metadata };

        return productMetadata[key] === similarProductMetadata[key];
    }
</script>

<div class="container">
    <div class="header">
        <div class="header-left">
            <h1>Products</h1>
            <div class="score-filter">
                <label for="min-score">Min. Similarity:</label>
                <input 
                    id="min-score"
                    type="number" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    bind:value={minScore}
                    onchange={handleScoreChange}
                />
            </div>
        </div>
        <a href="/admin" class="back-button">← Back to Dashboard</a>
    </div>

    {#if isLoading}
        <div class="loading">Loading products...</div>
    {:else if error}
        <div class="error">{error}</div>
    {:else}
        <div class="products-grid">
            {#each products as product, index (index)}
                <div class="product-comparison">
                    <div class="product-main">
                        <h2><a href="/products/{product.product_id}">{product.product_name}</a></h2>
                        <div class="similar-products">
                            {#each product.similar_products as similarProduct, index (index)}
                                <div class="similar-product">
                                    <div class="similar-product-info">
                                        <p>
                                            <a href="/products/{similarProduct.product_id}">{similarProduct.product_name}</a>
                                        </p>
                                        <span class="similarity-score">Similarity: {similarProduct.similarity_score.toFixed(2)}</span>
                                    </div>
                                    <div class="action-buttons">
                                        <button 
                                            class="btn btn-primary"
                                            onclick={() => handleMerge(product.product_id, similarProduct.product_id)}
                                        >
                                            Merge
                                        </button>
                                        <button 
                                            class="btn btn-outline"
                                            onclick={() => handleIgnore(product.product_id, similarProduct.product_id)}
                                        >
                                            Ignore
                                        </button>
                                        <button 
                                            class="btn btn-secondary"
                                            onclick={() => openComparisonModal(product, similarProduct)}
                                        >
                                            Compare
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if showModal}
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="modal" onclick={closeModal} role="dialog" aria-label="Product Comparison">
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="modal-content" onclick={(e) => { e.stopPropagation();}}>
                    <div class="modal-header">
                        <h2>Product Comparison</h2>
                        <button class="close-btn" onclick={closeModal}>&times;</button>
                    </div>
                    <div class="comparison-grid">
                        <div class="metadata-table-container">
                            <table class="metadata-table">
                                <thead>
                                    <tr>
                                        <th>Key</th>
                                        <th>{selectedProduct?.name}</th>
                                        <th>{selectedSimilarProduct?.name}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#if selectedProduct && selectedSimilarProduct}
                                        {#each Object.keys({...selectedProduct.parsed_metadata, ...selectedProduct.raw_metadata}) as key, index (index)}
                                            <tr>
                                                <td class="metadata-key">{key}</td>
                                                <td class="metadata-value">
                                                    <div class="metadata-content">
                                                        <span class={metadataMatches(selectedProduct, selectedSimilarProduct, key) ? 'matching-value': 'non-matching-value'}>
                                                            {getMetadataValue(selectedProduct, key)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td class="metadata-value">
                                                    <div class="metadata-content">
                                                        <span class={metadataMatches(selectedProduct, selectedSimilarProduct, key) ? 'matching-value': 'non-matching-value'}>
                                                            {getMetadataValue(selectedSimilarProduct, key)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    {/if}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick={() => handleMerge(selectedProduct?.id ?? 0, selectedSimilarProduct?.id ?? 0)}>
                            Merge Products
                        </button>
                        <button class="btn btn-outline" onclick={() => handleIgnore(selectedProduct?.id ?? 0, selectedSimilarProduct?.id ?? 0)}>
                            Ignore Match
                        </button>
                        <button class="btn btn-secondary" onclick={closeModal}>Close</button>
                    </div>
                </div>
            </div>

            <style>
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    width: 90%;
                    max-width: 1000px;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                }

                .comparison-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .metadata-table-container {
                    max-height: calc(90vh - 200px);
                    overflow-y: auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .metadata-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1rem;
                    background: white;
                }

                .metadata-table th {
                    background: #f8fafc;
                    padding: 0.75rem;
                    text-align: left;
                    font-weight: 600;
                    color: #1f2937;
                    border: 1px solid #e5e7eb;
                    position: sticky;
                    top: 0;
                    z-index: 1;
                }

                .metadata-table td {
                    padding: 0.75rem;
                    border: 1px solid #e5e7eb;
                    vertical-align: top;
                }

                .metadata-key {
                    color: #4b5563;
                    font-size: 0.875rem;
                    font-weight: 500;
                    width: 20%;
                    background: #f9fafb;
                }

                .metadata-value {
                    width: 40%;
                }

                .metadata-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .matching-value {
                    color: #047857;
                    font-weight: 500;
                    padding: 0.25rem 0.5rem;
                    background: #ecfdf5;
                    border-radius: 4px;
                    font-size: 0.875rem;
                }

                .non-matching-value {
                    color: #6b7280;
                    font-size: 0.875rem;
                    padding: 0.25rem 0.5rem;
                    background: #f3f4f6;
                    border-radius: 4px;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e5e7eb;
                }

                @media (max-width: 640px) {
                    .comparison-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        {/if}
    {/if}
</div>

<style>
    .container {
        max-width: 64rem;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .score-filter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .score-filter label {
        font-size: 0.875rem;
        color: #4b5563;
    }

    .score-filter input {
        width: 5rem;
        padding: 0.375rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
        color: #374151;
    }

    .score-filter input:focus {
        outline: none;
        border-color: #2563eb;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
        margin: 0;
    }

    .back-button {
        color: #4b5563;
        text-decoration: none;
        font-size: 0.875rem;
    }

    .back-button:hover {
        color: #111827;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }

    .error {
        text-align: center;
        padding: 2rem;
        color: #dc2626;
        background: #fef2f2;
        border-radius: 8px;
    }

    .products-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .product-comparison {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .product-main h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1rem;
    }

    .similar-products {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .similar-product {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 6px;
    }

    .similar-product-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .similar-product-info p {
        font-weight: 500;
        margin: 0;
    }

    .similarity-score {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .btn {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-primary {
        background: #2563eb;
        color: white;
        border: none;
    }

    .btn-primary:hover {
        background: #1d4ed8;
    }

    .btn-secondary {
        background: #4b5563;
        color: white;
        border: none;
    }

    .btn-secondary:hover {
        background: #374151;
    }

    .btn-outline {
        background: transparent;
        border: 1px solid #d1d5db;
        color: #4b5563;
    }

    .btn-outline:hover {
        background: #f3f4f6;
    }

    @media (max-width: 640px) {
        .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        
        .header-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }

        .comparison-grid {
            grid-template-columns: 1fr;
        }
    }
</style>