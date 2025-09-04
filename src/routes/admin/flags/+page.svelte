<script lang="ts">
    import { onMount } from 'svelte';
    import { userState } from '$lib/shared.svelte.js';
    import { goto } from '$app/navigation';
    import type { FlaggedProductWithSummary, FlaggingOption } from '$lib/types/Flagging.js';
    import { fetchFlaggings, getFlaggingOptions, resolveFlagging } from '$lib/api/flagging.js';
    import dayjs from 'dayjs';
    import relativeTime from 'dayjs/plugin/relativeTime';
    import { arrayToPerIdMap } from '$lib/util.js';
    import { toasts } from '$lib/states/toast.js';

    dayjs.extend(relativeTime);

    let flaggedProductSummary: FlaggedProductWithSummary | null = $state(null);
    let flaggedProducts = $derived.by(() => {
        return flaggedProductSummary?.products ?? [];
    });
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let flagOptionsMap: Map<number, FlaggingOption> = $state(new Map());

    onMount(async() => {
        const flagOptions = await getFlaggingOptions().unwrapOr([]);
        flagOptionsMap = arrayToPerIdMap<FlaggingOption>(flagOptions);
    })

    onMount(async () => {
        // Check if user is admin
        if (!userState.isAdmin) {
            goto('/');
            return;
        }

        const resp = await fetchFlaggings();
        if (resp.isOk()) {
            flaggedProductSummary = resp.value;
            error = null;
        } else {
            console.error('Error fetching flaggings:', resp.error);
            error = 'Failed to load flagged products';
        }
        isLoading = false;
    });

    async function handleResolve(externalProductId: number, flagOptionId: number) {
        const resp = await resolveFlagging(externalProductId, flagOptionId);
        if (resp.isOk()) {
            // Remove the specific flag from the product, or remove the entire product if no flags remain
            flaggedProducts = flaggedProducts?.map(product => {
                if (product.external_product_id === externalProductId) {
                    const updatedFlags = product.flags.filter(flag => flag.flag_option_id !== flagOptionId);
                    return {
                        ...product,
                        flags: updatedFlags
                    };
                }
                return product;
            }).filter(product => product.flags.length > 0); // Remove products with no remaining flags
            toasts.success('Flag resolved successfully');
        } else {
            console.error('Error resolving flagging:', resp.error);
            toasts.error('Failed to resolve flagging. Please try again.');
        }
    }

    function getTimeAgo(date: string): string {
        return dayjs(date).fromNow();
    }
</script>

<svelte:head>
    <title>Product Flags - Admin</title>
</svelte:head>

<div class="admin-page">
    <div class="page-header">
        <h1>Product Flags</h1>
        <p class="page-description">
            Review and manage flagged products reported by users for incorrect information or grouping.
        </p>
    </div>

    {#if isLoading}
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading flagged products...</p>
        </div>
    {:else if error}
        <div class="error-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3>Error Loading Flags</h3>
            <p>{error}</p>
        </div>
    {:else}
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{flaggedProductSummary?.pending_count}</div>
                <div class="stat-label">Pending Flags</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{flaggedProductSummary?.resolved_count}</div>
                <div class="stat-label">Resolved Flags</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{(flaggedProductSummary?.pending_count ?? 0) + (flaggedProductSummary?.resolved_count ?? 0)}</div>
                <div class="stat-label">Total Flags</div>
            </div>
        </div>

        {#if flaggedProducts.length > 0}
            <div class="section">
                <h2>Flagged Products ({flaggedProducts.length})</h2>
                <div class="flags-grid">
                    {#each flaggedProducts as flaggedProduct (flaggedProduct.external_product_id)}
                        <div class="flag-card pending">
                            <div class="flag-details">
                                {#each flaggedProduct.flags as flag}
                                    <div class="flag-detail">
                                        <div class="flag-info">
                                            <span class="detail-label">Reason:</span>
                                            <span class="detail-value">{flagOptionsMap.get(flag.flag_option_id)?.description}</span>
                                            <span class="detail-count">({flag.pending_count} pending, {flag.resolved_count} resolved)</span>
                                        </div>
                                        <button 
                                            class="resolve-btn flag-resolve-btn"
                                            onclick={() => handleResolve(flaggedProduct.external_product_id, flag.flag_option_id)}
                                            title="Resolve this flag type"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                {/each}
                            </div>
                            
                            <div class="product-info">
                                <h3 class="product-name">{flaggedProduct.external_product_name}</h3>
                                <div class="product-details">
                                    <span class="detail-item">
                                        <strong>Product ID:</strong> {flaggedProduct.internal_product_id}
                                    </span>
                                    <span class="detail-item">
                                        <strong>External ID:</strong> {flaggedProduct.external_product_id}
                                    </span>
                                </div>
                            </div>

                            <div class="flag-actions">
                                <a 
                                    href="/products/{flaggedProduct.internal_product_id}" 
                                    class="view-product-btn"
                                    target="_blank"
                                >
                                    View Product Page
                                </a>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                <h3>No Pending Flags</h3>
                <p>All flagged products have been reviewed and resolved.</p>
            </div>
        {/if}
    {/if}
</div>

<style>
    .admin-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    .page-header {
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .page-description {
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.5;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: #dc2626;
    }

    .error-container h3 {
        margin: 1rem 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .stat-label {
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .section {
        margin-bottom: 3rem;
    }

    .section h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 1rem;
    }

    .flags-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1rem;
    }

    .flag-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid transparent;
        transition: all 0.2s;
    }

    .flag-card.pending {
        border-left-color: #f59e0b;
    }

    .flag-card.resolved {
        border-left-color: #10b981;
        opacity: 0.8;
    }

    .flag-card:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }

    .flag-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }

    .flag-status {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        width: fit-content;
    }

    .status-badge.pending {
        background-color: #fef3c7;
        color: #92400e;
    }

    .status-badge.resolved {
        background-color: #d1fae5;
        color: #065f46;
    }

    .flag-date {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .resolve-btn {
        background: #10b981;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .resolve-btn:hover {
        background: #059669;
        transform: translateY(-1px);
    }

    .flag-details {
        margin-bottom: 1rem;
    }

    .flag-detail {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 6px;
        margin-bottom: 0.5rem;
        border: 1px solid #e5e7eb;
    }

    .flag-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }

    .detail-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #374151;
    }

    .detail-value {
        font-size: 0.875rem;
        color: #1f2937;
        font-weight: 500;
    }

    .detail-count {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .flag-resolve-btn {
        margin-left: 1rem;
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        flex-shrink: 0;
    }

    .product-info {
        margin-bottom: 1rem;
    }

    .product-name {
        font-size: 1rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.75rem;
        line-height: 1.4;
    }

    .product-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .detail-item {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .detail-item strong {
        color: #374151;
    }

    .flag-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .view-product-btn,
    .view-external-btn {
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.2s;
        flex: 1;
        text-align: center;
        min-width: 120px;
    }

    .view-product-btn {
        background: #2563eb;
        color: white;
    }

    .view-product-btn:hover {
        background: #1d4ed8;
    }

    .view-external-btn {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
    }

    .view-external-btn:hover {
        background: #e5e7eb;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: #6b7280;
    }

    .empty-state h3 {
        margin: 1rem 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
    }

    @media (max-width: 768px) {
        .admin-page {
            padding: 1rem;
        }

        .flags-grid {
            grid-template-columns: 1fr;
        }

        .flag-actions {
            flex-direction: column;
        }

        .view-product-btn,
        .view-external-btn {
            flex: none;
        }
    }
</style>
