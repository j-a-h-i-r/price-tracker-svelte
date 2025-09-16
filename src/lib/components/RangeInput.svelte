<script lang="ts">
    let {
        label, unit = null, minValue = $bindable(), maxValue = $bindable(), minAllowed = 0, maxAllowed = 10000,
    }: {
        label: string, unit?: string | null; minValue: number; maxValue: number; minAllowed: number; maxAllowed: number;
    } = $props();

    $effect(() => {
        console.log(label, minAllowed, maxAllowed, minValue, maxValue, minValue !== minAllowed || maxValue !== maxAllowed);
    });
</script>

<button class="filter-chip" class:active={minValue !== minAllowed || maxValue !== maxAllowed}>
    <span class="label">{label}</span>
    <div class="chip-inputs">
        <input 
            type="number" 
            bind:value={minValue}
            min={minAllowed}
            max={maxAllowed}
            placeholder="Min"
            class="chip-input"
        />
        {#if unit}
            <span class="unit">{unit}</span>
        {/if}
        <span class="separator">to</span>
        <input 
            type="number" 
            bind:value={maxValue}
            min={minAllowed}
            max={maxAllowed}
            placeholder="Max"
            class="chip-input"
        />
        {#if unit}
            <span class="unit">{unit}</span>
        {/if}
    </div>
</button>

<style>
    .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.75rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        color: #374151;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.15s ease;
        flex: 1 1 auto;
        min-width: calc(50% - 0.25rem); /* account for gap */
    }

    @media (min-width: 640px) {
        .filter-chip {
            flex: 0 1 auto;
            min-width: auto;
        }
    }

    .filter-chip:hover {
        border-color: #2563eb;
        color: #2563eb;
    }

    .filter-chip.active {
        background: #eef2ff;
        border-color: #6366f1;
        color: #4f46e5;
    }

    .filter-chip span {
        font-weight: 500;
    }

    .chip-inputs {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .chip-input {
        width: auto;
        border: none;
        background: transparent;
        padding: 0;
        font-size: 0.875rem;
        color: inherit;
    }

    .chip-input:focus {
        outline: none;
    }

    .chip-input::placeholder {
        color: #9ca3af;
    }

    .separator {
        color: #9ca3af;
    }

    .label {
        background: #f5f5f5;
        padding: 0.375rem 0.5rem 0.375rem 0.75rem;
        border-radius: 5px 0 0 5px;
        font-weight: 500;
        margin-left: -0.75rem;
        margin-top: -0.375rem;
        margin-bottom: -0.375rem;
        margin-right: 0.25rem;
        height: calc(100% + 0.75rem);
        display: flex;
        align-items: center;
    }
</style>