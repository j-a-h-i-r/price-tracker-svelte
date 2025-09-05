<script lang="ts">
    import { onMount } from 'svelte';
    import type { Deal, DealFilter } from '$lib/types/Deal';
    import { fetchDeals } from '$lib/api/deals.js';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import { fetchCategories, type Category } from '$lib/api/products';
    import NoResult from '$lib/components/NoResult.svelte';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import DealCard from '$lib/components/DealCard.svelte';
    import { getManufacturers } from '$lib/api/manufacturers.js';
    import type { Manufacturer } from '$lib/types/Manufacturer.js';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import type { ResultAsync } from 'neverthrow';

    let selectedDays = $state(7);
    let sortBy = $state<'value' | 'percentage'>('value');
    let categories: Category[] = $state([]);
    let manufacturers: Manufacturer[] = $state([]);
    let selectedCategoryId: string | number = $state('all');
    let selectedManufacturerId: string | number = $state('all');

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

    let deals: ResultAsync<Deal[], Error> = $derived.by(() => {
        let filters: DealFilter = {
            sortby: sortBy,
            days: selectedDays,
        };
        if (selectedCategoryId !== 'all') filters.category_id = selectedCategoryId;
        if (selectedManufacturerId !== 'all') filters.manufacturer_id = selectedManufacturerId;
        
        return fetchDeals(filters);
    });

    onMount(async () => {
        // Load initial data
        const [categoriesData, manufacturersData] = await Promise.all([
            fetchCategories(),
            getManufacturers().unwrapOr([]),
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
            <div class="loading-container">
                <LoadingSpinner size="lg" />
                <div class="loading-text">
                    <h3>Finding the best deals for you...</h3>
                    <p>Searching through thousands of products to find current price drops</p>
                </div>
            </div>
        {:then deals}
            {#if deals.isOk() && deals.value.length === 0}
                <div class="col-span-full">
                    <NoResult message="No deal found" suggestion="Try different configuration" />
                </div>
            {:else if deals.isOk() && deals.value.length > 0}
                {#each deals.value as deal (deal.external_product_id)}
                    <DealCard {deal} {manufacturerMap} {categoryMap} showFullProductName={true} />
                {/each}
            {:else if deals.isErr()}
                <div class="col-span-full">
                    <NoResult message="Error loading deals" suggestion="Please try again later" />
                </div>
            {/if}
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

    /* Loading styles */
    .loading-container {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        min-height: 300px;
    }

    .loading-text {
        margin-top: 1.5rem;
    }

    .loading-text h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
    }

    .loading-text p {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
    }

    @media (max-width: 640px) {
        .loading-container {
            font-size: 1.25rem;
        }
    }
</style>

