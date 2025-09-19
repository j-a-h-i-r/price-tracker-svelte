<script lang="ts">
    import { fetchStats } from '$lib/api/stats.js';
    import { fetchDeals } from '$lib/api/deals.js';
    import type { Deal } from '$lib/types/Deal.js';
    import { onMount } from 'svelte';
    import { onDestroy } from 'svelte';
    import { arrayToPerIdMap, formatPrice } from '$lib/util.js';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import DealCard from '$lib/components/DealCard.svelte';
    import type { Product } from '$lib/types/Product.js';
    import { getManufacturers } from '$lib/api/manufacturers.js';
    import type { Manufacturer } from '$lib/types/Manufacturer.js';
    import { getCategories } from '$lib/api/categories.js';
    import { fetchProductsByName, type Category } from '$lib/api/products.js';
    import { generateOrganizationStructuredData, generateSEOConfig, generateWebsiteStructuredData } from '$lib/seo.js';
    
    let searchQuery = $state<string>('');
    let totalProducts = $state<number | undefined>(undefined);
    let totalWebsites = $state<number | undefined>(undefined);
    let totalCategories = $state<number | undefined>(undefined);
    let searchResults: Product[] = $state([]);
    let searchTimeout: ReturnType<typeof setTimeout>;
    let searchAbortController: AbortController | null = null;
    let categoryMap: Map<number, Category> = $state(new Map([]));
    let manufacturerMap: { [key: string]: string } = {};
    let isLoading = $state(false);
    let dealCountToShow = $state<number | undefined>(undefined);
    let deals: Deal[] = $state([]);
    let dealsLoading = $state(true);
    let dealsContainer = $state<HTMLElement | undefined>();
    let autoScrollInterval: ReturnType<typeof setInterval>;
    let isHovering = false;

    onMount(async () => {
        const resp = await fetchStats()
        if (resp.isOk()) {
            totalProducts = resp.value.products ?? 0;
            totalWebsites = resp.value.websites ?? 0;
            totalCategories = resp.value.categories ?? 0;
        }
    });

    onMount(async () => {
        let categories = await getCategories().unwrapOr([]);
        categoryMap = arrayToPerIdMap(categories);
    });

    onMount(async () => {
        const manufacturers = await getManufacturers().unwrapOr([]);
        manufacturers.forEach((manufacturer: Manufacturer) => {
            manufacturerMap[manufacturer.id] = manufacturer.name;
        });
    });

    onMount(async () => {
        dealsLoading = true;
        const dealResponse = await fetchDeals();
        if (dealResponse.isOk()) {
            deals = dealResponse.value;
            dealCountToShow = Math.floor(deals.length / 10) * 10;
            deals = deals.slice(0, 10); // Limit to first 10 deals
            startAutoScroll();
        }
        dealsLoading = false;
    });

    onMount(() => {
        return () => {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
            }
        };
    });

    function startAutoScroll() {
        autoScrollInterval = setInterval(() => {
            if (!dealsContainer || isHovering) return;

            const firstCard = dealsContainer.querySelector('a');
            if (!firstCard) return;

            const cardWidth = (firstCard as HTMLElement).offsetWidth + 16; // Width + gap
            const newScrollLeft = dealsContainer.scrollLeft + cardWidth;

            if (
                newScrollLeft >=
                dealsContainer.scrollWidth - dealsContainer.offsetWidth
            ) {
                // Reset to start when reaching the end
                dealsContainer.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                dealsContainer.scrollTo({
                    left: newScrollLeft,
                    behavior: 'smooth',
                });
            }
        }, 3000); // Scroll every 3 seconds
    }

    function handleMouseEnter() {
        isHovering = true;
    }

    function handleMouseLeave() {
        isHovering = false;
    }

    async function handleSearch() {
        // Cancel any previous in-flight request
        if (searchAbortController) {
            searchAbortController.abort();
        }

        // Create new AbortController for this request
        searchAbortController = new AbortController();
        isLoading = true;
        
        const resp = await fetchProductsByName(searchQuery, searchAbortController.signal);
        if (resp.isOk()) {
            if (!searchAbortController.signal.aborted) {
                searchResults = resp.value;
            }
        }

        if (searchAbortController && !searchAbortController.signal.aborted) {
            isLoading = false;
        }
    }

    function debouncedSearch() {
        // Cancel previous timeout
        clearTimeout(searchTimeout);
        
        // Cancel any in-flight request when starting a new debounced search
        if (searchAbortController) {
            searchAbortController.abort();
            searchAbortController = null;
        }
        
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 300);
    }

    $effect(() => {
        if (searchQuery !== undefined && searchQuery !== '') {
            debouncedSearch();
        } else {
            // Clear search results and cancel any pending requests when search is cleared
            clearTimeout(searchTimeout);
            if (searchAbortController) {
                searchAbortController.abort();
                searchAbortController = null;
            }
            searchResults = [];
            isLoading = false;
        }
    });

    onDestroy(() => {
        // Clean up any pending requests and timeouts when component is destroyed
        clearTimeout(searchTimeout);
        if (searchAbortController) {
            searchAbortController.abort();
        }
        clearInterval(autoScrollInterval);
    });
