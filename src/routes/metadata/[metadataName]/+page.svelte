<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { fetchMetadataDetail } from "$lib/api/metadata";
    import { fetchCategories, type Category } from "$lib/api/products";
    import type { MetadataDetail } from "$lib/types/Metadata";
    import Table from "$lib/components/Table.svelte";
    import { goto } from "$app/navigation";

    let { metadataName } = page.params;
    let metadataDetails: MetadataDetail[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let searchPattern = $state('');
    let matchCount = $state(0);
    let showNonMatching = $state(false);
    let categories: Category[] = $state([]);
    let selectedCategory = $state('');
    
    $effect(() => {
        if (metadataDetails.length > 0) {
            try {
                const regex = new RegExp(searchPattern);
                matchCount = metadataDetails.filter(metadata => 
                    regex.test(metadata.metadata[metadataName]?.toString() || '')
                ).length;
            } catch (e) {
                // Invalid regex pattern, don't update match count
            }
        }
    });

    async function loadData() {
        try {
            loading = true;
            metadataDetails = await fetchMetadataDetail(metadataName, selectedCategory || undefined);
            loading = false;
        } catch (e) {
            console.error("Error fetching metadata detail:", e);
            error = e instanceof Error ? e.message : "An error occurred";
            loading = false;
        }
    }

    onMount(async () => {
        try {
            // Load categories first
            categories = await fetchCategories();
            await loadData();
        } catch (e) {
            console.error("Error:", e);
            error = e instanceof Error ? e.message : "An error occurred";
            loading = false;
        }
    });

    $effect(() => {
        if (selectedCategory !== undefined) {
            loadData();
        }
    });

    function handleRowClick(event: CustomEvent<{ product_id: string }>) {
        console.log("Row clicked:", event);
        goto(`/products/${event.detail.product_id}`);
    }

    function getFilteredRows() {
        if (!searchPattern) return metadataDetails;
        try {
            const regex = new RegExp(searchPattern);
            return metadataDetails.filter(metadata => {
                const value = metadata.metadata[metadataName]?.toString() || '';
                const matches = regex.test(value);
                console.log("Matches:", value.match(regex));
                return showNonMatching ? !matches : matches;
            });
        } catch (e) {
            console.error("Invalid regex pattern:", e);
            return metadataDetails;
        }
    }
</script>

<div class="metadata-detail-container">
    {#if loading}
        <p>Loading metadata details...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else if metadataDetails}
        <div class="header">
            <h1>{metadataName}</h1>
            <div class="search-container">
                <div class="filters">
                    <input
                        type="text"
                        bind:value={searchPattern}
                        placeholder="Enter regex pattern..."
                        class="search-input"
                    />
                    <select 
                        bind:value={selectedCategory}
                        class="category-select"
                    >
                        <option value="">All Categories</option>
                        {#each categories as category}
                            <option value={category.id}>{category.name}</option>
                        {/each}
                    </select>
                </div>
                <div class="search-options">
                    <label>
                        <input type="checkbox" bind:checked={showNonMatching}>
                        Show non-matching
                    </label>
                    {#if searchPattern}
                        <p class="match-count">Matching values: {matchCount} of {metadataDetails.length}</p>
                    {/if}
                </div>
            </div>
            <Table 
                headers={["Name", "Product", "Category"]}
                keys={["name", "product", "category"]}
                rows={getFilteredRows().map(metadata => ({
                    name: metadata.metadata[metadataName],
                    product: metadata.name,
                    category: metadata.category_id,
                    product_id: metadata.internal_product_id,
                }))}
                highlightPattern={searchPattern}
                on:rowClick={handleRowClick}
            />
        </div>
    {:else}
        <p>No metadata found</p>
    {/if}
</div>

<style>
    .metadata-detail-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    h1 {
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .stats {
        color: #6b7280;
        font-size: 1.1rem;
    }

    .values-section {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    h2 {
        color: #374151;
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    .value-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .value-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .value-header h3 {
        color: #1f2937;
        font-size: 1.25rem;
        margin: 0;
    }

    .count {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .error {
        color: #ef4444;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 4px;
    }

    .search-container {
        margin: 1rem 0;
    }

    .filters {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }

    .category-select {
        padding: 0.5rem;
        font-size: 1rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        min-width: 200px;
    }

    .search-input {
        flex: 1;
        width: auto;
        margin-bottom: 0;
    }

    .match-count {
        color: #6b7280;
        font-size: 0.9rem;
        margin: 0.5rem 0;
    }
</style>