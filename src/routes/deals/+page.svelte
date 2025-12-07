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
    import { generateSEOConfig, generateLdJSON, generateItemListStructuredData, generateDealStructuredData } from '$lib/seo.js';
    import type { PageProps } from '../$types.js';
    import { fetchExternalProductBadges, type ProductBadge } from '$lib/api/products.js';
    import { SvelteMap } from 'svelte/reactivity';
    import DealsStatsBar from '$lib/components/DealsStatsBar.svelte';
    import FeaturedDeal from '$lib/components/FeaturedDeal.svelte';
    import DealCardSkeleton from '$lib/components/DealCardSkeleton.svelte';

    let { data }: PageProps = $props();

    const selectedDays = 7;
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

    function getActiveFilterCount(): number {
        let count = 0;
        if (selectedCategoryId !== 'all') count++;
        if (selectedManufacturerId !== 'all') count++;
        return count;
    }

    function clearAllFilters() {
        selectedCategoryId = 'all';
        selectedManufacturerId = 'all';
    }
</script>

<div class="deals-page">
    <!-- Floating Filter Toolbar -->
    <div class="filter-toolbar">
        <div class="toolbar-section filters-section">
            <div class="filter-group">
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

            {#if getActiveFilterCount() > 0}
                <button class="clear-filters-btn" onclick={clearAllFilters}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18"/>
                        <path d="m6 6 12 12"/>
                    </svg>
                    Clear ({getActiveFilterCount()})
                </button>
            {/if}
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-section sort-section">
            <label for="sort-select" class="section-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 16 4 4 4-4"/>
                    <path d="M7 20V4"/>
                    <path d="m21 8-4-4-4 4"/>
                    <path d="M17 4v16"/>
                </svg>
                Sort
            </label>
            <select 
                id="sort-select"
                bind:value={sortBy} 
                class="sort-select"
            >
                <option value="value">💰 Price Drop</option>
                <option value="percentage">📉 % Drop</option>
            </select>
        </div>
    </div>

    <!-- Main Content -->
    {#await deals}
        <DealCardSkeleton count={6} />
    {:then deals}
        {#if deals.isOk() && deals.value.length === 0}
            <NoResult message="No deals found" suggestion="Try adjusting your filters or check back later" />
        {:else if deals.isOk() && deals.value.length > 0}
            <!-- Stats Bar -->
            <DealsStatsBar deals={deals.value} days={selectedDays} />

            <!-- Featured Deal -->
            {#if deals.value.length > 0}
                <FeaturedDeal 
                    deal={deals.value[0]} 
                    categoryMap={data.categoryMap}
                    manufacturerMap={data.manufacturerMap}
                />
            {/if}

            <!-- Results Count -->
            <div class="results-header">
                <h2 class="results-count">
                    {deals.value.length - 1} more {deals.value.length - 1 === 1 ? 'deal' : 'deals'}
                </h2>
            </div>

            <!-- Deals Grid -->
            <div class="deals-grid">
                {#each deals.value.slice(1) as deal (deal.external_product_id)}
                    <DealCard
                        {deal}
                        badges={externalProductBadgesMap.get(deal.external_product_id) || []}
                        categoryMap={data.categoryMap}
                        manufacturerMap={data.manufacturerMap}
                        showFullProductName={true}
                        onScrollToViewOnce={(deal) => handleDealIntoView(deal)}
                    />
                {/each}
            </div>
        {:else if deals.isErr()}
            <NoResult message="Error loading deals" suggestion="Please try again later" />
        {/if}
    {/await}
</div>

<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html
        generateSEOConfig({
            title: 'Find the hottest deals on Bangladeshi products',
            description:
                'Discover the best deals available right now on Bangladeshi products. Updated every day',
            canonical: 'https://daam.deals/deals',
        })
    }
    
    {#await deals then dealsResult}
        {#if dealsResult.isOk() && dealsResult.value.length > 0}
            <!-- ItemList Structured Data for Deals -->
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html
                generateLdJSON(JSON.stringify(generateItemListStructuredData(
                    dealsResult.value.slice(0, 10).map((deal, index) => ({
                        name: deal.product_name,
                        url: `https://daam.deals/products/${deal.product_id}`,
                        position: index + 1
                    }))
                ), null, 2))
            }
            
            <!-- Deal Structured Data for top deals -->
            {#each dealsResult.value.slice(0, 5) as deal(deal.external_product_id)}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html generateLdJSON(JSON.stringify(generateDealStructuredData(deal), null, 2))}
            {/each}
        {/if}
    {/await}
</svelte:head>

<style>
    .deals-page {
        max-width: 1400px;
        margin: 0 auto;
    }

    /* Filter Toolbar */
    .filter-toolbar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        border: 1px solid rgba(229, 231, 235, 0.8);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
        margin-bottom: 2rem;
        position: sticky;
        top: 1rem;
        z-index: 100;
    }

    .toolbar-section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .toolbar-divider {
        width: 1px;
        height: 32px;
        background: #e5e7eb;
    }

    .section-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }

    /* Filters Section */
    .filters-section {
        flex: 1;
        flex-wrap: wrap;
    }

    .filter-group {
        display: flex;
        gap: 0.75rem;
        flex: 1;
    }

    .clear-filters-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #dc2626;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .clear-filters-btn:hover {
        background: #fee2e2;
        border-color: #fca5a5;
    }

    /* Sort Section */
    .sort-section {
        gap: 0.5rem;
    }

    .sort-select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .sort-select:hover {
        border-color: #d1d5db;
    }

    .sort-select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    /* Results Header */
    .results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }

    .results-count {
        font-size: 1rem;
        font-weight: 600;
        color: #4b5563;
        margin: 0;
    }

    /* Deals Grid */
    .deals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .filter-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            position: static;
            padding: 1rem;
        }

        .toolbar-divider {
            display: none;
        }

        .toolbar-section {
            width: 100%;
        }

        .filters-section {
            flex-direction: column;
            gap: 0.75rem;
        }

        .filter-group {
            flex-direction: column;
        }

        .sort-section {
            justify-content: space-between;
        }

        .sort-select {
            flex: 1;
        }

        .clear-filters-btn {
            width: 100%;
            justify-content: center;
        }
    }

</style>

