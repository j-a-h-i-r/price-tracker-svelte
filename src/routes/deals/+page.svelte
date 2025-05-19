<script lang="ts">
    import { onMount } from 'svelte';
    import type { Deal } from '$lib/types/Deal';
    import { fetchDeals } from '$lib/api/deals.js';

    let deals: Deal[] = [];
    let selectedDays = 7;
    let sortBy = 'value';

    async function loadDeals(days: number, sortBy: string) {
        selectedDays = days;
        deals = await fetchDeals(days, sortBy);
    }

    onMount(async () => {
        await loadDeals(selectedDays, sortBy);
    });
</script>

<div class="deals-container">
    <div class="deals-header">
        <h1>Current Deals</h1>
        <div class="header-controls">
            <div class="sort-control">
                <label for="sort-select">Sort</label>
                <select 
                    id="sort-select"
                    onchange={() => loadDeals(selectedDays, sortBy)} 
                    bind:value={sortBy} 
                    class="sort-select"
                >
                    <option value="value">Maximum Price Drop</option>
                    <option value="percentage">Maximum Percentage Drop</option>
                </select>
            </div>
            <div class="time-filters">
                <button 
                    class:active={selectedDays === 7} 
                    onclick={() => loadDeals(7, sortBy)}
                >
                    7 Days
                </button>
                <button 
                    class:active={selectedDays === 30} 
                    onclick={() => loadDeals(30, sortBy)}
                >
                    30 Days
                </button>
            </div>
        </div>
    </div>
    <div class="deals-grid">
        {#each deals as deal}
            <a href="/products/{deal.product_id}" class="deal-card">
                <div class="deal-content">
                    <h3>{deal.product_name}</h3>
                    <div class="price-section">
                        <span class="current-price">৳{deal.current_price}</span>
                        {#if deal.current_price}
                            <span class="msrp">৳{deal.max_price_last_days}</span>
                            <span class="discount">-{Math.round((1 - deal.current_price/deal.max_price_last_days) * 100)}%</span>
                        {/if}
                    </div>
                </div>
            </a>
        {/each}
    </div>
</div>

<style>
    .deals-container {
        padding: 2rem;
    }

    .deals-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .sort-control {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .sort-control label {
        color: #4b5563;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .sort-select {
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        color: #4b5563;
        font-size: 0.875rem;
        cursor: pointer;
    }

    .sort-select:hover {
        border-color: #d1d5db;
    }

    .sort-select:focus {
        outline: none;
        border-color: #2563eb;
    }

    .time-filters {
        display: flex;
        gap: 0.5rem;
    }

    .time-filters button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        background: #e5e7eb;
        cursor: pointer;
        transition: background 0.2s;
    }

    .time-filters button:hover {
        background: #d1d5db;
    }

    .time-filters button.active {
        background: #2563eb;
        color: white;
    }

    .deals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
    }

    .deal-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .deal-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .deal-content h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
    }

    .price-section {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .current-price {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
    }

    .msrp {
        text-decoration: line-through;
        color: #6b7280;
    }

    .discount {
        color: #16a34a;
        font-weight: 500;
    }
</style>

