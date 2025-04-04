<script lang="ts">
    import { onMount } from "svelte";

    let searchQuery = '';
    let totalProducts = 0;
    let totalWebsites = 0;
    let totalCategories = 0;
    let searchResults: any[] = [];

    onMount(async() => {
        totalProducts = await getTotalProducts();
        totalWebsites = await getTotalWebsites();
        totalCategories = await getTotalCategories();
    });

    async function getTotalProducts() {
        const response = await fetch('/api/products');
        const data = await response.json();
        return data.length;
    }

    async function getTotalWebsites() {
        const response = await fetch('/api/websites');
        const data = await response.json();
        return data.length;
    }

    async function getTotalCategories() {
        const response = await fetch('/api/categories');
        const data = await response.json();
        return data.length;
    }

    async function handleSearch() {
        const response = await fetch(`/api/products?name=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        searchResults = data;
    }
</script>

<div class="stats-grid">
    <div class="stat-card">
        <h3>Total Products</h3>
        <a href="/products">
            <p class="number">{totalProducts}</p>
        </a>
    </div>
    <div class="stat-card">
        <h3>Websites Tracked</h3>
        <a href="/websites">
            <p class="number">{totalWebsites}</p>
        </a>
    </div>
    <div class="stat-card">
        <h3>Categories Tracked</h3>
        <a href="/categories">
            <p class="number">{totalCategories}</p>
        </a>
    </div>
</div>

<div class="search-container">
    <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search for products..."
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
    />
    <button on:click={handleSearch}>Search</button>
</div>

{#if searchResults.length > 0}
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Website</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                {#each searchResults as product}
                    <tr>
                        <td><a href="/products/{product.id}">{product.name}</a></td>
                        <td>${product.price}</td>
                        <td>{product.website}</td>
                        <td>{product.category}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{:else if searchQuery}
    <p class="no-results">No products found</p>
{/if}

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .stat-card {
        background: #f4f4f4;
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
    }

    .number {
        font-size: 2rem;
        font-weight: bold;
        margin: 0.5rem 0;
        color: #2563eb;
    }

    h3 {
        margin: 0;
        color: #4b5563;
    }

    a {
        text-decoration: none;
    }

    a:hover .number {
        color: #1d4ed8;
    }

    .search-container {
        margin: 2rem 0;
        display: flex;
        gap: 1rem;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    input {
        flex: 1;
        padding: 0.75rem 1rem;
        font-size: 1.1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        outline: none;
    }

    input:focus {
        border-color: #2563eb;
    }

    button {
        padding: 0.75rem 1.5rem;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background: #1d4ed8;
    }

    .table-container {
        margin: 2rem 0;
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }

    th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    th {
        background: #f4f4f4;
        font-weight: 600;
        color: #4b5563;
    }

    tr:hover {
        background: #f8fafc;
    }

    .no-results {
        text-align: center;
        color: #6b7280;
        margin: 2rem 0;
    }
</style>

