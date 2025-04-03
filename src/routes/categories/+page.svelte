<script lang="ts">
    import { onMount } from "svelte";

    interface Category {
        id: string;
        name: string;
        productCount: number;
    }

    let categories: Category[] = [];
    let loading = true;

    onMount(async () => {
        categories = await getCategories();
        loading = false;
    });

    async function getCategories() {
        const response = await fetch("/api/categories");
        const data = await response.json();
        return data.map((category: any) => ({
            id: category.id,
            name: category.name,
            productCount: category.product_count || 0,
        }));
    }
</script>

<div class="categories-container">
    {#if loading}
        <p>Loading categories...</p>
    {:else}
        <div class="categories-grid">
            {#each categories as category}
                <div class="category-card">
                    <h2>{category.name}</h2>
                    <p class="product-count">
                        {category.productCount} products
                    </p>
                    <a href="/categories/{category.id}" class="view-products"
                        >View Products</a
                    >
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .categories-container {
        padding: 2rem 0;
    }

    .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .category-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1.5rem;
        transition: transform 0.2s;
    }

    .category-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .category-card h2 {
        margin: 0;
        color: #374151;
        font-size: 1.25rem;
    }

    .category-card .product-count {
        color: #6b7280;
        margin: 0.5rem 0 1rem 0;
    }

    .view-products {
        display: inline-block;
        background: #2563eb;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.875rem;
    }

    .view-products:hover {
        background: #1d4ed8;
    }
</style>
