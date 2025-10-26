<script lang="ts">
    import { onMount } from 'svelte';
    import { getManufacturers } from '$lib/api/manufacturers.js';
    import type { Manufacturer } from '$lib/types/Manufacturer.js';
    import type { MetadataFilter } from '$lib/types/Metadata.js';
    import { fetchExternalProducts, type Category, type ExternalProduct } from '$lib/api/products.js';
    import { goto } from '$app/navigation';
    import type { Snapshot } from '../$types.js';
    import { formatPrice, linkWithUtmSource } from '$lib/util.js';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import RangeInput from '$lib/components/RangeInput.svelte';
    import { getCategories } from '$lib/api/categories.js';
    import { fetchMetadataFilters } from '$lib/api/metadata.js';
    import Pill from '$lib/components/Pill.svelte';
    import { SvelteMap } from 'svelte/reactivity';

    type MetadataValueType = string | number | boolean | { min?: number; max?: number }
    interface MetadataValue {
        inputValue?: MetadataValueType
    }

    let manufacturers: Manufacturer[] = $state([]);
    let categories: Category[] = $state([]);
    let metadataFilters: MetadataFilter[] = $state([]);

    // Filter states
    let selectedBrandId: number | 'all' = $state('all');
    let selectedCategoryId: number | 'all' = $state('all');
    let minPrice: number | undefined = $state(undefined);
    let maxPrice: number | undefined = $state(undefined);
    let selectedFilters = new SvelteMap<string, MetadataFilter & MetadataValue>();
    let isLoading = $state(false);
    let searchResults: ExternalProduct[] = $state([]);
    let hasSearched = $state(false);
    // Mobile additional filters disclosure
    let isMobileFiltersOpen = $state(false);

    export const snapshot: Snapshot<string> = {
        capture: () =>
            JSON.stringify({
                selectedBrandId,
                selectedCategoryId,
                minPrice,
                maxPrice,
                selectedFilters,
            }),
        restore: (value) => {
            const data = JSON.parse(value);
            selectedBrandId = data.selectedBrandId || '';
            selectedCategoryId = data.selectedCategoryId || '';
            minPrice = data.minPrice || '';
            maxPrice = data.maxPrice || '';
        },
    };

    onMount(async () => {
        manufacturers = await getManufacturers().unwrapOr([]);
        categories = await getCategories().unwrapOr([]);
        metadataFilters = await fetchMetadataFilters().unwrapOr([]);
        metadataFilters.sort((a, b) => {
            if (a.type === b.type) return 0;
            if (a.type === 'range') return -1;
            if (b.type === 'range') return 1;
            if (a.type === 'set') return -1;
            if (b.type === 'set') return 1;
            if (a.type === 'boolean') return -1;
            if (b.type === 'boolean') return 1;
            return 0;
        });
    });

    function isNeutral(meta: MetadataFilter, val: MetadataValueType | undefined): boolean {
        if (val === undefined || val === null) return true;
        if (meta.type === 'set') return val === 'all';
        if (meta.type === 'boolean') return val !== true; // only true actively filters
        if (meta.type === 'range' && typeof val === 'object') {
            const v = val as { min?: number; max?: number };
            const bothUndefined = v.min === undefined && v.max === undefined;
            const bothBounds = v.min === meta.value.min && v.max === meta.value.max;
            return bothUndefined || bothBounds;
        }
        return false;
    }

    function handleMetadataChange(metadataKey: string, value: MetadataValueType) {
        const currentFilter = selectedFilters.get(metadataKey);
        const meta = metadataFilters.find((m) => m.key === metadataKey);
        if (!meta) return;

        let nextValue: MetadataValueType | undefined = value;
        if (typeof value === 'object' && value !== null) {
            const prev = (currentFilter && typeof currentFilter.inputValue === 'object' && currentFilter.inputValue !== null)
                ? (currentFilter.inputValue as { min?: number; max?: number })
                : {};
            nextValue = { ...prev, ...(value as { min?: number; max?: number }) };
        }

        if (isNeutral(meta, nextValue)) {
            selectedFilters.delete(metadataKey);
            return;
        }

        if (currentFilter) {
            selectedFilters.set(metadataKey, { ...currentFilter, inputValue: nextValue });
        } else {
            selectedFilters.set(metadataKey, { ...meta, inputValue: nextValue });
        }
    }

    function getRangeValue(key: string, kind: 'min' | 'max'): number | undefined {
        const v = selectedFilters.get(key)?.inputValue;
        if (typeof v === 'object' && v !== null) {
            const r = v as { min?: number; max?: number };
            return r[kind];
        }
        return undefined;
    }

    async function findProducts() {
        isLoading = true;
        const metadataFilters: Record<string, MetadataValueType> = {};
        selectedFilters.entries().forEach(([key, filter]) => {
            if (!isNeutral(filter, filter.inputValue)) {
                metadataFilters[key] = filter.inputValue as MetadataValueType;
            }
        })
        fetchExternalProducts({
            brandId: selectedBrandId, categoryId: selectedCategoryId,
            minPrice: minPrice, maxPrice: maxPrice,
            metadata: metadataFilters,
        })
        .match(
            (products) => {
                searchResults = products;
                hasSearched = true;
            },
            () => {
                searchResults = [];
                hasSearched = true;
            }
        )
        .then(() => {
            isLoading = false;
        })
    }

    // addFilter no longer required (mobile uses drawer with direct controls)

    // removeFilter no longer used; sidebar controls write directly to selection

    function isValueSet(value: unknown) {
        return value !== undefined && value !== null && value !== '';
    }