</script>

<div class="stats-header">
    <h1>
        Tracking prices of
        <span class="highlight-link">
            {#if totalProducts === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/products">{totalProducts}</a>
            {/if}
        </span>
        products from
        <span class="highlight-link">
            {#if totalCategories === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/categories">{totalCategories}</a>
            {/if}
        </span>
        categories across
        <span class="highlight-link">
            {#if totalWebsites === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/websites">{totalWebsites}</a>
            {/if}
        </span> websites 🇧🇩
    </h1>
</div>

<div class="deals-section">
    <div class="deals-header">
        <h2>
            Weekly Deals {dealCountToShow !== undefined
                ? `(${dealCountToShow}+ deals)`
                : ''}
        </h2>
        <a href="/deals" class="view-all">View all →</a>
    </div>
    {#if dealsLoading}
        <div class="deals-loading">
            <LoadingSpinner size="md" />
            <p>Loading the best deals of this week...</p>
        </div>
    {:else if deals.length > 0}
        <div
            class="deals-scroll"
            bind:this={dealsContainer}
            onmouseenter={handleMouseEnter}
            onmouseleave={handleMouseLeave}
            aria-details="Deals carousel"
            role="region"
            aria-label="Deals carousel"
        >
            {#each deals as deal (deal.external_product_id)}
                <DealCard {deal} />
            {/each}
        </div>
    {:else}
        <div class="no-deals-home">
            <div class="no-deals-icon">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                </svg>
            </div>
            <p>No deals available right now</p>
            <span>Check back later for new deals</span>
        </div>
    {/if}
</div>

<div class="search-container">
    <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search for products or paste the URL..."
    />
    {#if isLoading}
        <div class="loading-container">
            <LoadingSpinner size="sm" inline={true} />
        </div>
    {/if}
</div>

{#if searchResults.length > 0}
    <div class="search-results-section">
        <div class="search-results-header">
            <h2>Found {searchResults.length} matching product{searchResults.length === 1 ? '' : 's'}</h2>
        </div>
        <div class="search-results">
            {#each searchResults as product (product.id)}
                <a href="/products/{product.id}" class="search-result-row">
                    <div class="result-content">
                        <div class="first-line">
                            <h3 class="product-name">{product.name}</h3>
                            <span class="current-price">
                                {product.lowest_available_price
                                    ? formatPrice(product.lowest_available_price)
                                    : 'Not Available'}
                            </span>
                        </div>
                        <div class="second-line">
                            <span class="category">{categoryMap.get(product.category_id)?.name || 'Unknown Category'}</span>
                            <span class="brand">{manufacturerMap[product.manufacturer_id] || 'Unknown Brand'}</span>
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    </div>
{:else if searchQuery}
    <p class="no-results">No products found</p>
{/if}

<svelte:head>
    {@html generateSEOConfig({
        title: 'Check the best prices and deals on StarTech, Techland, Pickaboo and more Bangladeshi products',
        description: 'daam.deals is the best price comparison website in Bangladesh. Check the best deals and lowest prices from top retailers like Startech, Techland, and Pickaboo. Track product prices and find the best deals.',
    })}
    
    <!-- Structured Data -->
    {@html `
    <script type="application/ld+json">
        ${JSON.stringify(generateWebsiteStructuredData(), null, 2)}
    </script>
    `
    }
    
    {@html `
    <script type="application/ld+json">
        ${JSON.stringify(generateOrganizationStructuredData(), null, 2)}
    </script>
    `
    }
</svelte:head>

<style>
    .stats-header {
        text-align: center;
        margin: 1rem 0;
        padding: 0rem 1rem;
    }

    .stats-header h1 {
        font-size: 1.75rem;
        color: #1f2937;
        font-weight: 600;
        line-height: 1.4;
        margin: 0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        letter-spacing: -0.025em;
    }

    .highlight-link {
        color: #2563eb;
        font-weight: 800;
        text-decoration: none;
        position: relative;
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15);
    }

    .highlight-link:hover {
        color: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
    }

    .highlight-link:active {
        transform: translateY(0);
    }

    @media (min-width: 768px) {
        .stats-header {
            margin: 1rem 0;
            padding: 0rem 2rem;
        }

        .stats-header h1 {
            font-size: 2.25rem;
        }
    }

    @media (min-width: 1024px) {
        .stats-header h1 {
            font-size: 2.5rem;
        }
    }

    a {
        text-decoration: none;
    }

    .search-container {
        margin: 2rem 0;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        position: relative;
    }

    input {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1.1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        outline: none;
    }

    input:focus {
        border-color: #2563eb;
    }

    .loading-container {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
    }

    .search-results-section {
        margin: 2rem 0;
    }

    .search-results-header {
        margin-bottom: 1.5rem;
    }

    .search-results-header h2 {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }

    .search-results {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .search-result-row {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.5rem;
        text-decoration: none;
        color: inherit;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-result-row:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
        border-color: #2563eb;
    }

    .result-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .first-line {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }

    .product-name {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
        line-height: 1.4;
        flex: 1;
    }

    .current-price {
        font-size: 1.25rem;
        font-weight: bold;
        color: #2563eb;
        white-space: nowrap;
    }

    .second-line {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .category,
    .brand {
        font-size: 0.875rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 500;
    }

    .category {
        background: #f3f4f6;
        color: #4b5563;
    }

    .brand {
        background: #e0e7ff;
        color: #4338ca;
    }

    .no-results {
        text-align: center;
        color: #6b7280;
        margin: 2rem 0;
    }

    @media (max-width: 640px) {
        .first-line {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .product-name {
            font-size: 1rem;
        }

        .current-price {
            font-size: 1.125rem;
        }

        .second-line {
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .search-result-row {
            padding: 1rem;
        }
    }

    .deals-section {
        margin: 2rem 0;
        padding: 0 1rem;
    }

    .deals-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .view-all {
        font-size: 0.875rem;
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .view-all:hover {
        text-decoration: underline;
    }

    .deals-scroll {
        display: flex;
        overflow-x: auto;
        gap: 1rem;
        padding: 0.5rem;
        margin: 0 -1rem;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none; /* Firefox */
    }

    .deals-scroll::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
    }

    /* Deals loading styles */
    .deals-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        text-align: center;
        background: #f8fafc;
        border-radius: 12px;
        border: 2px dashed #e2e8f0;
    }

    .deals-loading p {
        margin-top: 1rem;
        font-size: 1rem;
        color: #64748b;
        font-weight: 500;
    }

    /* No deals on homepage styles */
    .no-deals-home {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        text-align: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 12px;
        border: 2px dashed #cbd5e1;
    }

    .no-deals-home .no-deals-icon {
        color: #64748b;
        margin-bottom: 1rem;
        opacity: 0.8;
    }

    .no-deals-home p {
        font-size: 1.125rem;
        font-weight: 600;
        color: #334155;
        margin: 0 0 0.5rem 0;
    }

    .no-deals-home span {
        font-size: 0.875rem;
        color: #64748b;
    }

    @media (max-width: 640px) {
        .deals-loading,
        .no-deals-home {
            padding: 2rem 1rem;
        }

        .no-deals-home p {
            font-size: 1rem;
        }
    }
</style>
