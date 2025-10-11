<script lang="ts">
    import { page } from '$app/state';
    import { onMount } from 'svelte';
    import { fetchProducts } from '$lib/api/products';
    import type { ProductWithLastPrice } from '$lib/types/Product';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import { formatPrice } from '$lib/util.js';
    import { generateSEOConfig } from '$lib/seo.js';
    import Pagination from '$lib/components/Pagination.svelte';
    import Loader from '$lib/components/Loader.svelte';
    import NoResult from '$lib/components/NoResult.svelte';
    import type { PageProps } from '../$types.js';

    let { data }: PageProps = $props();

    let queryCategoryId: string | null = $state(null);
    onMount(() => {
        // This is necessary to make sure it only runs in browser
        queryCategoryId = page.url.searchParams.get('category_id');
        selectedCategory = queryCategoryId ? queryCategoryId : 'all';
    });

    let paginatedProducts: ProductWithLastPrice[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let isFilterModalOpen = $state(false);
    let modalNode: HTMLDivElement | null = null;

    // Filters
    let selectedCategory: string | number = $state('all');
    let selectedManufacturer: string | number = $state('all');
    let sortBy = $state<'+price' | '-price' | '+name' | '-name'>('+price');
    let searchQuery = $state('');
    let priceRange = $state({min: 0, max: 0});

    function handleClickOutside(event: MouseEvent) {
        if (modalNode && !modalNode.contains(event.target as Node)) {
            isFilterModalOpen = false;
        }
    }

    $effect(() => {
        // Prevent body scroll when modal is open
        if (isFilterModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    });

    function paginateProductApi({
        category_id,
        manufacturer_id,
        min_price,
        max_price,
        name,
        sort_by
    }: {
        category_id?: number;
        manufacturer_id?: number;
        min_price?: number;
        max_price?: number;
        name?: string;
        sort_by?: '+price' | '-price' | '+name' | '-name';}
    ) {
        return fetchProducts({
            category_id,
            manufacturer_id,
            min_price,
            max_price,
            name,
            sort_by,
        }, {limit: 20});
    }

    // Debounced filter inputs for not spamming API on every input change
    let de_minPrice: number | undefined = $state(undefined);
    let de_maxPrice: number | undefined = $state(undefined);
    let de_name: string | undefined = $state(undefined);

    let debouncedInputs = debounce();
    $effect(() => {
        let fn = ([min, max, query]: [number | undefined, number | undefined, string | undefined]) => {
            return () => {
                const min_price = min > 0 ? min : undefined;
                const max_price = max > 0 ? max : undefined;
                const name = query?.length > 0 ? query : undefined;
                de_maxPrice = max_price;
                de_minPrice = min_price;
                de_name = name;
            }
        }
        debouncedInputs(fn([priceRange.min, priceRange.max, searchQuery]));
    })

    let [paginatedProductApi, newPagination]: [ReturnType<typeof fetchProducts>, boolean] = $derived.by(() => {
        const category_id = selectedCategory !== 'all' ? Number(selectedCategory) : undefined;
        const manufacturer_id = selectedManufacturer !== 'all' ? Number(selectedManufacturer) : undefined;
        const sort_by = sortBy;
        return [paginateProductApi({
            category_id,
            manufacturer_id,
            min_price: de_minPrice,
            max_price: de_maxPrice,
            name: de_name,
            sort_by,
        }), true];
    });

    $effect(() => {
        loading = true;
        paginatedProductApi?.first().map((p) => {
            paginatedProducts = p.data
        })
        .orTee((err) => {
            error = err.message ?? 'An error occurred';
        }).then(() => {
            loading = false;
        });
    });

    function handlePageChange(page: 'first' | 'prev' | 'next' | 'last') {
        loading = true;
        newPagination = false;
        paginatedProductApi?.[page]().map((p) => {
            if (page === 'prev' && p.data.length === 0) {
                loading = false;
                return;
            }
            paginatedProducts = p.data
            loading = false;
        })
        .orTee((err) => {
            error = err.message ?? 'An error occurred';
        });
    }

    function debounce(wait: number = 300) {
        let timeout: number;
        return (func: () => void) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func();
            }, wait);
        };
    }
</script>

<svelte:window onmousedown={(e) => handleClickOutside(e)}></svelte:window>

