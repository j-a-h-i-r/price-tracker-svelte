<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchCategories, fetchProducts, type Category } from "$lib/api/products";
    import { fetchMetadataFilters, type MetadataFilter } from "$lib/api/metadata";
    import type { ProductWithLastPrice } from "$lib/types/Product";
    import Table from "$lib/components/Table.svelte";
    import { fetchWebsites, type Website } from "$lib/api/websites.js";

    let products: ProductWithLastPrice[] = $state([]);
    let websitesMap: Record<number, Website> = $state({});
    let loading = $state(true);
    let error: string | null = $state(null);
    let isFilterModalOpen = $state(false);
    let modalNode: HTMLDivElement;

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
                        const numValue = typeof metadata === 'string' ? parseFloat(metadata) : Number(metadata);
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

    function handleClickOutside(event: MouseEvent) {
        if (modalNode && !modalNode.contains(event.target as Node)) {
            isFilterModalOpen = false;
        }
    }

    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    });

    $effect(() => {
        // Prevent body scroll when modal is open
        if (isFilterModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    });

    onMount(async () => {
        let websites = await fetchWebsites();
        websitesMap = websites.reduce((acc, website) => {
            acc[website.id] = website;
            return acc;
        }, {} as Record<number, Website>);
    });

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
    <div class="filter-modal" class:open={isFilterModalOpen}>
        <div class="modal-content" bind:this={modalNode}>
            <div class="modal-header">
                <h2>Filters</h2>
                <button 
                    class="close-btn" 
                    onclick={() => isFilterModalOpen = false}
                >
                    ×
                </button>
            </div>

            <div class="filters-content">
                <div class="filter-section">
                    <div class="filter-row">
                        <span class="filter-label">Category</span>
                        <select bind:value={selectedCategory} class="filter-select">
                            <option value="all">All Categories</option>
                            {#each categories as category}
                                <option value={category?.id}>{category?.name}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-row">
                        <span class="filter-label">Price Range</span>
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
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-row">
                        <span class="filter-label">Show Out of Stock</span>
                        <input type="checkbox" bind:checked={showOutOfStock}>
                    </div>
                </div>

                <!-- {#if metadataFilters.length > 0}
                    <div class="metadata-filters">
                        <h3>Specifications</h3>
                        {#each metadataFilters as filter}
                            <div class="filter-section">
                                <div class="filter-row">
                                    <span class="filter-label">{`${filter.displayName} ${filter.unit ? `(${filter.unit})` : ''}`}</span>
                                    {#if filter.type === 'boolean'}
                                        <input 
                                            type="checkbox" 
                                            bind:checked={selectedMetadataFilters[filter.key]}
                                        >
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
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if} -->

                <div class="filter-section">
                    <div class="filter-row">
                        <span class="filter-label">Sort By</span>
                        <select bind:value={sortBy} class="filter-select">
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="name-asc">Name: A to Z</option>
                            <option value="name-desc">Name: Z to A</option>
                        </select>
                    </div>
                </div>

                <button class="reset-btn" onclick={resetFilters}>
                    Reset Filters
                </button>
            </div>
        </div>
    </div>

    <main class="content">
        <div class="search-header">
            <div class="search-container">
                <input 
                    type="text" 
                    bind:value={searchQuery}
                    placeholder="Search products..."
                    class="search-input"
                />
                <button 
                    class="filter-button" 
                    onclick={() => isFilterModalOpen = !isFilterModalOpen}
                    aria-label="Toggle filters"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                </button>
            </div>
        </div>

        {#if loading}
            <p>Loading products...</p>
        {:else if error}
            <p class="error">{error}</p>
        {:else}
            <div class="results-header">
                <p>Showing {paginatedProducts.length} of {filteredProducts.length} products</p>
            </div>

            <Table 
                headers={["Name", "Lowest Price"]}
                keys={["name", "price"]}
                rows={paginatedProducts.map(p => ({
                    ...p,
                    expandedContent: p.prices.map(price => ({
                        website: websitesMap[price.website_id]?.name || "Unknown",
                        price: price.price,
                        date: new Date(price.created_at).toLocaleDateString()
                    })),
                    price: `৳ ${p?.lowest_available_price?.price ?? 'N/A'}`,
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

    .filter-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .filter-modal.open {
        display: flex;
    }

    .modal-content {
        background: white;
        width: 90%;
        max-width: 500px;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
    }

    .filters-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
        max-height: 70vh;
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

    .filter-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .filter-label {
        font-weight: 500;
        flex: 0 0 auto;
        min-width: 120px;
    }

    .filter-input, .filter-select {
        flex: 1;
        min-width: 0;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
    }

    .range-inputs {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex: 1;
    }

    .range-inputs input {
        width: 100px;
        min-width: 0;
    }

    .range-inputs span {
        flex: 0 0 auto;
        color: #6b7280;
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

    .search-header {
        background-color: white;
        padding: 1rem;
        margin: -1rem -1rem 1rem -1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .search-container {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        max-width: 800px;
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

    .filter-button {
        padding: 0.75rem;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #4b5563;
        transition: all 0.15s ease;
    }

    .filter-button:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
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

    .metadata-filters h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 1rem;
    }

    .metadata-filters .filter-section {
        margin-bottom: 1rem;
    }

    .metadata-filters .range-inputs {
        margin-top: 0.5rem;
    }
</style>
