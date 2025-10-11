<script lang="ts">
    import { fetchWebsiteNewProductsCount, fetchWebsites, fetchWebsiteStats } from '$lib/api/websites.js';
    import Loader from '$lib/components/Loader.svelte';
    import NoResult from '$lib/components/NoResult.svelte';
    import { generateSEOConfig } from '$lib/seo.js';
    import type { WebsiteWithStat } from '$lib/types/Website.js';
    import { ok, ResultAsync } from 'neverthrow';
    import { onMount } from 'svelte';

    let websites: WebsiteWithStat[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let newProductDays = 7;

    onMount(async () => {
        fetchWebsites()
        .andThen((_websites) => {
            const statResp = _websites.map((website) => {
                return ResultAsync.combine([
                    fetchWebsiteStats(website.id),
                    // Return 0 new product if fails to make error handling easier
                    fetchWebsiteNewProductsCount(website.id, newProductDays).orElse(() => ok(0)),
                ])
                    .andThen(([stat, newProductCount]) => ok({ ...website, stat, newProductsCount: newProductCount }))
                    .orElse(() => ok(website))
            })
            return ResultAsync.combine(statResp)
        })
        .match(
            (websitesWithSummaries) => {
                websites = websitesWithSummaries;
                loading = false;
            },
            (err) => {
                error = err.data.error 
                    ? err.data.error : err.message
                    ? err.message : 'An error occurred';
                loading = false;
            }
        )
    });
</script>

<div>
    {#if loading}
        <Loader headerText="Loading websites..." />
    {:else if error}
        <p class="error">{error}</p>
    {:else if websites.length === 0}
        <NoResult message="No websites available" />
    {:else}
        <section class="websites-info" aria-label="Request a new website">
            <div class="websites-info__icon hidden md:inline-flex" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                </svg>
            </div>
            <div class="websites-info__copy">
                <h2>Missing a retailer?</h2>
                <p>
                    Let us know what you'd like to track by opening an
                    <a href="https://github.com/j-a-h-i-r/price-tracker-svelte/issues/new" target="_blank" rel="noopener noreferrer">issue on GitHub</a>.
                </p>
            </div>
        </section>

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
                        {#if website.stat}
                            <div class="stat-item">
                                <span class="stat-label">Products</span>
                                <span class="stat-value">{website.stat.total_products}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Categories</span>
                                <span class="stat-value">{website.stat.total_categories}</span>
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
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html generateSEOConfig({
        title: 'Supported retailers and websites for price tracking',
        description: 'These are the websites currently being tracked to find the best deals and prices. Retailers include StarTech, Techland, Pickaboo, and more.',
        canonical: 'https://daam.deals/websites',
    })}
</svelte:head>

<style>
    .websites-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .website-card {
        background: var(--color-bg-primary);
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
        color: var(--color-text-primary);
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

    .websites-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        padding: 1rem 1.25rem;
        border-radius: 12px;
        border: 1px solid rgba(37, 99, 235, 0.15);
        background: rgba(219, 234, 254, 0.45);
        color: #1f3d8a;
    }

    .websites-info__icon {
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.12);
        color: inherit;
        flex-shrink: 0;
    }

    .websites-info__copy {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .websites-info__copy h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: inherit;
    }

    .websites-info__copy p {
        margin: 0;
        font-size: 0.95rem;
        color: rgba(30, 64, 175, 0.9);
    }

    .websites-info__copy a {
        font-weight: 600;
        color: #1d4ed8;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
    }

    .websites-info__copy a:hover {
        color: #1e40af;
    }

    @media (max-width: 640px) {
        .websites-info {
            flex-direction: column;
            align-items: flex-start;
        }

        .websites-info__icon {
            width: 38px;
            height: 38px;
        }
    }
</style>