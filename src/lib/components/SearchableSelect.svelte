<script lang="ts">
    interface Option {
        id: string | number;
        name: string;
    }

    let { options, value = $bindable(), allLabel = 'All', label }: { options: Option[]; value: string | number; allLabel: string; label: string } = $props();

    let isOpen = $state(false);
    let searchQuery = $state("");
    let selectedLabel = $derived.by(() => {
        if (value === "all") {
            return allLabel;
        } else {
            const selected = options.find(opt => opt.id == value);
            return selected ? selected.name : allLabel;
        }
    })

    let filteredOptions = $derived(options.filter(option => 
        option.name.toLowerCase().includes(searchQuery.toLowerCase())
    ));

    function handleSelect(optionId: string | number) {
        value = optionId;
        isOpen = false;
        searchQuery = "";
    }

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.searchable-select')) {
            isOpen = false;
            searchQuery = "";
        }
    }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="filter-control" class:active={value !== "all"}>
    <div class="searchable-select">
        <button class="select-label" onclick={() => isOpen = !isOpen}>{label}</button>
        <button 
            type="button"
            class="select-button"
            onclick={() => isOpen = !isOpen}
        >
            <span class="selected-text">{selectedLabel}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
    
        {#if isOpen}
            <div class="select-dropdown">
                <div class="search-container">
                    <input
                        type="text"
                        placeholder="Search..."
                        bind:value={searchQuery}
                        onclick={(e) => { e.stopPropagation();}}
                    />
                </div>
                <div class="options-list">
                    <button 
                        class="option"
                        class:selected={value === "all"}
                        onclick={() => handleSelect("all")}
                    >
                        {allLabel}
                    </button>
                    {#each filteredOptions as option}
                        <button 
                            class="option"
                            class:selected={value == option.id}
                            onclick={() => handleSelect(option.id)}
                        >
                            {option.name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .filter-control {
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
        .filter-control {
            flex: 0 1 auto;
            min-width: auto;
        }
    }

    .filter-control:hover {
        border-color: #2563eb;
        color: #2563eb;
    }

    .filter-control.active {
        background: #eef2ff;
        border-color: #6366f1;
        color: #4f46e5;
    }

    .searchable-select {
        position: relative;
        width: 100%;
        display: flex;
        gap: 0.5rem;
    }

    .select-label {
        font-weight: 500;
        cursor: pointer;
    }

    .select-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background: transparent;
        border: none;
        padding: 0;
        color: inherit;
        cursor: pointer;
        font-size: inherit;
    }

    .selected-text {
        margin-right: 0.5rem;
    }

    .select-dropdown {
        position: absolute;
        top: 100%;
        left: -0.75rem; /* Match parent padding */
        right: -0.75rem;
        min-width: 200px;
        margin-top: 0.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 50;
        max-height: 300px;
        display: flex;
        flex-direction: column;
    }

    .search-container {
        padding: 0.5rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .search-container input {
        width: 100%;
        padding: 0.375rem 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 0.875rem;
    }

    .search-container input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 1px #2563eb;
    }

    .options-list {
        overflow-y: auto;
        max-height: 250px;
        padding: 0.25rem;
    }

    .option {
        width: 100%;
        text-align: left;
        padding: 0.5rem;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        font-size: 0.875rem;
        color: #374151;
    }

    .option:hover {
        background: #f3f4f6;
    }

    .option.selected {
        background: #eef2ff;
        color: #4f46e5;
    }
</style>
