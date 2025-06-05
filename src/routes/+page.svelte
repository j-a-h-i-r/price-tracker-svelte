<script lang="ts">
    import { fetchStats } from "$lib/api/stats.js";
    import { fetchDeals } from "$lib/api/deals.js";
    import type { Deal } from "$lib/types/Deal.js";
    import { onMount } from "svelte";

    let searchQuery = '';
    let totalProducts = 0;
    let totalWebsites = 0;
    let totalCategories = 0;
    let searchResults: any[] = [];
    let searchTimeout: ReturnType<typeof setTimeout>;
    let categoryMap: { [key: string]: string } = {};
    let isLoading = false;
    let deals: Deal[] = [];
    let dealsContainer: HTMLElement;
    let autoScrollInterval: ReturnType<typeof setInterval>;
    let isHovering = false;

    onMount(async () => {
        const stats = await fetchStats();
        if (stats) {
            totalProducts = stats.products ?? 0;
            totalWebsites = stats.websites ?? 0;
            totalCategories = stats.categories ?? 0;
        }
    });

    onMount(async () => {
        let categories = await getCategories();
        categories.forEach((category: { id: string; name: string }) => {
            categoryMap[category.id] = category.name;
        });
    });

    onMount(async () => {
        deals = await fetchDeals();
        deals = deals.slice(0, 10); // Limit to first 10 deals
        startAutoScroll();
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
            
            const firstCard = dealsContainer.querySelector('.deal-card');
            if (!firstCard) return;

            const cardWidth = (firstCard as HTMLElement).offsetWidth + 16; // Width + gap
            const newScrollLeft = dealsContainer.scrollLeft + cardWidth;
            
            if (newScrollLeft >= dealsContainer.scrollWidth - dealsContainer.offsetWidth) {
                // Reset to start when reaching the end
                dealsContainer.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                dealsContainer.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
            }
        }, 3000); // Scroll every 3 seconds
    }

    function handleMouseEnter() {
        isHovering = true;
    }

    function handleMouseLeave() {
        isHovering = false;
    }

    async function getCategories() {
        const response = await fetch('/api/categories');
        return await response.json();
    }

    async function handleSearch() {
        isLoading = true;
        const response = await fetch(`/api/products?name=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        searchResults = data;
        isLoading = false;
    }

    function debouncedSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 300);
    }

    $: if (searchQuery !== undefined && searchQuery !== '') {
        debouncedSearch();
    }
</script>

<div class="stats-grid">
    <div class="stat-card">
        <h3>Total Products</h3>
        <a href="/products">
            <p class="number">{totalProducts}</p>
        </a>
    </div>
    <div class="stat-card">
        <h3>Websites Tracked</h3>
        <a href="/websites">
            <p class="number">{totalWebsites}</p>
        </a>
    </div>
    <div class="stat-card">
        <h3>Categories Tracked</h3>
        <a href="/categories">
            <p class="number">{totalCategories}</p>
        </a>
    </div>
</div>

{#if deals.length > 0}
    <div class="deals-section">
        <div class="deals-header">
            <h2>Weekly Deals</h2>
            <a href="/deals" class="view-all">View all →</a>
        </div>
        <div 
            class="deals-scroll" 
            bind:this={dealsContainer} 
            on:mouseenter={handleMouseEnter} 
            on:mouseleave={handleMouseLeave}
            aria-details="Deals carousel"
            role="region"
            aria-label="Deals carousel"
        >
            {#each deals as deal}
                <a href="/products/{deal.product_id}" class="deal-card">
                    <div class="deal-content">
                        <h3>{deal.product_name}</h3>
                        <div class="price-section">
                            <span class="current-price">৳{deal.current_price}</span>
                            {#if deal.current_price}
                                <span class="msrp">৳{deal.max_price_last_days}</span>
                                <span class="discount">-{Math.round((1 - deal.current_price/deal.max_price_last_days) * 100)}%</span>
                            {/if}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    </div>
{/if}

<div class="search-container">
    <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search for products or paste the URL..."
    />
    {#if isLoading}
        <div class="loading-spinner"></div>
    {/if}
</div>

{#if searchResults.length > 0}
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Lowest Price</th>
                </tr>
            </thead>
            <tbody>
                {#each searchResults as product}
                    <tr>
                        <td>
                            <a href="/products/{product.id}">{product.name}</a>
                            <span class="badge category-badge">{categoryMap[product.category_id] || '?'}</span>
                            <span class="badge">{product.prices?.length || 0} websites</span>
                        </td>
                        <td>{product.lowest_available_price ? `৳${product.lowest_available_price}` : 'Not Available'}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{:else if searchQuery}
    <p class="no-results">No products found</p>
{/if}

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .stat-card {
        background: #f4f4f4;
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
    }

    .number {
        font-size: 2rem;
        font-weight: bold;
        margin: 0.5rem 0;
        color: #2563eb;
    }

    h3 {
        margin: 0;
        color: #4b5563;
    }

    a {
        text-decoration: none;
    }

    a:hover .number {
        color: #1d4ed8;
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

    .loading-spinner {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: translateY(-50%) rotate(0deg); }
        100% { transform: translateY(-50%) rotate(360deg); }
    }

    .table-container {
        margin: 2rem 0;
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }

    th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    th {
        background: #f4f4f4;
        font-weight: 600;
        color: #4b5563;
    }

    tr:hover {
        background: #f8fafc;
    }

    .no-results {
        text-align: center;
        color: #6b7280;
        margin: 2rem 0;
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
        scrollbar-width: none;  /* Firefox */
    }

    .deals-scroll::-webkit-scrollbar {
        display: none;  /* Chrome, Safari, Opera */
    }

    .deal-card {
        flex: 0 0 280px;
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
        scroll-snap-align: start;
    }

    .deal-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .deal-content h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #1f2937;
        line-height: 1.4;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .current-price {
        font-size: 1.4rem;
        font-weight: 600;
        color: #16a34a;
    }

    .msrp {
        font-size: 1rem;
        text-decoration: line-through;
        color: #6b7280;
    }

    .discount {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ef4444;
        background: #fee2e2;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }

    .badge {
        font-size: 0.75rem;
        font-weight: 500;
        color: #4b5563;
        background: #e5e7eb;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        margin-left: 0.5rem;
        display: inline-block;
    }

    .category-badge {
        background: #dbeafe;
        color: #1e40af;
    }
</style>

