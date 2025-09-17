<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { fetchMetadataDetail } from '$lib/api/metadata';
    import { fetchCategories, type Category } from '$lib/api/products';
    import type { MetadataDetail } from '$lib/types/Metadata';
    import Table from '$lib/components/Table.svelte';
    import { goto } from '$app/navigation';
    import { Chart } from 'chart.js/auto';
    import { arrayToPerIdMap } from '$lib/util.js';

    let { metadataName } = page.params;
    let metadataDetails: MetadataDetail[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let searchPattern = $state('');
    let matchCount = $state(0);
    let showNonMatching = $state(false);
    let categories: Category[] = $state([]);
    let categoryMap = $derived(arrayToPerIdMap<Category>(categories))
    let selectedCategory = $state('');
    let chartCanvas = $state<HTMLCanvasElement | null>(null);
    let chart: Chart | null = null;
    let showChart = $state(false);
    
    // Computed metadata frequency
    let metadataFrequency = $derived.by(() => {
        const frequency = new Map<string, number>();
        metadataDetails.forEach(metadata => {
            const value = metadata.raw_metadata[metadataName];
            if (value) {
                frequency.set(value, (frequency.get(value) || 0) + 1);
            }
        });
        
        // Sort by frequency (descending) and limit to top 20
        return Array.from(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
    });
    
    $effect(() => {
        if (metadataDetails.length > 0) {
            try {
                const regex = new RegExp(searchPattern, 'i');
                matchCount = metadataDetails.filter(metadata => 
                    regex.test(metadata.raw_metadata[metadataName]?.toString() || '')
                ).length;
            } catch (e) {
                // Invalid regex pattern, don't update match count
            }
        }
    });

    async function loadData() {
        loading = true;
        const detailResp = await fetchMetadataDetail(metadataName, selectedCategory || undefined);
        if (detailResp.isOk()) {
            metadataDetails = detailResp.value;
            error = null;
        } else {
            error = detailResp.error.message ?? 'An error occured';
        }
        loading = false;
    }

    onMount(async () => {
        try {
            // Load categories first
            categories = await fetchCategories().unwrapOr([]);
            await loadData();
        } catch (e) {
            console.error('Error:', e);
            error = e instanceof Error ? e.message : 'An error occurred';
            loading = false;
        }
    });

    $effect(() => {
        if (selectedCategory !== undefined) {
            loadData();
        }
    });

    // Create chart effect
    $effect(() => {
        if (showChart && chartCanvas && metadataFrequency.length > 0) {
            createChart();
        }
    });

    function createChart() {
        if (chart) {
            chart.destroy();
        }

        if (!chartCanvas || metadataFrequency.length === 0) return;

        const ctx = chartCanvas.getContext('2d');
        if (!ctx) return;

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: metadataFrequency.map(([value]) => 
                    value.length > 30 ? value.substring(0, 30) + '...' : value
                ),
                datasets: [{
                    label: 'Frequency',
                    data: metadataFrequency.map(([, count]) => count),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Top ${metadataFrequency.length} Values for ${metadataName}`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Values'
                        }
                    }
                }
            }
        });
    }

    function handleRowClick(event: CustomEvent<{ product_id: string }>) {
        goto(`/products/${event.detail.product_id}`);
    }

    function getFilteredRows() {
        if (!searchPattern) return metadataDetails;
        try {
            const regex = new RegExp(searchPattern, 'i');
            return metadataDetails.filter(metadata => {
                const value = metadata.raw_metadata[metadataName]?.toString() || '';
                const matches = regex.test(value);
                return showNonMatching ? !matches : matches;
            });
        } catch (e) {
            console.error('Invalid regex pattern:', e);
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
            
            <div class="controls">
                <button 
                    class="chart-toggle"
                    onclick={() => showChart = !showChart}
                >
                    {showChart ? 'Hide Chart' : 'Show Chart'}
                </button>
            </div>
            
            {#if showChart}
                <div class="chart-container">
                    <canvas bind:this={chartCanvas}></canvas>
                </div>
            {/if}
            
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
                headers={['Name', 'Product', 'Category']}
                keys={['name', 'product', 'category']}
                rows={getFilteredRows().map(metadata => ({
                    name: metadata.raw_metadata[metadataName],
                    product: metadata.name,
                    category: categoryMap.get(metadata.category_id)?.name || 'Unknown',
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

    .controls {
        margin: 1rem 0;
    }

    .chart-toggle {
        background-color: #2563eb;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .chart-toggle:hover {
        background-color: #1d4ed8;
    }

    .chart-container {
        margin: 2rem 0;
        padding: 1rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        height: 400px;
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