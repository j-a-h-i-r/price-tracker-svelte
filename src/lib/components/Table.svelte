<script lang="ts">
    import { createEventDispatcher } from "svelte";
    
    export let headers: string[] = [];
    export let keys: string[] = [];
    export let rows: any[] = [];
    export let highlightPattern: string = '';

    const dispatch = createEventDispatcher();

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
                {#each headers as header}
                    <th>{header}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each rows as row}
                <tr onclick={() => dispatch('rowClick', row)} class="clickable">
                    {#each keys as key}
                        <td>{@html highlightText(row[key])}</td>
                    {/each}
                </tr>
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

    .clickable {
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
</style>
