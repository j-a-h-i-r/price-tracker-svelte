<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { userState } from '$lib/user.svelte.js';
    import { toasts } from '$lib/states/toast';
    import type { FringeGroup } from '$lib/types/FringeGroup.js';
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
    import { getFringeGroups, purgeGroup } from '$lib/api/fringegroups.js';
    import { ResultAsync } from 'neverthrow';
    import { fetchExternalProductGroups } from '$lib/api/groups.js';

    let fringeGroups: FringeGroup[] = $state([]);
    let isLoading = $state(false);
    let percentThreshold = $state<number>(5);
    let inputValue = $state('5');
    let sortOrder = $state<'asc' | 'desc'>('asc');

    onMount(async () => {
        if (!userState.isAdmin) {
            goto('/');
            return;
        }
        await fetchFringeGroups();
    });

    async function fetchFringeGroups() {
        isLoading = true;
        const threshold = percentThreshold || undefined;
        fringeGroups = await getFringeGroups(threshold, sortOrder)
            .orTee(() => {
                toasts.error('Failed to fetch fringe groups');
            })
            .andTee(() => {
                toasts.success('Fringe groups loaded successfully');
            })
            .unwrapOr([]);
        console.log(isLoading)
        isLoading = false;
    }

    function handleThresholdChange() {
        const value = parseFloat(inputValue);
        if (!isNaN(value) && value >= 0) {
            percentThreshold = value;
            fetchFringeGroups();
        }
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleThresholdChange();
        }
    }

    function handleSortChange() {
        fetchFringeGroups();
    }

    let searchTerm = $state('');
    let expandedGroups = $state<Set<number>>(new Set());
    
    interface GroupDetail {
        group_id?: number;
        id?: number;
        group_name?: string;
        name?: string;
        runs?: unknown[];
    }
    
    let groupDetails = $state<Record<number, GroupDetail[]>>({});
    let loadingGroups = $state<Set<number>>(new Set());
    let purgingGroups = $state<Set<string>>(new Set()); // Track purging state by "externalId-groupId"
    
    let filteredGroups = $derived(fringeGroups.filter(group =>
        group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.external_product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.group_id.toString().includes(searchTerm)
    ));

    function formatPercentage(value: string): string {
        return parseFloat(value).toFixed(2) + '%';
    }

    async function toggleGroupDetails(externalProductId: number) {
        if (expandedGroups.has(externalProductId)) {
            // Collapse
            expandedGroups.delete(externalProductId);
            expandedGroups = new Set(expandedGroups);
        } else {
            // Expand and fetch data if not already loaded
            if (!groupDetails[externalProductId]) {
                await fetchGroupDetails(externalProductId);
            }
            expandedGroups.add(externalProductId);
            expandedGroups = new Set(expandedGroups);
        }
    }

    async function fetchGroupDetails(externalProductId: number) {
        try {
            loadingGroups.add(externalProductId);
            loadingGroups = new Set(loadingGroups);

            const groups = await fetchExternalProductGroups(externalProductId).unwrapOr([]);
            groupDetails[externalProductId] = groups;
            groupDetails = { ...groupDetails };
        } catch (error) {
            console.error('Error fetching group details:', error);
            toasts.error('Failed to fetch group details');
        } finally {
            loadingGroups.delete(externalProductId);
            loadingGroups = new Set(loadingGroups);
        }
    }

    async function purgeAllGroups() {
        const confirmation = confirm(`Are you sure you want to purge ALL fringe groups? This action cannot be undone.`);
        if (!confirmation) return;

        try {
            isLoading = true;
            await ResultAsync.combine(filteredGroups.map(group => 
                purgeGroup(group.external_product_id, group.group_id)
                    .andTee(() => {
                        toasts.success(`Successfully purged group "${group.group_name}"`);
                    })
                    .orTee((error) => {
                        console.error('Error purging group:', error);
                        toasts.error(`Failed to purge group "${group.group_name}"`);
                    })
            ));
            // Refresh the fringe groups list
            await fetchFringeGroups();
        } finally {
            isLoading = false;
        }
    }

    async function handlePurgeGroup(externalProductId: number, groupId: number, groupName: string) {
        const confirmation = confirm(`Are you sure you want to purge group "${groupName}" (ID: ${groupId})? This action cannot be undone.`);
        if (!confirmation) return;

        const purgeKey = `${externalProductId}-${groupId}`;
        try {
            purgingGroups.add(purgeKey);
            purgingGroups = new Set(purgingGroups);

            await purgeGroup(externalProductId, groupId)
                .andTee(() => {
                    toasts.success(`Successfully purged group "${groupName}"`);
                    // Refresh the fringe groups list
                    fetchFringeGroups();
                })
                .orTee((error) => {
                    console.error('Error purging group:', error);
                    toasts.error(`Failed to purge group "${groupName}"`);
                });
        } finally {
            purgingGroups.delete(purgeKey);
            purgingGroups = new Set(purgingGroups);
        }
    }