</script>



<div class="configurator-container">
    <div class="header">
        <p>Find the perfect product by configuring your preferences</p>
    </div>

    <div class="main-layout">
        <!-- Desktop/Tablet Left Sidebar for Additional Filters -->
        <aside class="filters-sidebar" aria-label="Additional filters">
            <div class="filters-sidebar-card">
                <div class="filters-sidebar-header">
                    <h3>Additional Filters</h3>
                </div>
                <div class="filters-sidebar-content">
                    {#each metadataFilters as metadata (metadata.key)}
                        <div class="sidebar-filter">
                            <div class="sidebar-filter-label">{metadata.display_text}{metadata.type === 'range' && metadata.unit ? ` (${metadata.unit})` : ''}</div>
                            {#if metadata.type === 'set'}
                                <SearchableSelect
                                    label={metadata.display_text}
                                    allLabel={`All ${metadata.display_text}`}
                                    bind:value={
                                        () => selectedFilters.get(metadata.key)?.inputValue?.toString() || 'all',
                                        (val: string) => handleMetadataChange(metadata.key, val)
                                    }
                                    options={metadata.value.map(m => ({ id: m, name: m }))}
                                />
                            {:else if metadata.type === 'range'}
                                <RangeInput
                                    label={metadata.display_text}
                                    minAllowed={metadata.value.min}
                                    maxAllowed={metadata.value.max}
                                    bind:minValue={
                                        () => getRangeValue(metadata.key, 'min'),
                                        (val) => handleMetadataChange(metadata.key, { min: val })
                                    }
                                    bind:maxValue={
                                        () => getRangeValue(metadata.key, 'max'),
                                        (val) => handleMetadataChange(metadata.key, { max: val })
                                    }
                                    unit={null}
                                />
                            {:else if metadata.type === 'boolean'}
                                <div class="toggle-wrapper">
                                    <label class="toggle-switch">
                                        <input 
                                            type="checkbox"
                                            aria-label={metadata.display_text}
                                            checked={selectedFilters.get(metadata.key)?.inputValue == true}
                                            onchange={(e: Event) => handleMetadataChange(metadata.key, (e.target as HTMLInputElement).checked)}
                                        />
                                        <span class="toggle-track"></span>
                                    </label>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </aside>

        <!-- Main content: default filters, selected filters, actions, and results -->
        <main class="main-content">
            <div class="filter-bar">
                <!-- Default Filters -->
                <div class="filter-item-bar" class:active={selectedBrandId !== 'all'}>
                    <SearchableSelect
                        label="Brand"
                        allLabel="All Brands"
                        bind:value={selectedBrandId}
                        options={manufacturers.map((m) => ({ id: m.id, name: m.name }))}
                    />
                </div>

                <div
                    class="filter-item-bar"
                    class:active={selectedCategoryId !== 'all'}
                >
                    <SearchableSelect
                        label="Category"
                        allLabel="All Categories"
                        bind:value={selectedCategoryId}
                        options={categories.map((m) => ({ id: m.id, name: m.name }))}
                    />
                </div>

                <div
                    class="filter-item-bar"
                    class:active={isValueSet(minPrice) || isValueSet(maxPrice)}
                >
                    <RangeInput
                        label="Price Range"
                        bind:minValue={minPrice}
                        bind:maxValue={maxPrice}
                        unit="৳"
                    />
                </div>

                <!-- optional filters moved to sidebar -->
            </div>

            <!-- Mobile-only: hamburger menu for Additional Filters -->
            <div class="mobile-filters">
                <button class="mobile-filters-toggle" onclick={() => (isMobileFiltersOpen = true)} aria-expanded={isMobileFiltersOpen} aria-controls="mobile-filters-drawer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    Filters
                </button>
            </div>

            {#if isMobileFiltersOpen}
                <div
                    class="mobile-filters-overlay"
                    role="button"
                    tabindex="0"
                    onclick={() => (isMobileFiltersOpen = false)}
                    onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { isMobileFiltersOpen = false; } }}
                >
                    <div
                        id="mobile-filters-drawer"
                        class="mobile-filters-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mobile-filters-title"
                        tabindex="0"
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                    >
                        <div class="mobile-filters-header">
                            <h3 id="mobile-filters-title">Filters</h3>
                            <button class="mobile-filters-close" onclick={() => (isMobileFiltersOpen = false)} aria-label="Close filters">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <div class="mobile-filters-content">
                            {#each metadataFilters as metadata (metadata.key)}
                                <div class="drawer-filter">
                                    <div class="drawer-filter-label">{metadata.display_text}{metadata.type === 'range' && metadata.unit ? ` (${metadata.unit})` : ''}</div>
                                    {#if metadata.type === 'set'}
                                        <SearchableSelect
                                            label={metadata.display_text}
                                            allLabel={`All ${metadata.display_text}`}
                                            bind:value={
                                                () => selectedFilters.get(metadata.key)?.inputValue?.toString() || 'all',
                                                (val: string) => handleMetadataChange(metadata.key, val)
                                            }
                                            options={metadata.value.map(m => ({ id: m, name: m }))}
                                        />
                                    {:else if metadata.type === 'range'}
                                        <RangeInput
                                            label={metadata.display_text}
                                            minAllowed={metadata.value.min}
                                            maxAllowed={metadata.value.max}
                                            bind:minValue={
                                                () => getRangeValue(metadata.key, 'min'),
                                                (val) => handleMetadataChange(metadata.key, { min: val })
                                            }
                                            bind:maxValue={
                                                () => getRangeValue(metadata.key, 'max'),
                                                (val) => handleMetadataChange(metadata.key, { max: val })
                                            }
                                            unit={null}
                                        />
                                    {:else if metadata.type === 'boolean'}
                                        <div class="toggle-wrapper">
                                            <label class="toggle-switch">
                                                <input 
                                                    type="checkbox"
                                                    aria-label={metadata.display_text}
                                                    checked={selectedFilters.get(metadata.key)?.inputValue == true}
                                                    onchange={(e: Event) => handleMetadataChange(metadata.key, (e.target as HTMLInputElement).checked)}
                                                />
                                                <span class="toggle-track"></span>
                                            </label>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <div class="results-section">
        
                <!-- Action Buttons -->
                <div class="actions">
                    <button
                        class="find-btn"
                        onclick={findProducts}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Searching...' : 'Find Products'}
                    </button>
                </div>

                {#if hasSearched}
                    <div class="results-header">
                        <h3>Search Results</h3>
                        <span class="results-count">
                            {searchResults.length} product{searchResults.length === 1
                                ? ''
                                : 's'} found
                        </span>
                    </div>

                    {#if searchResults.length > 0}
                        <div class="results-grid">
                            {#each searchResults as product (product.id)}
                                <div class="product-card">
                                    <div class="product-header">
                                        <h3 class="product-name">{product.name}</h3>
                                    </div>

                                    {#if product.latest_price}
                                        <div class="price-section">
                                            <div class="current-price">
                                                <span>
                                                    {formatPrice(product.latest_price)}
                                                </span>

                                                {#if product.is_available}
                                                    <span
                                                        class="availability-badge available"
                                                        >Available</span
                                                    >
                                                {:else}
                                                    <span
                                                        class="availability-badge unavailable"
                                                        >Out of Stock</span
                                                    >
                                                {/if}
                                            </div>
                                            
                                        </div>
                                    {:else}
                                        <div class="price-section">
                                            <div class="no-price">
                                                Price not available
                                            </div>
                                        </div>
                                    {/if}

                                    {#if product.parsed_metadata && Object.keys(product.parsed_metadata).length > 0}
                                        <div class="metadata-section">
                                            <h4 class="metadata-title">
                                                Specifications
                                            </h4>
                                            <div class="metadata-pills">
                                                {#each metadataFilters as filter (filter.key)}
                                                    {#if product.parsed_metadata[filter.key]}
                                                        <Pill
                                                            label={filter.display_text}
                                                            value={`${product.parsed_metadata[filter.key]}${filter.unit ? ` ${filter.unit}` : ''}`}
                                                        />
                                                    {/if}
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}

                                    <div class="product-actions">
                                        <a
                                            href="/products/{product.product_id}"
                                            onclick={() =>
                                                goto(
                                                    `/products/${product.product_id}`,
                                                    {
                                                        state: {
                                                            highlight_external_product_id:
                                                                product.id,
                                                        },
                                                    },
                                                )}
                                            class="view-details-btn"
                                        >
                                            View Details
                                        </a>
                                        {#if product.url}
                                            <a
                                                href={linkWithUtmSource(product.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="external-link-btn"
                                            >
                                                Buy Now →
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="no-results">
                            <div class="no-results-icon">🔍</div>
                            <h3>No products found</h3>
                            <p>Try adjusting your filters to find more products.</p>
                        </div>
                    {/if}
                {/if}
            </div>
        </main>
    </div>
    </div>

<style>
    .configurator-container {
        max-width: 64rem;
        margin: 0 auto;
        padding: 0 1rem;
    }

    .header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .header p {
        font-size: 1.125rem;
        color: #6b7280;
        margin: 0;
    }

    /* Layout: sidebar + main */
    .main-layout {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 1rem;
        align-items: start;
    }

    .filters-sidebar {
        display: block;
    }

    .filters-sidebar-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
        position: sticky;
        top: 0.75rem;
    }

    .filters-sidebar-header h3 {
        margin: 0 0 0.75rem 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #374151;
    }

    .filters-sidebar-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .sidebar-filter {
        padding: 0.5rem 0.25rem;
        border-bottom: 1px dashed #e5e7eb;
    }

    .sidebar-filter:last-child {
        border-bottom: none;
    }

    /* Ensure controls fit within sidebar width */
    .filters-sidebar-content :global(.filter-control),
    .filters-sidebar-content :global(.filter-chip) {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box;
        flex: 0 1 auto;
    }

    /* Move component labels out of the inline chips in the sidebar */
    .filters-sidebar-content :global(.filter-chip .label) {
        display: none;
    }
    .filters-sidebar-content :global(.filter-control .select-label) {
        display: none;
    }

    .sidebar-filter-label {
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.375rem;
        font-size: 0.9rem;
    }

    /* (legacy) mobile inline additional filters removed */

    /* Mobile additional filters toggle */
    .mobile-filters {
        display: none;
        margin-top: 0.75rem;
    }

    .mobile-filters-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: white;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .mobile-filters-toggle:hover {
        border-color: #2563eb;
        color: #2563eb;
        background: #f8fafc;
    }

    /* Mobile drawer overlay */
    .mobile-filters-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
    }

    .mobile-filters-drawer {
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 80vw;
        max-width: 340px;
        background: white;
        box-shadow: 2px 0 12px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
    }

    .mobile-filters-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .mobile-filters-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .mobile-filters-close {
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
    }

    .mobile-filters-content {
        padding: 0.75rem 1rem 1rem;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .drawer-filter {
        padding: 0.5rem 0.25rem;
        border-bottom: 1px dashed #e5e7eb;
    }

    .drawer-filter:last-child { border-bottom: none; }

    .drawer-filter-label {
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.375rem;
        font-size: 0.9rem;
    }

    .mobile-filters-content :global(.filter-control),
    .mobile-filters-content :global(.filter-chip) {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box;
        flex: 0 1 auto;
    }

    .mobile-filters-content :global(.filter-chip .label),
    .mobile-filters-content :global(.filter-control .select-label) {
        display: none;
    }

    .filter-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        flex-wrap: wrap;
    }

    .filter-item-bar {
        position: relative;
    }

    /* Removed legacy Add Filter button and dropdown styles */

    /* removed old add-filter item styles */

    /* removed optional-filters inline chips UI */

    /* Removed legacy dropdown overrides */

    .toggle-wrapper {
        padding: 0.5rem 0;
    }

    .toggle-switch {
        position: relative;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
    }

    .toggle-switch input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-track {
        display: inline-block;
        width: 2.5rem;
        height: 1.25rem;
        background: #e5e7eb;
        border-radius: 9999px;
        transition: background 0.2s ease;
        position: relative;
    }

    .toggle-track::after {
        content: "";
        position: absolute;
        top: 0.125rem;
        left: 0.125rem;
        width: 1rem;
        height: 1rem;
        border-radius: 9999px;
        background: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease;
    }

    .toggle-switch input:checked + .toggle-track {
        background: #2563eb;
    }

    .toggle-switch input:checked + .toggle-track::after {
        transform: translateX(1.25rem);
    }

    .toggle-switch input:focus-visible + .toggle-track {
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);
    }

    .results-section {
        margin-top: 2rem;
    }

    /* Checkbox styling */
    /* toggle replaces previous checkbox styling */

    .actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    .find-btn {
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .find-btn {
        background-color: #2563eb;
        color: white;
        min-width: 140px;
    }

    .find-btn:hover:not(:disabled) {
        background-color: #1d4ed8;
    }

    .find-btn:disabled {
        background-color: #93c5fd;
        cursor: not-allowed;
    }

    /* Results Section Styling */
    .results-section {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
        margin-top: 2rem;
    }

    .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        margin-top: 1rem;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    /* Heading is h3 in markup */

    .results-count {
        font-size: 0.875rem;
        color: #6b7280;
        background-color: #f3f4f6;
        padding: 0.5rem 1rem;
        border-radius: 6px;
    }

    .results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
    }

    .product-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1.5rem;
        background: #fafafa;
        transition: all 0.2s;
    }

    .product-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-color: #d1d5db;
    }

    .product-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        gap: 1rem;
    }

    .product-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
        line-height: 1.4;
        flex: 1;
    }

    .price-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .current-price {
        font-size: 1.25rem;
        font-weight: 700;
        color: #059669;
        display: flex;
        align-items: center;
    }

    .no-price {
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
    }

    .availability-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-weight: 500;
        margin-left: 0.5rem;
    }

    .availability-badge.available {
        background-color: #d1fae5;
        color: #065f46;
    }

    .availability-badge.unavailable {
        background-color: #fee2e2;
        color: #991b1b;
    }

    .metadata-section {
        margin-bottom: 1rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 0.75rem;
    }

    .metadata-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
    }

    .metadata-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .product-actions {
        display: flex;
        gap: 0.75rem;
    }

    .view-details-btn,
    .external-link-btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s;
        flex: 1;
        text-align: center;
    }

    .view-details-btn {
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }

    .view-details-btn:hover {
        background-color: #e5e7eb;
        border-color: #9ca3af;
    }

    .external-link-btn {
        background-color: #2563eb;
        color: white;
    }

    .external-link-btn:hover {
        background-color: #1d4ed8;
    }

    .no-results {
        text-align: center;
        padding: 3rem 1rem;
        color: #6b7280;
    }

    .no-results-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .no-results h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .no-results p {
        font-size: 0.875rem;
        margin: 0;
    }

    @media (max-width: 1024px) {
        .configurator-container {
            padding: 0 0.5rem;
        }

        .main-layout {
            display: block;
        }

        .filters-sidebar {
            display: none;
        }

        .mobile-filters { display: block; }

        .filter-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1rem;
        }

        .filter-item-bar {
            width: 100%;
        }

        /* remove legacy dropdown adjustments */
    }

    .actions {
        flex-direction: column;
        align-items: stretch;
    }

    .find-btn {
        width: 100%;
    }

    .results-grid {
        grid-template-columns: 1fr;
    }

    .product-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .price-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .product-actions {
        flex-direction: column;
    }

    /* legacy dropdown container removed */
</style>
