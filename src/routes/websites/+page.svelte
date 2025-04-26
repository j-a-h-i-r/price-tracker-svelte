<script lang="ts">
    import { onMount } from "svelte";

    interface WebsiteSummary {
        total_products: number;
        total_categories: number;
    }

    interface Website {
        id: string;
        name: string;
        product_count?: number;
        url?: string;
        summary?: WebsiteSummary;
    }

    let websites: Website[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);

    async function fetchWebsiteSummary(websiteId: string): Promise<WebsiteSummary> {
        const response = await fetch(`/api/websites/${websiteId}/summary`);
        if (!response.ok) {
            throw new Error('Failed to fetch website summary');
        }
        return response.json();
    }

    onMount(async () => {
        try {
            const response = await fetch('/api/websites');
            if (!response.ok) {
                throw new Error('Failed to fetch websites');
            }
            const websitesList = await response.json();
            
            // Fetch summaries for each website
            const websitesWithSummaries = await Promise.all(
                websitesList.map(async (website: Website) => {
                    try {
                        const summary = await fetchWebsiteSummary(website.id);
                        return { ...website, summary };
                    } catch (e) {
                        console.error(`Failed to fetch summary for website ${website.id}:`, e);
                        return website;
                    }
                })
            );
            
            websites = websitesWithSummaries;
            loading = false;
        } catch (e) {
            console.error("Error fetching websites:", e);
            error = e instanceof Error ? e.message : "An error occurred";
            loading = false;
        }
    });
</script>

<div class="websites-container">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Websites</h1>

    {#if loading}
        <p>Loading websites...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else if websites.length === 0}
        <p>No websites available</p>
    {:else}
        <div class="websites-grid">
            {#each websites as website}
                <div class="website-card">
                    <h2>{website.name}</h2>
                    <div class="stats">
                        {#if website.summary}
                            <div class="stat-item">
                                <span class="stat-label">Products</span>
                                <span class="stat-value">{website.summary.total_products}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Categories</span>
                                <span class="stat-value">{website.summary.total_categories}</span>
                            </div>
                        {:else if website.product_count !== undefined}
                            <div class="stat-item">
                                <span class="stat-label">Products</span>
                                <span class="stat-value">{website.product_count}</span>
                            </div>
                        {/if}
                    </div>
                    {#if website.url}
                        <a href={website.url} target="_blank" rel="noopener noreferrer" class="visit-link">
                            Visit Website →
                        </a>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .websites-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .websites-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .website-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1.5rem;
        transition: transform 0.2s;
        display: flex;
        flex-direction: column;
    }

    .website-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .website-card h2 {
        margin: 0;
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .stats {
        display: flex;
        gap: 1.5rem;
        margin: 1rem 0;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .stat-label {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .stat-value {
        color: #2563eb;
        font-weight: 600;
        font-size: 1.125rem;
    }

    .visit-link {
        display: inline-block;
        background: #2563eb;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.875rem;
        transition: background-color 0.2s;
        margin-top: auto;
        align-self: flex-start;
    }

    .visit-link:hover {
        background: #1d4ed8;
    }

    .error {
        color: #ef4444;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 4px;
    }
</style>