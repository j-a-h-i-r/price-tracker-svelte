<script lang="ts">
    import { onMount } from "svelte";

    let searchQuery = '';
    let totalProducts = 0;
    let totalWebsites = 0;
    let totalCategories = 0;
    let searchResults: any[] = [];
    let searchTimeout: ReturnType<typeof setTimeout>;
    let categoryMap: { [key: string]: string } = {};
    let isLoading = false;

    onMount(async() => {
        totalProducts = await getTotalProducts();
        totalWebsites = await getTotalWebsites();
        totalCategories = await getTotalCategories();
        let categories = await getCategories();
        categories.forEach((category: { id: string; name: string }) => {
            categoryMap[category.id] = category.name;
        });
        console.log('Categories:', categoryMap);
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

    async function getCategories() {
        const response = await fetch('/api/categories');
        return await response.json();
    }

    async function handleSearch() {
        isLoading = true;
        const response = await fetch(`/api/products?name=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        searchResults = data;
        isLoading = false;
    }

    function debouncedSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch();
        }, 300);
    }

    $: if (searchQuery !== undefined && searchQuery !== '') {
        debouncedSearch();
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
    />
    {#if isLoading}
        <div class="loading-spinner"></div>
    {/if}
</div>

{#if searchResults.length > 0}
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                {#each searchResults as product}
                    <tr>
                        <td><a href="/products/{product.id}">{product.name}</a></td>
                        <td>{categoryMap[product.category_id] || '?'}</td>
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
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        position: relative;
    }

    input {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1.1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        outline: none;
    }

    input:focus {
        border-color: #2563eb;
    }

    .loading-spinner {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: translateY(-50%) rotate(0deg); }
        100% { transform: translateY(-50%) rotate(360deg); }
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

