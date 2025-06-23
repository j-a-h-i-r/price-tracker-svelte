<script lang="ts">
    import { onMount } from 'svelte';
    import type { Deal, DealFilter } from '$lib/types/Deal';
    import { fetchDeals } from '$lib/api/deals.js';
    import { formatPrice } from '$lib/util.js';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import { fetchCategories, type Category } from '$lib/api/products';
    import NoResult from '$lib/components/NoResult.svelte';
    import { getManufacturers } from '$lib/api/manufacturers.js';
    import type { Manufacturer } from '$lib/types/Manufacturer.js';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';

    let selectedDays = $state(7);
    let sortBy = $state<'value' | 'percentage'>('value');
    let categories: Category[] = $state([]);
    let manufacturers: Manufacturer[] = $state([]);
    let selectedCategoryId: string | number = $state("all");
    let selectedManufacturerId: string | number = $state("all");

    onMount(() => {
        const urlCategoryId = page.url.searchParams.get('category_id');
        const urlManufacturerId = page.url.searchParams.get('manufacturer_id');
        if (urlCategoryId) {
            selectedCategoryId = urlCategoryId;
        }
        if (urlManufacturerId) {
            selectedManufacturerId = urlManufacturerId;
        }
    });

    $effect(() => {
        const params = new URLSearchParams();
        if (selectedCategoryId !== 'all') {
            params.set('category_id', selectedCategoryId.toString());
        }
        if (selectedManufacturerId !== 'all') {
            params.set('manufacturer_id', selectedManufacturerId.toString());
        }

        try {
            goto(`?${params.toString()}`, { keepFocus: true, replaceState: true });
        } catch (error) {
            console.warn('Error updating URL:', error);
        }
    });

    let categoryMap = $derived.by(() => {
        return categories.reduce((map, category) => {
            map[category.id] = category;
            return map;
        }, {} as Record<string, Category>);
    });

    let manufacturerMap = $derived.by(() => {
        return manufacturers.reduce((map, manufacturer) => {
            map[manufacturer.id] = manufacturer;
            return map;
        }, {} as Record<string, Manufacturer>);
    });

    let deals: Promise<Deal[]> = $derived.by(() => {
        let filters: DealFilter = {
            sortby: sortBy,
            days: selectedDays,
        };
        if (selectedCategoryId !== "all") filters.category_id = selectedCategoryId;
        if (selectedManufacturerId !== "all") filters.manufacturer_id = selectedManufacturerId;
        
        return fetchDeals(filters);
    });

    onMount(async () => {
        // Load initial data
        const [categoriesData, manufacturersData] = await Promise.all([
            fetchCategories(),
            getManufacturers(),
        ]);
        
        categories = categoriesData;
        manufacturers = manufacturersData;
    });
</script>

