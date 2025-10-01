<script lang="ts">
    import { fetchWebsiteNewProductsCount, fetchWebsites, fetchWebsiteSummary } from '$lib/api/websites.js';
    import { generateSEOConfig } from '$lib/seo.js';
    import type { WebsiteWithSummary } from '$lib/types/Website.js';
    import { ok, ResultAsync } from 'neverthrow';
    import { onMount } from 'svelte';

    let websites: WebsiteWithSummary[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let newProductDays = 7;

    onMount(async () => {
        fetchWebsites()
        .andThen((_websites) => {
            const summaryResp = _websites.map((website) => {
                return ResultAsync.combine([
                    fetchWebsiteSummary(website.id),
                    // Return 0 new product if fails to make error handling easier
                    fetchWebsiteNewProductsCount(website.id, newProductDays).orElse(() => ok(0)),
                ])
                    .andThen(([summary, newProductCount]) => ok({ ...website, summary, newProductsCount: newProductCount }))
                    .orElse(() => ok(website))
            })
            return ResultAsync.combine(summaryResp)
        })
        .match(
            (websitesWithSummaries) => {
                websites = websitesWithSummaries;
                loading = false;
            },
            (err) => {
                error = err.message ? err.message : 'An error occurred';
                loading = false;
            }
        )
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
            {#each websites as website (website.id)}
                <div class="website-card">
                    <div class="card-header">
                        <h2>{website.name}</h2>
                        {#if website.newProductsCount !== undefined && website.newProductsCount > 0}
                            <div class="new-products-badge">
                                +{website.newProductsCount} in {newProductDays}d
                            </div>
                        {/if}
                    </div>
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
                        {/if}
                    </div>
                    <a href={website.url} target="_blank" rel="noopener noreferrer" class="visit-link">
                        Visit Website →
                    </a>
                </div>
            {/each}
        </div>
    {/if}
</div>

<svelte:head>
    {@html generateSEOConfig({
        title: 'Supported retailers and websites for price tracking',
        description: 'These are the websites currently being tracked to find the best deals and prices. Retailers include StarTech, Techland, Pickaboo, and more.',
        canonical: 'https://daam.deals/websites',
    })}
</svelte:head>

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

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }

    .website-card h2 {
        margin: 0;
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
        flex: 1;
    }

    .new-products-badge {
        background: #10b981;
        color: white;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        white-space: nowrap;
        margin-left: 0.75rem;
    }

    .stats {
        display: flex;
        gap: 1.5rem;
        margin: 0 0 1rem 0;
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
        padding: var(--spacing-sm) var(--spacing-md);
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