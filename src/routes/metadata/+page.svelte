<script lang="ts">
    import { onMount } from "svelte";
    import { fetchMetadatas } from "$lib/api/metadata.js";
    import { fetchCategories, type Category } from "$lib/api/products";
    import Table from "$lib/components/Table.svelte";
    import { goto } from "$app/navigation";

    let metadatas: string[] = $state([]);
    let filteredMetadatas: string[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let searchQuery = $state("");

    // New state for filters
    let categories: Category[] = $state([]);
    let selectedCategory: string = $state("");
    
    // Update website type
    interface Website {
        id: string;
        name: string;
    }
    let websites: Website[] = $state([]);
    let selectedWebsite: string = $state("");

    $effect(() => {
        filteredMetadatas = metadatas.filter(metadata => 
            metadata.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    async function loadMetadata() {
        try {
            metadatas = await fetchMetadatas({
                category_id: selectedCategory || undefined,
                website_id: selectedWebsite || undefined
            });
            loading = false;
        } catch (e) {
            console.error("Error fetching metadata:", e);
            error = e instanceof Error ? e.message : "An error occurred";
            loading = false;
        }
    }

    $effect(() => {
        loadMetadata();
    });

    onMount(async () => {
        try {
            // Load categories
            categories = await fetchCategories();
            
            // Load websites (assuming you have this endpoint)
            const response = await fetch('/api/websites');
            websites = await response.json();
        } catch (e) {
            console.error("Error fetching filters:", e);
            error = e instanceof Error ? e.message : "An error occurred";
        }
    });

    function handleRowClick(row: { name: string }) {
        goto(`/metadata/${encodeURIComponent(row.name)}`);
    }
</script>

<div class="metadata-container">
    <h1>Product Metadata</h1>

    <div class="filters">
        <div class="search-container">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search metadata..."
                class="search-input"
            />
        </div>

        <div class="select-container">
            <select bind:value={selectedCategory} class="filter-select">
                <option value="">All Categories</option>
                {#each categories as category}
                    <option value={category.id}>{category.name}</option>
                {/each}
            </select>

            <select bind:value={selectedWebsite} class="filter-select">
                <option value="">All Websites</option>
                {#each websites as website}
                    <option value={website.id}>{website.name}</option>
                {/each}
            </select>
        </div>
    </div>

    {#if loading}
        <p>Loading metadata...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else if metadatas.length === 0}
        <p>No metadata available</p>
    {:else}
        <Table
            headers={["Metadata Name", "Count"]}
            keys={["name", "count"]}
            rows={filteredMetadatas.map(metadata => ({
                name: metadata,
                count: 1
            }))}
            on:rowClick={e => handleRowClick(e.detail)}
        />
    {/if}
</div>

<style>
    .metadata-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    h1 {
        margin-bottom: 2rem;
        color: #1f2937;
    }

    .filters {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .select-container {
        display: flex;
        gap: 1rem;
    }

    .filter-select {
        padding: 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        min-width: 200px;
    }

    .filter-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-container {
        margin-bottom: 0;
    }

    .search-input {
        width: 100%;
        max-width: 400px;
        padding: 0.75rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .error {
        color: #ef4444;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 4px;
    }
</style>