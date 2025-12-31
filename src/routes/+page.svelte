<script lang="ts">
    import { onMount } from 'svelte';
    import { onDestroy } from 'svelte';
    import { formatPrice } from '$lib/util.js';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import DealCard from '$lib/components/DealCard.svelte';
    import type { ProductWithLastPrice, } from '$lib/types/Product.js';
    import { fetchExternalProductBadges, fetchProducts, type ProductBadge, } from '$lib/api/products.js';
    import { generateLdJSON, generateOrganizationStructuredData, generateSEOConfig, generateWebsiteStructuredData } from '$lib/seo.js';
    import type { PageProps } from './$types.js';
    import { SvelteMap } from 'svelte/reactivity';
    import type { Deal } from '$lib/types/Deal.js';
    import { ResultAsync } from 'neverthrow';
    import CloseableBanner from '$lib/components/CloseableBanner.svelte';
        
    let searchQuery = $state<string>('');
    let pagedProducts: ProductWithLastPrice[] = $state([]);
    let searchTimeout: ReturnType<typeof setTimeout>;
    let searchAbortController: AbortController | null = null;
    let isLoading = $state(false);
    let dealsContainer = $state<HTMLElement | undefined>();
    let autoScrollInterval: ReturnType<typeof setInterval>;
    let isHovering = false;
    let paginatedProductApi: ReturnType<typeof fetchProducts> | null = $state(null);

    let { data }: PageProps = $props();

    let dealCountToShow = Math.floor(data.deals.length / 10) * 10;
    let deals = data.deals.slice(0, 10); // Limit to first 10 deals

    let externalProductBadgesMap: SvelteMap<number, ProductBadge[]> = new SvelteMap();

    onMount(() => {
        startAutoScroll();
        fetchDealBadges(deals);
        return () => {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
            }
        };
    });

    function fetchDealBadges(deals: Deal[]) {
        const badgeReqs = deals.map((deal) => {
            return fetchExternalProductBadges(deal.external_product_id)
        })
        ResultAsync.combine(badgeReqs).map((badgesArray) => {
            deals.forEach((deal, index) => {
                externalProductBadgesMap.set(deal.external_product_id, badgesArray[index]);
            });
        });
    }

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

        paginatedProductApi = fetchProducts({
            name: searchQuery,
            abortSignal: searchAbortController.signal
        }, { limit: 10 });

        const resp = await paginatedProductApi.first();
        if (resp.isOk() && !searchAbortController.signal.aborted) {
            pagedProducts = resp.value.data;
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
            pagedProducts = [];
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

    function loadMore() {
        isLoading = true;
        paginatedProductApi?.next().map((resp) => {
            pagedProducts.push(...resp.data);
            isLoading = false;
        });
    }
</script>

<CloseableBanner name="homepage-url-lookup">
    <div class="homepage-banner">
        <div class="homepage-banner__copy">
            <p class="homepage-banner__description">
                Have a link? Use the <a class="homepage-banner__link" href="/url">URL lookup tool</a> to check price history and find related products
            </p>
        </div>
    </div>
</CloseableBanner>

<div class="stats-header">
    <h1>
        Tracking prices of
        <span class="highlight-link">
            {#if data.stats.products === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/products">{data.stats.products}</a>
            {/if}
        </span>
        products from
        <span class="highlight-link">
            {#if data.stats.categories === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/categories">{data.stats.categories}</a>
            {/if}
        </span>
        categories across
        <span class="highlight-link">
            {#if data.stats.websites === undefined}
                <LoadingSpinner size="sm" inline={true} />
            {:else}
                <a href="/websites">{data.stats.websites}</a>
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
    {#if deals.length > 0}
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
                <DealCard {deal} badges={externalProductBadgesMap.get(deal.external_product_id) ?? []} />
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
        name="searchproducts"
        bind:value={searchQuery}
        placeholder="Search for products or paste the URL..."
        class="form-input"
    />
    {#if isLoading}
        <div class="loading-container">
            <LoadingSpinner size="sm" inline={true} />
        </div>
    {/if}
</div>

{#if pagedProducts.length > 0}
    <div class="search-results-section">
        <div class="search-results-header">
            <h2>Showing results for "{searchQuery}"</h2>
        </div>
        <div class="search-results">
            {#each pagedProducts as product (product.id)}
                <a href="/products/{product.slug}" class="search-result-row">
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
                            <span class="category">{data.categoryMap.get(product.category_id)?.name || 'Unknown Category'}</span>
                            <span class="brand">{data.manufacturerMap.get(product.manufacturer_id)?.name || 'Unknown Brand'}</span>
                        </div>
                    </div>
                </a>
            {/each}
        </div>

        <div class="load-more-section">
            {#if isLoading}
                <div class="loading-state">
                    <LoadingSpinner size="md" />
                    <span class="loading-text">Loading more products...</span>
                </div>
            {:else if paginatedProductApi?.hasNext()}
                <button class="btn-primary load-more-btn" onclick={() => loadMore()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14"/>
                        <path d="M5 12h14"/>
                    </svg>
                    Load More Products
                </button>
            {:else}
                <div class="all-loaded-state">
                    <div class="all-loaded-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <p class="all-loaded-text">All products loaded</p>
                </div>
            {/if}
        </div>
    </div>
{:else if searchQuery}
    <p class="no-results">No products found</p>
{/if}

<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html generateSEOConfig({
        title: 'Find lowest prices and deals on Bangladeshi products (StarTech etc)',
        description: 'Best price comparison website in Bangladesh. Discover the best deals, find lowest prices and track price drops from top retailers like Startech, Techland etc.',
        canonical: 'https://daam.deals/',
    })}
    
    <!-- Structured Data -->
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html generateLdJSON(JSON.stringify(generateWebsiteStructuredData(), null, 2)) }
    
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html generateLdJSON(JSON.stringify(generateOrganizationStructuredData(), null, 2))}
</svelte:head>

<style>
    .stats-header {
        text-align: center;
        margin: var(--spacing-lg) 0;
        padding: 0 var(--spacing-lg);
    }

    .homepage-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0 auto;
    }

    .homepage-banner__copy {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        color: #1e3a8a;
    }

    .homepage-banner__description {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 500;
        color: rgba(29, 78, 216, 0.75);
    }

    .homepage-banner__link {
        font-weight: 600;
        color: #1e3a8a;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
        transition: color 0.15s ease;
    }

    .homepage-banner__link:hover {
        color: #1d4ed8;
    }

    @media (max-width: 640px) {
        .homepage-banner {
            flex-direction: column;
            align-items: flex-start;
        }

        .homepage-banner__description {
            font-size: 0.85rem;
        }
    }

    .stats-header h1 {
        font-size: var(--text-2xl);
        color: var(--color-text-primary);
        font-weight: var(--font-semibold);
        line-height: var(--leading-relaxed);
        margin: 0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        letter-spacing: -0.025em;
    }

    .highlight-link {
        color: var(--color-primary);
        font-weight: var(--font-bold);
        text-decoration: none;
        position: relative;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-md);
        transition: all var(--transition-normal);
        background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-lighter) 100%);
        box-shadow: var(--shadow-sm);
    }

    .highlight-link:hover {
        color: var(--color-primary-dark);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        background: linear-gradient(135deg, var(--color-primary-lighter) 0%, var(--color-primary-light) 100%);
    }

    .highlight-link:active {
        transform: translateY(0);
    }

    @media (min-width: 768px) {
        .stats-header {
            margin: var(--spacing-lg) 0;
            padding: 0 var(--spacing-2xl);
        }

        .stats-header h1 {
            font-size: var(--text-3xl);
        }
    }

    @media (min-width: 1024px) {
        .stats-header h1 {
            font-size: var(--text-4xl);
        }
    }

    a {
        text-decoration: none;
    }

    .search-container {
        margin: var(--spacing-2xl) 0;
        margin-left: auto;
        margin-right: auto;
        position: relative;
    }

    .loading-container {
        position: absolute;
        right: var(--spacing-lg);
        top: 50%;
        transform: translateY(-50%);
    }

    .search-results-section {
        margin: var(--spacing-2xl) 0;
    }

    .search-results-header {
        margin-bottom: var(--spacing-xl);
    }

    .search-results-header h2 {
        font-size: var(--text-base);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin: 0;
    }

    .search-results {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
    }

    .search-result-row {
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--spacing-xl);
        text-decoration: none;
        color: inherit;
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
    }

    .search-result-row:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
        border-color: var(--color-primary);
    }

    .result-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .first-line {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--spacing-lg);
    }

    .product-name {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin: 0;
        line-height: var(--leading-relaxed);
        flex: 1;
    }

    .current-price {
        font-size: var(--text-xl);
        font-weight: var(--font-bold);
        color: var(--color-primary);
        white-space: nowrap;
    }

    .second-line {
        display: flex;
        gap: var(--spacing-lg);
        align-items: center;
    }

    .category,
    .brand {
        font-size: var(--text-sm);
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--radius-full);
        font-weight: var(--font-medium);
    }

    .category {
        background: var(--color-bg-tertiary);
        color: var(--color-text-secondary);
    }

    .brand {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
    }

    .no-results {
        text-align: center;
        color: var(--color-text-secondary);
        margin: var(--spacing-2xl) 0;
    }

    @media (max-width: 640px) {
        .first-line {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-sm);
        }

        .product-name {
            font-size: var(--text-base);
        }

        .current-price {
            font-size: var(--text-lg);
        }

        .second-line {
            flex-wrap: wrap;
            gap: var(--spacing-sm);
        }

        .search-result-row {
            padding: var(--spacing-lg);
        }
    }

    .deals-section {
        margin: var(--spacing-2xl) 0;
        padding: 0 var(--spacing-lg);
    }

    .deals-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-lg);
    }

    .view-all {
        font-size: var(--text-sm);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: var(--font-medium);
        transition: all var(--transition-fast);
    }

    .view-all:hover {
        text-decoration: underline;
        color: var(--color-primary-dark);
    }

    .deals-scroll {
        display: flex;
        overflow-x: auto;
        gap: var(--spacing-lg);
        padding: var(--spacing-sm);
        margin: 0 calc(-1 * var(--spacing-lg));
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
        padding: var(--spacing-3xl) var(--spacing-2xl);
        text-align: center;
        background: var(--color-bg-secondary);
        border-radius: var(--radius-lg);
        border: 2px dashed var(--color-border-light);
    }

    .deals-loading p {
        margin-top: var(--spacing-lg);
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        font-weight: var(--font-medium);
    }

    /* No deals on homepage styles */
    .no-deals-home {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-3xl) var(--spacing-2xl);
        text-align: center;
        background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
        border-radius: var(--radius-lg);
        border: 2px dashed var(--color-border-light);
    }

    .no-deals-home .no-deals-icon {
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-lg);
        opacity: 0.8;
    }

    .no-deals-home p {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-sm) 0;
    }

    .no-deals-home span {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
    }

    @media (max-width: 640px) {
        .deals-loading,
        .no-deals-home {
            padding: var(--spacing-2xl) var(--spacing-lg);
        }

        .no-deals-home p {
            font-size: var(--text-base);
        }
    }

    /* Load More Section Styles */
    .load-more-section {
        display: flex;
        justify-content: center;
        align-items: center;
        padding-top: var(--spacing-2xl);
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .loading-text {
        font-size: var(--text-base);
        color: var(--color-text-secondary);
        font-weight: var(--font-medium);
    }

    .load-more-btn {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        position: relative;
        overflow: hidden;
        min-width: 180px;
        justify-content: center;
        border-radius: 2rem;
        padding: 0.5rem 1.5rem;
        cursor: pointer;
    }

    .load-more-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
    }

    .load-more-btn:hover::before {
        left: 100%;
    }

    .load-more-btn svg {
        transition: transform var(--transition-normal);
    }

    .load-more-btn:hover svg {
        transform: scale(1.1);
    }

    .all-loaded-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        max-width: 300px;
    }

    .all-loaded-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%);
        color: var(--color-success-contrast);
        border-radius: var(--radius-full);
        margin-bottom: var(--spacing-sm);
    }

    .all-loaded-text {
        font-size: var(--text-lg);
        font-weight: var(--font-semibold);
        color: var(--color-text-primary);
        margin: 0;
    }

    @media (max-width: 640px) {
        .load-more-btn {
            min-width: 150px;
        }

        .all-loaded-state {
            padding: var(--spacing-xl);
            max-width: 280px;
        }

        .all-loaded-icon {
            width: 40px;
            height: 40px;
        }

        .all-loaded-text {
            font-size: var(--text-base);
        }
    }
</style>
