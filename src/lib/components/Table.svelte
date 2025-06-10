<script lang="ts">
    import { formatPrice } from "$lib/util.js";
    import { createEventDispatcher } from "svelte";
    
    export let headers: string[] = [];
    export let keys: string[] = [];
    export let rows: any[] = [];
    export let highlightPattern: string = '';

    const dispatch = createEventDispatcher();
    let expandedRows = new Set<number>();

    function toggleRow(index: number, event: MouseEvent) {
        event.stopPropagation();
        if (expandedRows.has(index)) {
            expandedRows.delete(index);
        } else {
            expandedRows.add(index);
        }
        expandedRows = expandedRows; // Trigger reactivity
    }

    function highlightText(text: string): string {
        if (!highlightPattern) return text;
        try {
            const regex = new RegExp(highlightPattern, 'gi');
            return text.toString().replace(regex, match => `<mark>${match}</mark>`);
        } catch (e) {
            return text;
        }
    }
</script>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th></th>
                {#each headers as header}
                    <th>{header}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each rows as row, i}
                <tr class="clickable">
                    <td class="expand-cell">
                        {#if row.expandedContent}
                            <button 
                                class="expand-button" 
                                on:click={(e) => toggleRow(i, e)}
                                aria-label={expandedRows.has(i) ? "Collapse row" : "Expand row"}
                            >
                                {expandedRows.has(i) ? '−' : '+'}
                            </button>
                        {/if}
                    </td>
                    {#each keys as key}
                        <td on:click={() => dispatch('rowClick', row)}>{@html highlightText(row[key])}</td>
                    {/each}
                </tr>
                {#if expandedRows.has(i) && row.expandedContent}
                    <tr class="expanded-content">
                        <td colspan={keys.length + 1}>
                            <div class="expanded-grid">
                                {#each row.expandedContent as price}
                                    <div class="price-item">
                                        <div class="price-website">{price.website}</div>
                                        <div class="price-amount">{formatPrice(price.price)}</div>
                                        <div class="price-date">{price.date}</div>
                                    </div>
                                {/each}
                            </div>
                        </td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
</div>

<style>
    .table-container {
        overflow-x: auto;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background-color: white;
    }

    th {
        background-color: #f8f9fa;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.875rem;
    }

    th, td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    tr:hover {
        background-color: #f8f9fa;
    }

    .clickable td:not(.expand-cell) {
        cursor: pointer;
    }

    .clickable:hover {
        background-color: #f8f9fa;
    }

    :global(mark) {
        background-color: #fef08a;
        padding: 0.1em 0;
        border-radius: 2px;
    }

    .expand-cell {
        width: 40px;
        text-align: center;
    }

    .expand-button {
        width: 24px;
        height: 24px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background: white;
        color: #4b5563;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .expand-button:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .expanded-content {
        background: #f8fafc;
    }

    .expanded-content > td {
        padding: 1rem;
    }

    .expanded-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }

    .price-item {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    .price-website {
        font-weight: 500;
        color: #4b5563;
        margin-bottom: 0.25rem;
    }

    .price-amount {
        font-size: 1.125rem;
        font-weight: 600;
        color: #16a34a;
    }

    .price-date {
        font-size: 0.875rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }
</style>