<div class="layout">
    <main class="content">
        <div class="banner">
            If you want more granular filters the try out <a href="/configurator">Configurator</a>
        </div>
        <div class="search-header">
            <div class="search-container">
                <input 
                    type="text"
                    name="search product"
                    bind:value={searchQuery}
                    placeholder="Search products..."
                    class="search-input"
                />
            </div>
        </div>

        <!-- Inline Filters -->
        <div class="inline-filters">
            <SearchableSelect
                label="Category"
                options={data.categories}
                bind:value={selectedCategory}
                allLabel="All Categories"
            />

            <SearchableSelect
                label="Manufacturer"
                options={data.manufacturers}
                bind:value={selectedManufacturer}
                allLabel="All Manufacturers"
            />

            <button class="filter-chip">
                <span>Price Range</span>
                <div class="chip-inputs">
                    <input 
                        type="number"
                        name="min price"
                        bind:value={priceRange.min}
                        placeholder="Min"
                        class="chip-input"
                    />
                    <span class="separator">-</span>
                    <input 
                        type="number" 
                        name="max price"
                        bind:value={priceRange.max}
                        placeholder="Max"
                        class="chip-input"
                    />
                </div>
            </button>

            <button class="filter-chip" class:active={sortBy !== '+price'}>
                <span>Sort by</span>
                <select bind:value={sortBy} class="chip-select">
                    <option value="+price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="+name">Name: A to Z</option>
                    <option value="-name">Name: Z to A</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
        </div>
        <!-- End Inline Filters -->

        {#if loading}
            <Loader headerText="Loading products..." />
        {:else if error}
            <p class="error">{error}</p>
        {:else if newPagination && paginatedProducts.length === 0}
            <NoResult
                message="No products found for the selected filters."
                suggestion="Try adjusting your filters or searching for different products." 
            />
        {:else}
            <Pagination 
                hasNext={paginatedProductApi?.hasNext()}
                hasPrev={paginatedProductApi?.hasPrev()}
                handlePageChange={handlePageChange}
            />
            <div class="products-grid">
                {#each paginatedProducts as product (product.id)}
                    <a href="/products/{product.id}" class="product-card">
                        <div class="product-header">
                            <h3 class="product-name">{product.name}</h3>
                            <div class="product-price">
                                {#if product.lowest_available_price}
                                    <span class="current-price">{formatPrice(product.lowest_available_price)}</span>
                                {:else}
                                    <span class="unavailable">Not Available</span>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="product-meta">
                            <div class="meta-tags">
                                {#if data.categoryMap.has(product.category_id)}
                                    <span class="category-tag">
                                        {data.categoryMap.get(product.category_id)?.name}
                                    </span>
                                {/if}
                                {#if data.manufacturerMap.has(product.manufacturer_id)}
                                    <span class="brand-tag">
                                        {data.manufacturerMap.get(product.manufacturer_id)?.name}
                                    </span>
                                {/if}
                            </div>
                            
                            <div class="product-actions">
                                <div class="price-info">
                                    {#if product.prices && product.prices.length > 1}
                                        <span class="price-count">{product.prices.length} stores</span>
                                    {:else if product.prices && product.prices.length === 1}
                                        <span class="price-count">1 store</span>
                                    {/if}
                                </div>
                                
                                <div class="view-details">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m9 18 6-6-6-6"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        {/if}
    </main>
</div>

<style>
    .layout {
        display: flex;
        gap: 2rem;
        position: relative;
        min-height: calc(100vh - 4rem);
    }

    .content {
        flex: 1;
        padding: 1rem 0;
        overflow-x: hidden;
    }

    .search-header {
        background-color: var(--color-bg-primary);
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
        border-radius: 6px;
    }

    .search-container {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin: 0 auto;
        width: 100%;
    }

    .search-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.15s ease;
    }

    .search-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 1px #2563eb;
    }

    .results-header {
        margin: 1rem 0;
        color: #6b7280;
    }

    .error {
        color: #ef4444;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 4px;
    }

    .pagination {
        margin: 1rem 0;
        display: flex;
        gap: 1rem;
        align-items: center;
        justify-content: center;
    }

    button {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background-color: var(--color-bg-primary);
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button:not(:disabled):hover {
        background-color: var(--color-bg-primary);
    }

    .inline-filters {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
        flex-wrap: wrap;
        align-items: center;
    }

    .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: var(--color-bg-primary);
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #374151;
        cursor: pointer;
        transition: all 0.15s ease;
        flex: 1 1 auto;
        min-width: calc(50% - 0.25rem); /* account for gap */
    }

    @media (min-width: 640px) {
        .filter-chip {
            flex: 0 1 auto;
            min-width: auto;
        }
    }

    .filter-chip:hover {
        border-color: #2563eb;
        color: #2563eb;
    }

    .filter-chip.active {
        background: #eef2ff;
        border-color: #6366f1;
        color: #4f46e5;
    }

    .filter-chip span {
        font-weight: 500;
    }

    .chip-select {
        appearance: none;
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
        color: inherit;
        cursor: pointer;
        flex: 1;
        min-width: 0; /* Allow shrinking below content size */
        width: 100%;
    }

    .chip-select:focus {
        outline: none;
    }

    .chip-inputs {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .chip-input {
        width: auto;
        border: none;
        background: transparent;
        padding: 0;
        font-size: 1rem;
        color: inherit;
        max-width: 10rem;
    }

    .chip-input:focus {
        outline: none;
    }

    .chip-input::placeholder {
        color: #9ca3af;
    }

    .separator {
        color: #9ca3af;
    }

    .table-container {
        overflow-x: auto;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .table-container table {
        width: 100%;
        border-collapse: collapse;
        background-color: white;
    }

    .table-container th {
        background-color: #f8f9fa;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .table-container th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .table-container tr:hover {
        background-color: #f8f9fa;
    }

    .banner {
        background: rgba(255, 251, 204, 0.6);
        color: #92400e;
        padding: 0.5rem 1rem;
        margin: -1rem auto 0.5rem auto;
        text-align: center;
        font-size: 0.8125rem;
        font-weight: 400;
        border-radius: 6px;
        border: 1px solid rgba(245, 158, 11, 0.2);
        max-width: fit-content;
        box-shadow: none;
    }

    .banner a {
        color: #92400e;
        text-decoration: underline;
        text-decoration-color: rgba(146, 64, 14, 0.5);
        text-underline-offset: 2px;
        font-weight: 500;
    }

    .banner a:hover {
        text-decoration-color: #92400e;
        color: #78350f;
    }

    /* Product Grid Styles */
    .products-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .product-card {
        background: var(--color-bg-primary);
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        text-decoration: none;
        color: inherit;
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 2rem;
        position: relative;
        overflow: hidden;
    }

    .product-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.3s ease;
    }

    .product-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.15);
        border-color: #2563eb;
    }

    .product-card:hover::before {
        transform: scaleX(1);
    }

    .product-header {
        flex: 1;
        min-width: 0; /* Allow content to shrink */
    }

    .product-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .product-price {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .current-price {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2563eb;
        line-height: 1;
    }

    .price-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
        letter-spacing: 0.05em;
    }

    .unavailable {
        font-size: 1rem;
        font-weight: 600;
        color: #ef4444;
        background: #fee2e2;
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        display: inline-block;
        font-size: 0.875rem;
    }

    .product-meta {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: flex-end;
        text-align: right;
        min-width: 200px;
    }

    .meta-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: flex-end;
    }

    .category-tag,
    .brand-tag {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 500;
        letter-spacing: 0.025em;
        white-space: nowrap;
    }

    .category-tag {
        background: var(--color-bg-primary);
        color: #4b5563;
    }

    .brand-tag {
        background: var(--color-bg-secondary);
        color: #4338ca;
    }

    .product-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 1rem;
    }

    .price-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .price-count {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
        white-space: nowrap;
    }

    .view-details {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: var(--color-bg-primary);
        border-radius: 50%;
        color: #6b7280;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }

    .product-card:hover .view-details {
        background: #2563eb;
        color: white;
        transform: translateX(4px);
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .product-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
        }

        .product-header {
            width: 100%;
        }

        .product-meta {
            width: 100%;
            align-items: flex-start;
            text-align: left;
            min-width: auto;
        }

        .meta-tags {
            justify-content: flex-start;
        }

        .product-actions {
            width: 100%;
            justify-content: space-between;
        }

        .product-name {
            font-size: 1rem;
        }

        .current-price {
            font-size: 1.25rem;
        }

        .category-tag,
        .brand-tag {
            font-size: 0.7rem;
        }
    }

    @media (max-width: 640px) {
        .products-grid {
            gap: 0.75rem;
        }

        .product-card {
            padding: 1rem;
        }

        .view-details {
            width: 32px;
            height: 32px;
        }
    }

    /* Loading and empty states */
    .products-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        color: #6b7280;
    }
</style>

<svelte:head>
    {@html
        generateSEOConfig({
            title: 'Search, sort and view all products and prices',
            description:
                'Browse thousands of products and compare prices from top Bangladeshi retailers. Find the best deals on electronics, gadgets, and more.',
            canonical: 'https://daam.deals/products',
        })
    }
</svelte:head>
