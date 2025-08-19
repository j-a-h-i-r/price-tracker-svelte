<script lang="ts">
    import { onMount } from 'svelte';
    import { getManufacturers } from '$lib/api/manufacturers.js';
    import type { Manufacturer } from '$lib/types/Manufacturer.js';
    import type { MetadataFilter } from '$lib/types/Metadata.js';
    import type { Category } from '$lib/api/products.js';
    import { goto } from '$app/navigation';
    import type { Snapshot } from '../$types.js';
    import { formatPrice } from '$lib/util.js';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import RangeInput from '$lib/components/RangeInput.svelte';
    
    let manufacturers: Manufacturer[] = $state([]);
    let categories: Category[] = $state([]);
    let metadataFilters: MetadataFilter[] = $state([]);
    
    // Filter states
    let selectedBrandId = $state('all');
    let selectedCategoryId = $state('all');
    let minPrice = $state(0);
    let maxPrice = $state(0);
    let selectedMetadata: Record<string, any> = $state({});
    let metadataRanges: Record<string, {min: number, max: number}> = $state({});
    let isLoading = $state(false);
    let searchResults: any[] = $state([]);
    let hasSearched = $state(false);

    export const snapshot: Snapshot<string> = {
		capture: () => JSON.stringify({
            selectedBrandId, selectedCategoryId, minPrice, maxPrice,
            selectedMetadata, metadataRanges,
        }),
		restore: (value) => {
            const data = JSON.parse(value);
            selectedBrandId = data.selectedBrandId || '';
            selectedCategoryId = data.selectedCategoryId || '';
            minPrice = data.minPrice || '';
            maxPrice = data.maxPrice || '';
            selectedMetadata = data.selectedMetadata || {};
            metadataRanges = data.metadataRanges || {};
        }
	};
    
    onMount(async () => {
        try {
            // Fetch manufacturers
            manufacturers = await getManufacturers();
            
            // Fetch categories
            const categoriesResponse = await fetch('/api/categories');
            if (categoriesResponse.ok) {
                categories = await categoriesResponse.json();
            }
            
            // Fetch metadata filters
            const metadataResponse = await fetch('/api/filters');
            if (metadataResponse.ok) {
                metadataFilters = await metadataResponse.json();
            }
        } catch (error) {
            console.error('Error fetching configurator data:', error);
        }
    });
    
    function handleMetadataChange(metadataName: string, value: any) {
        if (value === '' || value === false) {
            delete selectedMetadata[metadataName];
            selectedMetadata = { ...selectedMetadata };
        } else {
            selectedMetadata = { ...selectedMetadata, [metadataName]: value };
        }
    }

    function handleRangeChange(metadataName: string, type: 'min' | 'max', value: number) {
        if (!metadataRanges[metadataName]) {
            metadataRanges[metadataName] = { min: 0, max: 0 };
        }
        metadataRanges[metadataName][type] = value;
        metadataRanges = { ...metadataRanges };
        
        // Update selectedMetadata with range string
        const range = metadataRanges[metadataName];
        if (range.min || range.max) {
            selectedMetadata[metadataName] = {};
            if (range.min) {
                selectedMetadata[metadataName].min = range.min;
            }
            if (range.max) {
                selectedMetadata[metadataName].max = range.max;
            }
        } else {
            delete selectedMetadata[metadataName];
        }
        selectedMetadata = { ...selectedMetadata };
    }
    
    function clearFilters() {
        selectedBrandId = '';
        selectedCategoryId = '';
        minPrice = 0;
        maxPrice = 0;
        selectedMetadata = {};
        metadataRanges = {};
    }
    
    async function findProducts() {
        isLoading = true;
        
        const params = new URLSearchParams();
        
        if (selectedBrandId && selectedBrandId !== 'all') params.append('manufacturer_id', selectedBrandId);
        if (selectedCategoryId && selectedCategoryId !== 'all') params.append('category_id', selectedCategoryId);
        if (minPrice) params.append('price[gt]', `${minPrice}`);
        if (maxPrice) params.append('price[lt]', `${maxPrice}`);
        
        // Add metadata filters
        console.log('Selected Metadata:', $state.snapshot(selectedMetadata));
        Object.entries(selectedMetadata).forEach(([key, value]) => {
            if (value.min || value.max) {
                if (value.min) {
                    params.append(`metadata[${key}][gt]`, value.min);
                }
                if (value.max) {
                    params.append(`metadata[${key}][lt]`, value.max);
                }
            } else if (value && value !== 'all') {
                params.append(`metadata[${key}]`, value);
            }
        });

        console.log('Search Parameters:', Array.from(params.entries()));
        
        try {
            // Navigate to products page with filters
            // goto(`/products?${params.toString()}`);
            const resp = await fetch(`/api/externals?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) {
                throw new Error(`Failed to fetch products: ${resp.statusText}`);
            }
            const products = await resp.json();
            console.log('Products found:', products);
            searchResults = products;
            hasSearched = true;
        } catch (error) {
            console.error('Error finding products:', error);
            searchResults = [];
            hasSearched = true;
        } finally {
            isLoading = false;
        }
    }
    
    let hasFilters = $derived(selectedBrandId || selectedCategoryId || minPrice || maxPrice || Object.keys(selectedMetadata).length > 0);
</script>

<div class="configurator-container">
    <div class="header">
        <h1>Product Configurator</h1>
        <p>Find the perfect product by configuring your preferences</p>
    </div>
    
    <div class="configurator-content">
        <!-- Basic Filters Group -->
        <div class="filter-group">
            <h2>Basic Filters</h2>
            <div class="filters-grid">
                <!-- Brand Filter -->
                <div class="filter-item">
                    <SearchableSelect
                        label="Brand"
                        allLabel="All Brands"
                        bind:value={selectedBrandId}
                        options={manufacturers.map(m => ({ id: m.id, name: m.name }))}
                    />
                </div>
                
                <!-- Category Filter -->
                <div class="filter-item">
                    <SearchableSelect
                        label="Category"
                        allLabel="All Categories"
                        bind:value={selectedCategoryId}
                        options={categories.map(m => ({ id: m.id, name: m.name }))}
                    />
                </div>
                
                <!-- Price Range -->
                <div class="filter-item">
                    <RangeInput
                        label="Price Range"
                        minAllowed={0}
                        maxAllowed={+Infinity}
                        bind:minValue={minPrice}
                        bind:maxValue={maxPrice}
                    />
                </div>
            </div>
        </div>
        
        <!-- Metadata Filters Group -->
        {#if metadataFilters.length > 0}
            <div class="filter-group">
                <h2>Specifications</h2>
                <div class="filters-grid">
                    {#each metadataFilters as metadata (metadata.key)}
                        <div class="filter-item">
                            {#if metadata.type === 'set'}
                                <SearchableSelect
                                    label={metadata.display_text}
                                    allLabel={`All ${metadata.display_text}`}
                                    bind:value={
                                        () => selectedMetadata[metadata.key] || 'all',
                                        (value) => handleMetadataChange(metadata.key, value)
                                    }
                                    options={metadata.value.map(m => ({ id: m, name: m }))}
                                />
                                
                            {:else if metadata.type === 'range'}
                                <!-- Range inputs for range type -->
                                <RangeInput
                                    label={metadata.display_text}
                                    minAllowed={metadata.value.min}
                                    maxAllowed={metadata.value.max}
                                    bind:minValue={
                                        () => metadataRanges[metadata.key]?.min ?? metadata.value.min,
                                        (value) => handleRangeChange(metadata.key, 'min', value)
                                    }
                                    bind:maxValue={
                                        () => metadataRanges[metadata.key]?.max ?? metadata.value.max,
                                        (value) => handleRangeChange(metadata.key, 'max', value)
                                    }
                                    unit={metadata.unit || ''}
                                />
                            {:else if metadata.type === 'boolean'}
                                <!-- Checkbox for boolean type -->
                                <div class="checkbox-container">
                                    <label class="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedMetadata[metadata.key] || false}
                                            onchange={(e: Event) => handleMetadataChange(metadata.key, (e.target as HTMLInputElement).checked)}
                                        />
                                        <span class="checkbox-text">{metadata.display_text}</span>
                                    </label>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        
        <!-- Action Buttons -->
        <div class="actions">
            <button 
                class="clear-btn" 
                onclick={clearFilters}
                disabled={!hasFilters}
            >
                Clear All Filters
            </button>
            <button 
                class="find-btn" 
                onclick={findProducts}
                disabled={isLoading}
            >
                {isLoading ? 'Searching...' : 'Find Products'}
            </button>
        </div>
        
        <!-- Search Results -->
        {#if hasSearched}
            <div class="results-section">
                <div class="results-header">
                    <h2>Search Results</h2>
                    <span class="results-count">
                        {searchResults.length} product{searchResults.length === 1 ? '' : 's'} found
                    </span>
                </div>
                
                {#if searchResults.length > 0}
                    <div class="results-grid">
                        {#each searchResults as product (product.id)}
                            <div class="product-card">
                                <div class="product-header">
                                    <h3 class="product-name">{product.name}</h3>
                                    {#if product.manufacturer_name}
                                        <span class="manufacturer-badge">{product.manufacturer_name}</span>
                                    {/if}
                                </div>
                                
                                {#if product.latest_price}
                                    <div class="price-section">
                                        <div class="current-price">
                                            {formatPrice(product.latest_price)}
                                        </div>
                                        {#if product.is_available}
                                            <span class="availability-badge available">Available</span>
                                        {:else}
                                            <span class="availability-badge unavailable">Out of Stock</span>
                                        {/if}
                                    </div>
                                {:else}
                                    <div class="price-section">
                                        <div class="no-price">Price not available</div>
                                    </div>
                                {/if}
                                
                                {#if product.metadata && Object.keys(product.metadata).length > 0}
                                    <div class="metadata-section">
                                        <div class="metadata-items">
                                            {#each Object.entries(product.metadata) as [key, value], idx (idx)}
                                                <div class="metadata-item">
                                                    <span class="metadata-key">{key.replace(/_/g, ' ')}</span>
                                                    <span class="metadata-value">{value}</span>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                
                                <div class="product-actions">
                                    <a href="/products/{product.product_id}"
                                        onclick={() => goto(`/products/${product.product_id}`, {state: { highlight_external_product_id: product.id }})}
                                        class="view-details-btn"
                                    >
                                        View Details
                                    </a>
                                    {#if product.url}
                                        <a href={product.url} target="_blank" rel="noopener noreferrer" class="external-link-btn">
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
            </div>
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
        margin-bottom: 1rem;
    }
    
    .header h1 {
        font-size: 2.5rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 0.5rem;
    }
    
    .header p {
        font-size: 1.125rem;
        color: #6b7280;
        margin: 0;
    }
    
    .configurator-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    
    .filter-group {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        border: 1px solid #e5e7eb;
    }
    
    .filter-group h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
    }
    
    .filters-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
    }
    
    .filter-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .filter-item label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }
    
    .filter-item select,
    .filter-item input {
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.875rem;
        color: #374151;
        background-color: white;
        transition: all 0.2s;
    }
    
    .filter-item select:focus,
    .filter-item input:focus {
        outline: none;
        border-color: #2563eb;
    }
    
    .filter-item select:hover,
    .filter-item input:hover {
        border-color: #9ca3af;
    }
    
    /* Range input styling */
    .range-inputs {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .range-input {
        display: flex;
        align-items: center;
        flex: 1;
        position: relative;
    }
    
    .range-input input {
        flex: 1;
        padding-right: 2.5rem;
    }
    
    .range-input .unit {
        position: absolute;
        right: 0.75rem;
        font-size: 0.75rem;
        color: #6b7280;
        pointer-events: none;
    }
    
    .range-separator {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
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
        background-color: white;
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
        content: '✓';
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
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid #e5e7eb;
    }
    
    .clear-btn,
    .find-btn {
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }
    
    .clear-btn {
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }
    
    .clear-btn:hover:not(:disabled) {
        background-color: #e5e7eb;
        border-color: #9ca3af;
    }
    
    .clear-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
    
    .manufacturer-badge {
        background-color: #2563eb;
        color: white;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        white-space: nowrap;
        flex-shrink: 0;
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
    }
    
    .metadata-items {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .metadata-item {
        background-color: #f3f4f6;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }
    
    .metadata-key {
        color: #6b7280;
        text-transform: capitalize;
    }
    
    .metadata-value {
        color: #374151;
        font-weight: 500;
        margin-left: 0.25rem;
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
    
    @media (max-width: 768px) {
        .configurator-container {
            padding: 0 0.5rem;
        }
        
        .header h1 {
            font-size: 2rem;
        }
        
        .filter-group {
            padding: 1.5rem;
        }
        
        .filters-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
        }
        
        .actions {
            flex-direction: column;
            align-items: stretch;
        }
        
        .clear-btn,
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
        
        .manufacturer-badge {
            align-self: flex-start;
        }
        
        .price-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }
        
        .product-actions {
            flex-direction: column;
        }
    }
</style>
