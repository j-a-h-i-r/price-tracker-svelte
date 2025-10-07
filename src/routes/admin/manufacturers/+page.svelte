<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { userState } from '$lib/user.svelte.js';
    import { toasts } from '$lib/states/toast';
    import { fetchManufacturerStats, getManufacturers, mergeIntoManufacturer } from '$lib/api/manufacturers.js';

    const { data } = $props();
    
    let manufacturers = $state(data.manufacturers);
    let selectedManufacturers = $state<Record<string, boolean>>({});
    let isMerging = $state(false);
    let targetManufacturerId = $state<number | null>(null);

    // Derived state for selected count and items
    let selectedCount = $derived(
        Object.values(selectedManufacturers).filter(v => v === true).length
    );
    let selectedItems = $derived.by(() => {
        return Promise.all(manufacturers.filter(m => selectedManufacturers[m.id] === true)
        .map(async m => {
            return await fetchManufacturerStats(m.id).match(
                (data) => {
                return { ...m, ...data };
            }, () => {
                return m;
            })
        }));
    });

    $effect(() => {
        console.log(selectedItems);
    })

    onMount(async () => {
        if (!userState.isAdmin) {
            goto('/');
            return;
        }
    });

    async function handleMerge() {
        if (!targetManufacturerId || Object.keys(selectedManufacturers).length < 2) return;

        const idsToRemove = Object.keys(selectedManufacturers)
            .filter(id => selectedManufacturers[id] === true)
            .map(id => parseInt(id))
            .filter(id => id !== targetManufacturerId);
        console.log('Merging manufacturers:', idsToRemove, 'into', targetManufacturerId);
        
        const response = await mergeIntoManufacturer(targetManufacturerId, idsToRemove);
            if (response.isErr()) {
                toasts.error('Failed to merge manufacturers');
                return;
            }

            toasts.success('Manufacturers merged successfully');

            manufacturers = await getManufacturers().unwrapOr([]);
            
            // Reset selection state
            selectedManufacturers = {};
            isMerging = false;
            targetManufacturerId = null;
    }

    const columns = [
        { key: 'id', title: 'ID' },
        { key: 'name', title: 'Name' },
        { key: 'created_at', title: 'Created At', render: (value: string) => new Date(value).toLocaleDateString() }
    ];
</script>


<div class="header">
    <h1>Manage Manufacturers</h1>
</div>

<!-- Selection Summary -->
{#if selectedCount > 0}
    <div class="selection-summary">
        <div class="selected-items">
            {#await selectedItems}
                <p>Loading</p>
            {:then selectedItems} 
                {#each selectedItems as manufacturer (manufacturer.id)}
                    <div class="selected-chip">
                        <span>{manufacturer.name} ({manufacturer.product_count})</span>
                        <button 
                            class="remove-btn" 
                            onclick={() => selectedManufacturers[manufacturer.id] = false}
                        >×</button>
                    </div>
                {/each}
            {:catch error}
                <p>Error loading selected items: {error.message}</p>
            {/await}
        </div>
        {#if selectedCount >= 2}
            <button 
                class="merge-btn"
                onclick={() => isMerging = true}
            >
                Merge Selected ({selectedCount})
            </button>
        {/if}

        {#if isMerging}
            <div class="merge-form">
                <h3>Merge Manufacturers</h3>
                <p class="merge-description">Select the manufacturer to keep. Other selected manufacturers will be merged into this one.</p>
                <div class="merge-options">
                    {#each manufacturers.filter(m => selectedManufacturers[m.id]) as manufacturer (manufacturer.id)}
                        <label class="merge-option">
                            <input
                                type="radio"
                                name="targetManufacturer"
                                value={manufacturer.id}
                                bind:group={targetManufacturerId}
                            />
                            <span>{manufacturer.name}</span>
                        </label>
                    {/each}
                </div>
                <div class="form-buttons">
                    <button class="save-btn" onclick={handleMerge} disabled={!targetManufacturerId}>
                        Merge
                    </button>
                    <button class="cancel-btn" onclick={() => {
                        isMerging = false;
                        targetManufacturerId = null;
                    }}>Cancel</button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<!-- Manufacturers Table -->
<div class="content">
    <table>
        <thead>
            <tr>
                <th>Select</th>
                {#each columns as column, index (index)}
                    <th>{column.title}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each manufacturers as manufacturer (manufacturer.id)}
                <tr>
                    <td>
                        <!-- bind:checked={selectedManufacturers.includes(manufacturer.id)} -->
                        <input 
                            type="checkbox"
                            bind:checked={selectedManufacturers[manufacturer.id]}
                        />
                    </td>
                    {#each columns as column, index (index)}
                        <td>{manufacturer[column.key]}</td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>


<style>
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
        margin: 0;
    }

    .merge-btn {
        padding: 0.5rem 1rem;
        background-color: #7c3aed;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .merge-btn:hover {
        background-color: #6d28d9;
    }

    .form-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .save-btn {
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
    }

    .save-btn:hover {
        background-color: #1d4ed8;
    }

    .cancel-btn {
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
    }

    .cancel-btn:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .merge-form {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .merge-form h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 0.5rem 0;
    }

    .merge-description {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    .merge-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .merge-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
    }

    .merge-option:hover {
        background-color: #f9fafb;
    }

    .merge-option input[type="radio"] {
        width: 1rem;
        height: 1rem;
        cursor: pointer;
    }

    .merge-option span {
        font-size: 0.875rem;
        color: #374151;
    }

    .selection-summary {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e5e7eb;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .selected-items {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        flex: 1;
    }

    .selected-chip {
        display: inline-flex;
        align-items: center;
        background-color: #e9ecef;
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 14px;
        gap: 4px;
    }

    .remove-btn {
        background: none;
        border: none;
        color: #6c757d;
        padding: 0 4px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
    }

    .remove-btn:hover {
        color: #dc3545;
    }

    table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
    }

    thead {
        background-color: #f9fafb;
    }

    th {
        text-align: left;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #4b5563;
        border-bottom: 1px solid #e5e7eb;
    }

    td {
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: #374151;
        border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:hover {
        background-color: #f9fafb;
    }

    input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        cursor: pointer;
    }

    input[type="checkbox"]:checked {
        background-color: #2563eb;
        border-color: #2563eb;
    }

    @media (max-width: 768px) {
        .selection-summary {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
        }

        .merge-btn {
            width: 100%;
        }

        .content {
            overflow-x: auto;
        }

        table {
            min-width: 600px;
        }
    }
</style>