</script>

<div class="container">
    <div class="header">
        <h1>Fringe Groups</h1>
        <p class="description">
            Manage and review fringe groups - products that appear in very few groups relative to the total product count.
        </p>
    </div>

    <div class="controls">
        <div class="controls-row">
            <div class="threshold-control">
                <label for="threshold">Percentage Threshold:</label>
                <div class="input-group">
                    <input
                        id="threshold"
                        type="number"
                        min="0"
                        step="0.1"
                        bind:value={inputValue}
                        onkeypress={handleKeyPress}
                        placeholder="Enter threshold"
                    />
                    <button onclick={handleThresholdChange} class="apply-btn">
                        Apply
                    </button>
                </div>
                <span class="threshold-help">
                    Show groups where GP percentage is below this threshold
                </span>
            </div>

            <div class="sort-control">
                <label for="sort">Sort Order:</label>
                <select 
                    id="sort" 
                    bind:value={sortOrder} 
                    onchange={handleSortChange}
                    class="sort-select"
                >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </select>
                <span class="sort-help">
                    Sort by GP percentage
                </span>
            </div>
        </div>
    </div>

    {#if isLoading}
        <div class="loading-container">
            <LoadingSpinner />
            <p>Loading fringe groups...</p>
        </div>
    {:else}
        <div class="results-summary">
            <p>Found {filteredGroups.length} fringe groups {percentThreshold ? `with threshold ${percentThreshold}%` : ''}</p>
        </div>

        <button type="button" class="purge-all-btn" onclick={purgeAllGroups}>
            Purge All Groups
        </button>

        {#if fringeGroups.length > 0}
            <div class="search-container">
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Search groups by name, product, or ID..."
                    class="search-input"
                />
            </div>

            <div class="cards-container">
                {#each filteredGroups as group, index (index)}
                    <div class="card">
                        <div class="card-header">
                            <div class="group-id">Group #{group.group_id}</div>
                            <div class="percentage-badge">{formatPercentage(group.gp_percent)}</div>
                        </div>
                        
                        <div class="card-content">
                            <h3 class="group-name">{group.group_name}</h3>
                            <p class="product-name">{group.external_product_name}</p>
                        </div>
                        
                        <div class="card-stats">
                            <div class="stat">
                                <span class="stat-label">Group Count</span>
                                <span class="stat-value">{group.gp_count}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Product Count</span>
                                <span class="stat-value">{group.p_count}</span>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button 
                                class="view-groups-btn"
                                onclick={() => toggleGroupDetails(group.external_product_id)}
                                disabled={loadingGroups.has(group.external_product_id)}
                            >
                                {#if loadingGroups.has(group.external_product_id)}
                                    Loading...
                                {:else if expandedGroups.has(group.external_product_id)}
                                    Hide Groups
                                {:else}
                                    View Groups
                                {/if}
                            </button>
                            
                            <button 
                                class="purge-btn"
                                onclick={() => handlePurgeGroup(group.external_product_id, group.group_id, group.group_name)}
                                disabled={purgingGroups.has(`${group.external_product_id}-${group.group_id}`)}
                            >
                                {#if purgingGroups.has(`${group.external_product_id}-${group.group_id}`)}
                                    Purging...
                                {:else}
                                    Purge
                                {/if}
                            </button>
                        </div>

                        {#if expandedGroups.has(group.external_product_id) && groupDetails[group.external_product_id]}
                            <div class="groups-detail">
                                <h4>Groups for this product:</h4>
                                <div class="groups-list">
                                    {#each groupDetails[group.external_product_id] as detailGroup (detailGroup.group_id || detailGroup.id || Math.random())}
                                        <div class="group-item" class:current-group={detailGroup.group_id === group.group_id || detailGroup.id === group.group_id}>
                                            <span class="group-item-id">#{detailGroup.group_id || detailGroup.id}</span>
                                            <span class="group-item-name">{detailGroup.group_name || detailGroup.name || 'Unnamed Group'}</span>
                                            <span class="runs-count">{detailGroup.runs?.length || 0} runs</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            {#if filteredGroups.length === 0}
                <div class="no-search-results">
                    <p>No groups match your search criteria.</p>
                </div>
            {/if}
        {:else}
            <div class="no-results">
                <p>No fringe groups found with the current threshold.</p>
                <p class="help-text">Try adjusting the percentage threshold to see more results.</p>
            </div>
        {/if}
    {/if}
</div>

<style>
    .container {
        max-width: 96rem;
        margin: 0;
        padding: 2rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
        margin-bottom: 0.5rem;
    }

    .description {
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.5;
    }

    .controls {
        background: white;
        padding: 1.5rem;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .controls-row {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
    }

    .threshold-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
    }

    .sort-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 0 0 200px;
    }

    .threshold-control label,
    .sort-control label {
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
    }

    .sort-select {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: white;
        cursor: pointer;
    }

    .sort-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .threshold-help,
    .sort-help {
        font-size: 0.75rem;
        color: #6b7280;
        font-style: italic;
    }

    .input-group {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .input-group input {
        flex: 0 0 150px;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }

    .input-group input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .apply-btn {
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .apply-btn:hover {
        background: #2563eb;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem;
        gap: 1rem;
    }

    .loading-container p {
        color: #6b7280;
        font-size: 1rem;
    }

    .results-summary {
        margin-bottom: 1rem;
    }

    .results-summary p {
        color: #374151;
        font-weight: 500;
        font-size: 0.875rem;
    }

    .purge-all-btn {
        padding: 0.75rem 1.5rem;
        background: #dc2626;
        color: white;
        border: 1px solid #dc2626;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .purge-all-btn:hover:not(:disabled) {
        background: #b91c1c;
        border-color: #b91c1c;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .purge-all-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #9ca3af;
        border-color: #9ca3af;
    }

    .no-results {
        text-align: center;
        padding: 4rem;
        background: white;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
    }

    .no-results p {
        color: #6b7280;
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }

    .help-text {
        font-size: 0.875rem;
        color: #9ca3af;
    }

    .search-container {
        margin-bottom: 1rem;
    }

    .search-input {
        width: 100%;
        max-width: 400px;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: white;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 1.5rem;
    }

    .card {
        background: white;
        border-radius: 0.75rem;
        border: 1px solid #e5e7eb;
        padding: 1.5rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
    }

    .card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        transform: translateY(-1px);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .group-id {
        font-size: 0.875rem;
        font-weight: 600;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
    }

    .percentage-badge {
        font-size: 0.875rem;
        font-weight: 700;
        color: white;
        background: #dc2626;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
    }

    .card-content {
        margin-bottom: 1.5rem;
    }

    .card-content .group-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
    }

    .card-content .product-name {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
    }

    .card-stats {
        display: flex;
        gap: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #f3f4f6;
    }

    .stat {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .stat-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .stat-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #111827;
    }

    .card-actions {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f3f4f6;
        display: flex;
        gap: 0.75rem;
    }

    .view-groups-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .view-groups-btn:hover:not(:disabled) {
        background: #e5e7eb;
        border-color: #9ca3af;
    }

    .view-groups-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .purge-btn {
        padding: 0.75rem 1rem;
        background: #dc2626;
        color: white;
        border: 1px solid #dc2626;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
    }

    .purge-btn:hover:not(:disabled) {
        background: #b91c1c;
        border-color: #b91c1c;
    }

    .purge-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #9ca3af;
        border-color: #9ca3af;
    }

    .groups-detail {
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
    }

    .groups-detail h4 {
        margin: 0 0 0.75rem 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
    }

    .groups-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .group-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        background: white;
        border-radius: 0.375rem;
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
    }

    .group-item.current-group {
        background: #fef3c7;
        border-color: #f59e0b;
        box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.1);
    }

    .group-item-id {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        flex-shrink: 0;
    }

    .group-item.current-group .group-item-id {
        background: #f59e0b;
        color: white;
    }

    .group-item-name {
        font-size: 0.875rem;
        color: #111827;
        line-height: 1.4;
        flex: 1;
    }

    .runs-count {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        background: #f3f4f6;
        padding: 0.125rem 0.5rem;
        border-radius: 0.375rem;
        flex-shrink: 0;
    }

    .group-item.current-group .runs-count {
        background: #f59e0b;
        color: white;
    }

    .no-search-results {
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
        margin-top: 1rem;
    }

    .no-search-results p {
        color: #6b7280;
        font-size: 1rem;
    }

    @media (max-width: 768px) {
        .container {
            padding: 1rem;
        }

        .controls-row {
            flex-direction: column;
            gap: 1.5rem;
        }

        .sort-control {
            flex: 1;
        }

        .input-group {
            flex-direction: column;
            align-items: stretch;
        }

        .input-group input {
            flex: 1;
        }

        .search-input {
            max-width: none;
        }

        .cards-container {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .card {
            padding: 1rem;
        }

        .card-stats {
            gap: 1rem;
        }

        .card-actions {
            flex-direction: column;
            gap: 0.5rem;
        }

        .view-groups-btn {
            flex: none;
        }
    }
</style>
