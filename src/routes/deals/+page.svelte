<script lang="ts">
    import { onMount } from 'svelte';
    import type { Deal, DealFilter } from '$lib/types/Deal';
    import { fetchDeals } from '$lib/api/deals.js';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import NoResult from '$lib/components/NoResult.svelte';
    import DealCard from '$lib/components/DealCard.svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { ResultAsync } from 'neverthrow';
    import Loader from '$lib/components/Loader.svelte';
    import { generateSEOConfig } from '$lib/seo.js';
    import type { PageProps } from '../$types.js';
    import { fetchExternalProductBadges, type ProductBadge } from '$lib/api/products.js';
    import { SvelteMap } from 'svelte/reactivity';

    let { data }: PageProps = $props();

    let selectedDays = $state(7);
    let sortBy = $state<'value' | 'percentage'>('value');
    let selectedCategoryId: string | number = $state('all');
    let selectedManufacturerId: string | number = $state('all');
    let externalProductBadgesMap: SvelteMap<number, ProductBadge[]> = new SvelteMap();

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

    let deals: ResultAsync<Deal[], Error> = $derived.by(() => {
        let filters: DealFilter = {
            sortby: sortBy,
            days: selectedDays,
        };
        if (selectedCategoryId !== 'all') filters.category_id = selectedCategoryId;
        if (selectedManufacturerId !== 'all') filters.manufacturer_id = selectedManufacturerId;
        
        return fetchDeals(filters);
    });

    function handleDealIntoView(deal: Deal) {
        fetchExternalProductBadges(deal.external_product_id)
        .map((badges) => {
            externalProductBadgesMap.set(deal.external_product_id, badges);
        })
    }
</script>

<div class="">
    <div class="deals-header">
        <h1>Current Deals</h1>
        <h2>Check out current deals. Use the filters to grab your perfect deal!</h2>
    </div>
    <div class="filter-sort">
        <div class="time-filters">
            <button 
                class={['btn', selectedDays === 7 ? 'btn-primary': '']}
                onclick={() => selectedDays = 7}
            >
                7 Days
            </button>
            <button 
                class={['btn', selectedDays === 30 ? 'btn-primary': '']}
                onclick={() => selectedDays = 30}
            >
                30 Days
            </button>
        </div>
        <div class="filter-control">
            <SearchableSelect
                label="Category"
                options={data.categories}
                bind:value={selectedCategoryId}
                allLabel="All Categories"
            />

            <SearchableSelect
                label="Brand"
                options={data.manufacturers}
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
            <Loader
                headerText="Finding the best deals for you..."
                subText="Searching through thousands of products to find current price drops"
            />
        {:then deals}
            {#if deals.isOk() && deals.value.length === 0}
                <div class="col-span-full">
                    <NoResult message="No deal found" suggestion="Try different configuration" />
                </div>
            {:else if deals.isOk() && deals.value.length > 0}
                {#each deals.value as deal (deal.external_product_id)}
                    <DealCard
                        {deal}
                        badges={externalProductBadgesMap.get(deal.external_product_id) || []}
                        categoryMap={data.categoryMap}
                        manufacturerMap={data.manufacturerMap}
                        showFullProductName={true}
                        onScrollToViewOnce={(deal) => handleDealIntoView(deal)}
                    />
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
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html
        generateSEOConfig({
            title: 'Current Deals - Find the hottest deals on Bangladeshi products',
            description:
                'Discover the best deals available right now on Bangladeshi products. Updated every day',
            canonical: 'https://daam.deals/deals',
        })
    }
</svelte:head>

<style>
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
        background: white;
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
</style>

