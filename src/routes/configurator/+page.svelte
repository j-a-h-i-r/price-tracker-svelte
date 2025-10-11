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
    let isFilterMenuOpen = $state(false);

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

    function handleMetadataChange(metadataKey: string, value: MetadataValueType) {
        const currentFilter = selectedFilters.get(metadataKey);
        if (!currentFilter) return;
        if (typeof value === 'object' && Object.keys(value).length > 0) {
            selectedFilters.set(metadataKey, {
                ...currentFilter,
                inputValue: {
                    min: currentFilter.inputValue?.min,
                    max: currentFilter.inputValue?.max,
                    ...value,
                }
            })
        } else {
            selectedFilters.set(metadataKey, {
                ...currentFilter,
                inputValue: value,
            })
        }
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (
            !target.closest('.add-filter-btn') &&
            !target.closest('.filter-menu')
        ) {
            isFilterMenuOpen = false;
        }
    }

    async function findProducts() {
        isLoading = true;
        const metadataFilters: Record<string, any> = {};
        selectedFilters.entries().forEach(([key, filter]) => {
            metadataFilters[key] = filter.inputValue;
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

    function addFilter(metadata: MetadataFilter) {
        const defaultInputValue = metadata.type === 'range' 
            ? { min: metadata.value.min, max: metadata.value.max }
            : metadata.type === 'boolean' ? false : 'all'
        const metadataWithValue = {
            inputValue: defaultInputValue,
            ...metadata, // Existing inputValue takes precedence
        };
        selectedFilters.set(metadata.key, metadataWithValue);
    }

    function removeFilter(metadata: MetadataFilter) {
        selectedFilters.delete(metadata.key);
    }

    function isValueSet(value: unknown) {
        return value !== undefined && value !== null && value !== '';
    }
</script>

<svelte:window onmousedown={handleClickOutside} />

<div class="configurator-container">
    <div class="header">
        <p>Find the perfect product by configuring your preferences</p>
    </div>

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

        <div class="optional-filters">
            {#each selectedFilters.entries() as [key, metadata] (key) }
                <div class="optional-filter-item">
                    <div class="filter-component">
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
                                    () => selectedFilters.get(metadata.key)?.inputValue?.min,
                                    (val) => handleMetadataChange(metadata.key, {min: val})
                                }
                                bind:maxValue={
                                    () => selectedFilters.get(metadata.key)?.inputValue?.max,
                                    (val) => handleMetadataChange(metadata.key, {max: val})
                                }
                                unit={metadata.unit || ''}
                            />
                        {:else if metadata.type === 'boolean'}
                            <div class="checkbox-container">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedFilters.get(metadata.key)?.inputValue == true}
                                        onchange={(e: Event) => handleMetadataChange(metadata.key, (e.target as HTMLInputElement).checked)}
                                    />
                                    <span class="checkbox-text">{metadata.display_text}</span>
                                </label>
                            </div>
                        {/if}
                    </div>

                    <button
                        class="remove-filter-btn"
                        onclick={() => removeFilter(metadata)}
                        title="Remove {metadata.display_text} filter"
                        aria-label="Remove {metadata.display_text} filter"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            {/each}
        </div>

        <!-- Add Filter Button -->
        <div class="filter-menu-container">
            <button
                class="add-filter-btn"
                onclick={() => (isFilterMenuOpen = !isFilterMenuOpen)}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M12 5v14m7-7H5" />
                </svg>
                Add Filter
            </button>

            <!-- Filter Menu Dropdown -->
            {#if isFilterMenuOpen}
                <div class="filter-menu">
                    <h3>Add Filter</h3>
                    <div class="filter-menu-items">
                        {#each metadataFilters as metadata (metadata.key)}
                            {#if !selectedFilters.has(metadata.key)}
                                <div class="filter-add-item">
                                    <span class="filter-add-name">
                                        {metadata.display_text}
                                    </span>
                                    <button class="filter-add-btn"
                                        onclick={() => addFilter(metadata)}
                                        aria-label="Add {metadata.display_text} filter"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 5v14m7-7H5"/>
                                        </svg>
                                    </button>
                                </div>    
                            {/if}
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>

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

    .filter-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: var(--color-bg-primary);
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        flex-wrap: wrap;
    }

    .filter-item-bar {
        position: relative;
    }

    .add-filter-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: var(--color-bg-primary);
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
    }

    .add-filter-btn:hover {
        border-color: #2563eb;
        color: #2563eb;
        background: #f8fafc;
    }

    .filter-menu {
        position: absolute;
        margin-top: 0.5rem;
        background: var(--color-bg-primary);
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 50;
        min-width: max-content;
        max-width: 400px;
        padding: 1rem;
        max-height: 60vh;
        overflow-y: auto;
    }

    .filter-menu h3 {
        margin: 0 0 1rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }

    .filter-menu-items {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .filter-add-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--color-bg-primary);
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        transition: all 0.15s ease;
        cursor: pointer;
    }

    .filter-add-item:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .filter-add-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        flex: 1;
    }

    .filter-add-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: var(--color-bg-primary);
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
    }

    .filter-add-btn:hover {
        background: #2563eb;
        border-color: #2563eb;
        color: white;
        transform: scale(1.05);
    }

    .filter-add-btn svg {
        width: 12px;
        height: 12px;
    }

    .optional-filters {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .optional-filter-item {
        display: flex;
        align-items: center;
        transition: all 0.15s ease;
        position: relative;
    }

    .optional-filter-item:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .filter-component {
        flex: 1;
        min-width: 0;
    }

    .remove-filter-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        background: white;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
        margin-left: 0.25rem;
    }

    .remove-filter-btn:hover {
        background: #dc2626;
        border-color: #dc2626;
        color: white;
        transform: scale(1.05);
    }

    .remove-filter-btn svg {
        width: 12px;
        height: 12px;
    }

    /* Override component styles in optional filters */
    .optional-filters :global(.filter-control),
    .optional-filters :global(.filter-chip) {
        min-width: 120px !important;
    }

    .optional-filters :global(.select-dropdown) {
        min-width: 120px !important;
    }

    .optional-filters .checkbox-container {
        padding: 0.25rem 0.5rem;
        margin: 0;
    }

    .optional-filters .checkbox-label {
        margin: 0;
        font-size: 0.8125rem;
    }

    /* Override component styles in filter menu */
    .filter-menu :global(.filter-control),
    .filter-menu :global(.filter-chip) {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        flex: 1 !important;
    }

    .filter-menu :global(.select-dropdown) {
        left: 0 !important;
        right: 0 !important;
        min-width: 0 !important;
    }

    .checkbox-container {
        padding: 0.5rem 0;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }

    .checkbox-text {
        font-size: 0.875rem;
        color: #374151;
        font-weight: 500;
    }

    .results-section {
        margin-top: 2rem;
    }

    /* Checkbox styling */
    .checkbox-container {
        display: flex;
        align-items: center;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        color: #374151;
        margin: 0;
    }

    .checkbox-label input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        background-color: var(--color-bg-primary);
        cursor: pointer;
        position: relative;
        margin: 0;
        flex-shrink: 0;
    }

    .checkbox-label input[type="checkbox"]:checked {
        background-color: #2563eb;
        border-color: #2563eb;
    }

    .checkbox-label input[type="checkbox"]:checked::after {
        content: "✓";
        position: absolute;
        top: -2px;
        left: 2px;
        color: white;
        font-size: 0.75rem;
        font-weight: bold;
    }

    .checkbox-label input[type="checkbox"]:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    .checkbox-text {
        user-select: none;
    }

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
        background: var(--color-bg-primary);
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

    .results-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
    }

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
        background: var(--color-bg-primary);
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
        color: var(--color-text-primary);
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
        background-color: var(--color-bg-primary);
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

    @media (max-width: 768px) {
        .configurator-container {
            padding: 0 0.5rem;
        }

        .filter-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1rem;
        }

        .filter-item-bar {
            width: 100%;
        }

        .add-filter-btn {
            width: 100%;
            justify-content: center;
        }

        .filter-menu {
            right: 0;
            left: 0;
            min-width: auto;
        }
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

    .filter-menu-container {
        position: relative;
        margin-left: auto;
        align-self: baseline;
    }
</style>
