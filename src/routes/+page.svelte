<script lang="ts">
    import { onMount } from "svelte";

    let totalProducts = 0;
    let totalWebsites = 0;
    let totalCategories = 0;
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
</style>