<div class="deals-container">
    <div class="deals-header">
        <h1>Current Deals</h1>
        <h2>Check out current deals. Use the filters to grab your perfect deal!</h2>
    </div>
    <div class="filter-sort">
        <div class="time-filters">
            <button 
                class:active={selectedDays === 7} 
                onclick={() => selectedDays = 7}
            >
                7 Days
            </button>
            <button 
                class:active={selectedDays === 30} 
                onclick={() => selectedDays = 30}
            >
                30 Days
            </button>
        </div>
        <div class="filter-control">
            <SearchableSelect
                label="Category"
                options={categories}
                bind:value={selectedCategoryId}
                allLabel="All Categories"
            />

            <SearchableSelect
                label="Brand"
                options={manufacturers}
                bind:value={selectedManufacturerId}
                allLabel="All Brands"
            />
        </div>

        <div class="sort-control">
            <label for="sort-select">Sort</label>
            <select 
                id="sort-select"
                bind:value={sortBy} 
                class="sort-select"
            >
                <option value="value">Maximum Price Drop</option>
                <option value="percentage">Maximum Percentage Drop</option>
            </select>
        </div>
        
    </div>

    <div class="deals-grid">
        {#await deals}
            <p class="col-span-full">Loading deals...</p>
        {:then deals}
            {#if deals.length === 0}
                <div class="col-span-full">
                    <NoResult message="No deal found" suggestion="Try different configuration" />
                </div>
            {:else}
                {#each deals as deal}
                    <a href="/products/{deal.product_id}" onclick={() => goto(`/products/${deal.product_id}`, { state: { highlight_external_product_id: deal.external_product_id } })} class="deal-card">
                        <div class="deal-content">
                            <h3>{deal.product_name}</h3>
                            <div class="price-section">
                                <span class="current-price">{formatPrice(deal.current_price)}</span>
                                {#if deal.current_price}
                                    <span class="msrp">{formatPrice(deal.max_price_last_days)}</span>
                                    <span class="discount">-{Math.round((1 - deal.current_price/deal.max_price_last_days) * 100)}%</span>
                                {/if}
                            </div>
                        </div>
                        <div class="info-section">
                            <span class="manufacturer">{manufacturerMap[deal.manufacturer_id]?.name || 'Unknown Brand'}</span>
                            <span class="category">{categoryMap[deal.category_id]?.name || 'Uncategorized'}</span>
                        </div>
                    </a>
                {/each}
            {/if}
        {:catch error}
            <p>Error loading deals: {error.message}</p>
        {/await}
    </div>
</div>

<svelte:head>
    <title>Current Deals - Find the hottest deals on Bangladeshi products</title>
    <meta name="description" content="Discover the best deals available right now on Bangladeshi products. Updated every day" />
</svelte:head>

<style>
    .deals-container {
        padding: 2rem;
        padding-top: 0;
    }

    .deals-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .deals-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
        line-height: 1.2;
    }

    .deals-header h2 {
        font-size: 1.125rem;
        font-weight: 400;
        color: #6b7280;
        margin: 0;
        line-height: 1.5;
    }

    @media (max-width: 640px) {
        .deals-header h1 {
            font-size: 1.75rem;
        }

        .deals-header h2 {
            font-size: 1rem;
        }
    }

    .sort-control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    @media (max-width: 640px) {
        .sort-control {
            width: 100%;
        }

        .sort-control select {
            flex: 1;
        }
    }

    .sort-control label {
        color: #4b5563;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .sort-select {
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #4b5563;
        font-size: 0.875rem;
        cursor: pointer;
    }

    .sort-select:hover {
        border-color: #d1d5db;
    }

    .sort-select:focus {
        outline: none;
        border-color: #2563eb;
    }

    .time-filters {
        display: flex;
        gap: 0.5rem;
    }

    @media (max-width: 640px) {
        .time-filters {
            width: 100%;
        }

        .time-filters button {
            flex: 1;
        }
    }

    .time-filters button {
        padding: 0.375rem 0.75rem;
        border: none;
        border-radius: 8px;
        background: #e5e7eb;
        cursor: pointer;
        transition: background 0.2s;
    }

    .time-filters button:hover {
        background: #d1d5db;
    }

    .time-filters button.active {
        background: #2563eb;
        color: white;
    }

    .deals-grid {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .col-span-full {
        grid-column: 1 / -1;
    }

    .deal-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        transition: all 0.2s ease;
    }

    .deal-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(37, 99, 235, 0.1);
        border-color: #2563eb;
    }

    .deal-content h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        line-height: 1.4;
        color: #1f2937;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        height: 2.8em;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .current-price {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
    }

    .msrp {
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

    .filter-sort {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
    }

    .filter-control {
        display: flex;
        gap: 1rem;
        /* flex-wrap: wrap; */
        flex: 1;
    }

    .info-section {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        flex-wrap: wrap;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        justify-content: space-between;
    }

    .info-section > span {
        font-size: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        background: #f3f4f6;
        color: #4b5563;
    }

    .info-section > .manufacturer {
        background: #e0e7ff;
        color: #4338ca;
        font-weight: 500;
    }

    .info-section > .category {
        background: #f3f4f6;
        color: #4b5563;
    }

    @media (max-width: 768px) {
        .filter-sort {
            flex-direction: column;
            align-items: stretch;
        }

        .filter-control {
            flex-direction: column;
            width: 100%;
        }
    }
</style>

