<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchCategories, fetchProducts, type Category } from "$lib/api/products";
    import { fetchMetadataFilters, type MetadataFilter } from "$lib/api/metadata";
    import type { ProductWithLastPrice } from "$lib/types/Product";
    import Table from "$lib/components/Table.svelte";

    let products: ProductWithLastPrice[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let isSidebarOpen = $state(true);

    // Filters
    let categories: Category[] = $state([]);
    let selectedCategory: string | number = $state("all");
    let priceRange = $state({ min: 0, max: 2000 });
    let actualPriceRange = $state({ min: 0, max: 0 });
    let showOutOfStock = $state(true);
    let sortBy = $state("price-asc");
    let searchQuery = $state("");

    // Metadata filters
    let metadataFilters: MetadataFilter[] = $state([]);
    let selectedMetadataFilters: Record<string, any> = $state({});

    // Pagination
    let currentPage = $state(1);
    let itemsPerPage = $state(10);

    let filteredProducts: ProductWithLastPrice[] = $derived.by(() => {
        return products
            .filter(p => {
                // Category filter
                if (selectedCategory !== "all" && p.category_id != selectedCategory) return false;
                
                // Price range filter
                const productPrice = Math.min(...p.prices.map(price => price.price));
                if (productPrice < priceRange.min || productPrice > priceRange.max) return false;
                
                // Stock filter
                if (!showOutOfStock && p.prices.length === 0) return false;

                // Search query
                if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                
                // Metadata filters
                for (const filter of metadataFilters) {
                    const value = selectedMetadataFilters[filter.key];
                    const metadata = p.parsed_metadata[filter.key];
                    
                    // if (value === undefined || value === '' || metadata === undefined) continue;
                    console.log({metadata: metadata, filterKey: filter.key, filterValue: value})
                    
                    if (filter.type === 'boolean') {
                        if (value && metadata !== true) return false;
                    } else if (filter.type === 'range') {
                        const numValue = parseFloat(metadata);
                        if (isNaN(numValue)) continue;
                        if (numValue < value.min || numValue > value.max) return false;
                    } else if (filter.type === 'string') {
                        if (value && metadata !== value) return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => {
                const priceA = Math.min(...a.prices.map(p => p.price));
                const priceB = Math.min(...b.prices.map(p => p.price));
                
                switch (sortBy) {
                    case "price-asc":
                        return priceA - priceB;
                    case "price-desc":
                        return priceB - priceA;
                    case "name-asc":
                        return a.name.localeCompare(b.name);
                    case "name-desc":
                        return b.name.localeCompare(a.name);
                    default:
                        return 0;
                }
            });
    });

    let totalPages = $derived(Math.ceil(filteredProducts.length / itemsPerPage));
    let paginatedProducts = $derived.by(() => {
        return filteredProducts.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage,
        );
    });

    const handleRowClick = (row: ProductWithLastPrice) => {
        goto(`/products/${row.id}`);
    };

    onMount(async () => {
        try {
            products = await fetchProducts();
            categories = await fetchCategories();
            metadataFilters = await fetchMetadataFilters();
            
            // Initialize metadata filter values
            metadataFilters.forEach(filter => {
                if (filter.type === 'boolean') {
                    selectedMetadataFilters[filter.key] = false;
                } else if (filter.type === 'range') {
                    selectedMetadataFilters[filter.key] = { ...filter.range };
                } else {
                    selectedMetadataFilters[filter.key] = '';
                }
            });
            
            // Set actual price range based on products
            const prices = products.flatMap(p => p.prices.map(price => price.price));
            actualPriceRange.min = Math.min(...prices);
            actualPriceRange.max = Math.max(...prices);
            priceRange = { ...actualPriceRange };
            
        } catch (e) {
            console.error("Error fetching data:", e);
            error = e instanceof Error ? e.message : "An error occurred";
        } finally {
            loading = false;
        }
    });

    function resetFilters() {
        selectedCategory = "all";
        priceRange = { ...actualPriceRange };
        showOutOfStock = true;
        sortBy = "price-asc";
        searchQuery = "";
        currentPage = 1;

        // Reset metadata filters
        metadataFilters.forEach(filter => {
            if (filter.type === 'boolean') {
                selectedMetadataFilters[filter.key] = false;
            } else if (filter.type === 'range' && filter.range) {
                selectedMetadataFilters[filter.key] = { ...filter.range };
            } else {
                selectedMetadataFilters[filter.key] = '';
            }
        });
    }
</script>

<div class="layout">
    <aside class="filters-sidebar" class:closed={!isSidebarOpen}>
        <div class="sidebar-header">
            <h2>Filters</h2>
            <button 
                class="toggle-btn" 
                onclick={() => isSidebarOpen = !isSidebarOpen}
            >
                {isSidebarOpen ? '←' : '→'}
            </button>
        </div>

        <div class="filters-content">
            <div class="filter-section">
                <label>
                    Search
                    <input 
                        type="text" 
                        bind:value={searchQuery}
                        placeholder="Search products..."
                        class="filter-input"
                    />
                </label>
            </div>

            <div class="filter-section">
                <label>
                    Category
                    <select bind:value={selectedCategory} class="filter-select">
                        <option value="all">All Categories</option>
                        {#each categories as category}
                            <option value={category?.id}>{category?.name}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <div class="filter-section">
                <label>
                    Price Range
                    <div class="range-inputs">
                        <input 
                            type="number" 
                            bind:value={priceRange.min}
                            min={actualPriceRange.min}
                            max={actualPriceRange.max}
                            class="filter-input"
                        />
                        <span>to</span>
                        <input 
                            type="number" 
                            bind:value={priceRange.max}
                            min={actualPriceRange.min}
                            max={actualPriceRange.max}
                            class="filter-input"
                        />
                    </div>
                    <input 
                        type="range" 
                        bind:value={priceRange.min}
                        min={actualPriceRange.min}
                        max={actualPriceRange.max}
                        class="range-slider"
                    />
                    <input 
                        type="range" 
                        bind:value={priceRange.max}
                        min={actualPriceRange.min}
                        max={actualPriceRange.max}
                        class="range-slider"
                    />
                </label>
            </div>

            <div class="filter-section">
                <label class="checkbox-label">
                    <input type="checkbox" bind:checked={showOutOfStock}>
                    Show Out of Stock
                </label>
            </div>

            {#if metadataFilters.length > 0}
                <div class="metadata-filters">
                    <h3>Specifications</h3>
                    {#each metadataFilters as filter}
                        <div class="filter-section">
                            <label>
                                {`${filter.displayName} (${filter.unit})`}
                                {#if filter.type === 'boolean'}
                                    <label class="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            bind:checked={selectedMetadataFilters[filter.key]}
                                        >
                                        Required
                                    </label>
                                {:else if filter.type === 'range' && filter.range}
                                    <div class="range-inputs">
                                        <input 
                                            type="number" 
                                            bind:value={selectedMetadataFilters[filter.key].min}
                                            min={filter.range.min}
                                            max={filter.range.max}
                                            class="filter-input"
                                        />
                                        <span>to</span>
                                        <input 
                                            type="number" 
                                            bind:value={selectedMetadataFilters[filter.key].max}
                                            min={filter.range.min}
                                            max={filter.range.max}
                                            class="filter-input"
                                        />
                                    </div>
                                {:else if filter.type === 'string' && filter.values}
                                    <select 
                                        bind:value={selectedMetadataFilters[filter.key]}
                                        class="filter-select"
                                    >
                                        <option value="">Any</option>
                                        {#each filter.values as value}
                                            <option value={value}>{value}</option>
                                        {/each}
                                    </select>
                                {/if}
                            </label>
                        </div>
                    {/each}
                </div>
            {/if}

            <div class="filter-section">
                <label>
                    Sort By
                    <select bind:value={sortBy} class="filter-select">
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="name-asc">Name: A to Z</option>
                        <option value="name-desc">Name: Z to A</option>
                    </select>
                </label>
            </div>

            <button class="reset-btn" onclick={resetFilters}>
                Reset Filters
            </button>
        </div>
    </aside>

    <main class="content">
        <h1>Products</h1>

        {#if loading}
            <p>Loading products...</p>
        {:else if error}
            <p class="error">{error}</p>
        {:else}
            <div class="results-header">
                <p>Showing {paginatedProducts.length} of {filteredProducts.length} products</p>
            </div>

            <Table 
                headers={["Name", "Last Price"]}
                keys={["name", "price"]}
                rows={paginatedProducts.map(p => ({
                    ...p,
                    price: p.prices.map(p => `${p.price}`).join(", "),
                }))}
                on:rowClick={e => handleRowClick(e.detail)}
            />

            <div class="pagination">
                <button 
                    disabled={currentPage === 1} 
                    onclick={() => currentPage--}
                >
                    Previous
                </button>

                <span>Page {currentPage} of {totalPages}</span>

                <button 
                    disabled={currentPage === totalPages} 
                    onclick={() => currentPage++}
                >
                    Next
                </button>
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

    .filters-sidebar {
        width: 300px;
        background: white;
        border-right: 1px solid #e5e7eb;
        padding: 1.5rem;
        height: calc(100vh - 4rem);
        position: sticky;
        top: 0;
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
    }

    .filters-sidebar.closed {
        transform: translateX(-100%);
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .toggle-btn {
        padding: 0.5rem;
        border: none;
        background: #f3f4f6;
        border-radius: 4px;
        cursor: pointer;
    }

    .toggle-btn:hover {
        background: #e5e7eb;
    }

    .filters-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        flex: 1;
        padding-right: 0.5rem; /* Add some padding for the scrollbar */
    }

    .filters-content::-webkit-scrollbar {
        width: 6px;
    }

    .filters-content::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    .filters-content::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 3px;
    }

    .filters-content::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .filter-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .filter-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
    }

    .filter-select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
    }

    .range-inputs {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .range-inputs input {
        width: 100px;
    }

    .range-slider {
        width: 100%;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .reset-btn {
        padding: 0.75rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }

    .reset-btn:hover {
        background: #dc2626;
    }

    .content {
        flex: 1;
        padding: 1rem;
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
        background-color: white;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button:not(:disabled):hover {
        background-color: #f8f9fa;
    }

    h1 {
        margin: 0 0 1.5rem 0;
    }

    .metadata-filters {
        border-top: 1px solid #e5e7eb;
        padding-top: 1rem;
        margin-top: 0.5rem;
    }

    .metadata-filters h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 1rem;
    }

    .metadata-filters .filter-section {
        margin-bottom: 1rem;
    }

    .metadata-filters .filter-section label {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .metadata-filters .range-inputs {
        margin-top: 0.5rem;
    }

    @media (max-width: 768px) {
        .filters-sidebar {
            position: fixed;
            z-index: 50;
            background: white;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
        }
    }
</style>
