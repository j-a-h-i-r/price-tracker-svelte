<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchCategories, fetchProducts, type Category } from "$lib/api/products";
    import { fetchMetadataFilters, type MetadataFilter } from "$lib/api/metadata";
    import type { ProductWithLastPrice } from "$lib/types/Product";
    import Table from "$lib/components/Table.svelte";
    import { fetchWebsites, type Website } from "$lib/api/websites.js";
    import SearchableSelect from "$lib/components/SearchableSelect.svelte";
    import { formatPrice } from "$lib/util.js";
    import type { Manufacturer } from "$lib/types/Manufacturer.js";

    let initialProductsLoaded = $state(false);
    let products: ProductWithLastPrice[] = $state([]);
    let websitesMap: Record<number, Website> = $state({});
    let loading = $state(true);
    let error: string | null = $state(null);
    let isFilterModalOpen = $state(false);
    let modalNode: HTMLDivElement | null = null;

    // Filters
    let categories: Category[] = $state([]);
    let selectedCategory: string | number = $state("all");
    let manufacturers: Manufacturer[] = $state([]);
    let selectedManufacturer: string | number = $state("all");
    let priceRange = $state({ min: 0, max: 2000 });
    let actualPriceRange = $state({ min: 0, max: 0 });
    let showOutOfStock = $state(false);
    let sortBy = $state("price-asc");
    let searchQuery = $state("");

    // Pagination
    let currentPage = $state(1);
    let itemsPerPage = $state(10);

    let filteredProducts: ProductWithLastPrice[] = $derived.by(() => {
        return products
            .filter(p => {
                // Category filter
                if (selectedCategory !== "all" && p.category_id != selectedCategory) return false;
                
                // Manufacturer filter
                if (selectedManufacturer !== "all" && p.manufacturer_id != selectedManufacturer) return false;

                // Price range filter
                const productPrice = Math.min(...p.prices.map(price => price.price));
                if (productPrice < priceRange.min || productPrice > priceRange.max) return false;
                
                // Stock filter
                if (!showOutOfStock) {
                    if (p.prices.length === 0) return false;
                    if (p.prices.every(price => price.is_available === false)) return false;
                }

                // Search query
                if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                
                return true;
            })
            .sort((a, b) => {
                const priceA = Math.min(...a.prices.filter(p => p.price !== null).map(p => p.price));
                const priceB = Math.min(...b.prices.filter(p => p.price !== null).map(p => p.price));
                
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

    $effect(() => {
        // Reset filters when products are loaded
        if (initialProductsLoaded) {
            fetchProducts().then((p) => products = p);
        }
    });

    $effect(() => {
        // Recalculate price range based on products
        const prices = products
            .flatMap(p => p.prices.map(price => price.price))
            .filter(price => !isNaN(price));
        actualPriceRange.min = Math.min(...prices);
        actualPriceRange.max = Math.max(...prices);
        priceRange = { ...actualPriceRange };
    });

    onMount(async () => {
        try {
            // Initially fetch 100 products
            products = await fetchProducts(100);
            initialProductsLoaded = true;
            
            // Fetch categories and manufacturers
            const [categoriesData, manufacturersData] = await Promise.all([
                fetchCategories(),
                fetch('/api/manufacturers').then(res => res.json())
            ]);
            
            categories = categoriesData;
            manufacturers = manufacturersData;
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
        // metadataFilters.forEach(filter => {
        //     if (filter.type === 'boolean') {
        //         selectedMetadataFilters[filter.key] = false;
        //     } else if (filter.type === 'range' && filter.range) {
        //         selectedMetadataFilters[filter.key] = { ...filter.range };
        //     } else {
        //         selectedMetadataFilters[filter.key] = '';
        //     }
        // });
    }
</script>

<div class="layout">
    <main class="content">
        <div class="search-header">
            <div class="search-container">
                <input 
                    type="text" 
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
                options={categories}
                bind:value={selectedCategory}
                allLabel="All Categories"
            />

            <SearchableSelect
                label="Manufacturer"
                options={manufacturers}
                bind:value={selectedManufacturer}
                allLabel="All Manufacturers"
            />

            <button class="filter-chip" class:active={priceRange.min !== actualPriceRange.min || priceRange.max !== actualPriceRange.max}>
                <span>Price Range</span>
                <div class="chip-inputs">
                    <input 
                        type="number" 
                        bind:value={priceRange.min}
                        min={actualPriceRange.min}
                        max={actualPriceRange.max}
                        placeholder="Min"
                        class="chip-input"
                    />
                    <span class="separator">-</span>
                    <input 
                        type="number" 
                        bind:value={priceRange.max}
                        min={actualPriceRange.min}
                        max={actualPriceRange.max}
                        placeholder="Max"
                        class="chip-input"
                    />
                </div>
            </button>

            <button class="filter-chip" class:active={!showOutOfStock}>
                <span>Stock</span>
                <select bind:value={showOutOfStock} class="chip-select">
                    <option value={true}>All</option>
                    <option value={false}>In Stock Only</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            <button class="filter-chip" class:active={sortBy !== "price-asc"}>
                <span>Sort by</span>
                <select bind:value={sortBy} class="chip-select">
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
        </div>
        <!-- End Inline Filters -->

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
                    price: p?.lowest_available_price ? formatPrice(p.lowest_available_price) : 'N/A',
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
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #374151;
        font-size: 0.875rem;
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
        font-size: 0.875rem;
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
        font-size: 0.875rem;
        color: inherit;
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
</style>
