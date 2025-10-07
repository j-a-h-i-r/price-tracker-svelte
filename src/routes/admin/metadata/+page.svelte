<script lang="ts">
    import { fetchMetadatas } from '$lib/api/metadata.js';
    import Table from '$lib/components/Table.svelte';
    import { goto } from '$app/navigation';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';

    const { data } = $props();

    let categories = data.categories;
    let websites = data.websites;

    let metadatas: {metadata: string; count: number}[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let searchQuery = $state('');

    // New state for filters
    let selectedCategory: string = $state('all');
    let selectedWebsite: string = $state('all');

    let filteredMetadatas = $derived(
        metadatas.filter(({metadata}) => 
            metadata.toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    async function loadMetadata() {
        const metadataResp = await fetchMetadatas({
                category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
                website_id: selectedWebsite !== 'all' ? selectedWebsite : undefined
            })
        if (metadataResp.isOk()) {
            metadatas = metadataResp.value;
            loading = false;
        } else {
            loading = false;
            error = metadataResp.error.message ?? 'An error occured';
        }
    }

    $effect(() => {
        loadMetadata();
    });

    function handleRowClick(row: { name: string }) {
        goto(`metadata/${encodeURIComponent(row.name)}`);
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
            <SearchableSelect
                allLabel="All Categories" label="Category"
                options={categories.map(category => ({ id: category.id, name: category.name }))}
                bind:value={selectedCategory}
            />

            <SearchableSelect
                allLabel="All Websites" label="Website"
                options={websites.map(website => ({ id: website.id, name: website.name }))}
                bind:value={selectedWebsite}
            />
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
            headers={['Metadata Name', 'Count']}
            keys={['name', 'count']}
            rows={filteredMetadatas.map(metadata => ({
                name: metadata.metadata,
                count: metadata.count
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