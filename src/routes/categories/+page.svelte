<script lang="ts">
    import { fetchCategories, type Category } from '$lib/api/products.js';
    import { getCategoryNewProductsCount } from '$lib/api/categories.js';
    import { onMount } from 'svelte';
    import { ok, ResultAsync } from 'neverthrow';
    import { generateSEOConfig } from '$lib/seo.js';

    interface CategoryWithNewProducts extends Category {
        newProductsCount?: number;
        product_count?: number;
    }

    let categories: CategoryWithNewProducts[] = $state([]);
    let loading = $state(true);
    let newProductDays = 7;

    onMount(async () => {
        fetchCategories()
        .andThen((_categories) => {
            const categoriesWithNewProducts = _categories.map((category) => {
                return getCategoryNewProductsCount(category.id, newProductDays)
                    .andThen((newProductsCount) => ok({ ...category, newProductsCount }))
                    .orElse(() => ok(category)) // Return category without newProductsCount if fails
            });
            return ResultAsync.combine(categoriesWithNewProducts);
        })
        .match(
            (categoriesWithNewProducts) => {
                categories = categoriesWithNewProducts;
                loading = false;
            },
            (err) => {
                console.error('Error fetching categories:', err);
                loading = false;
            }
        );
    });
</script>

<div class="categories-container">
    {#if loading}
        <p>Loading categories...</p>
    {:else}
        <div class="categories-grid">
            {#each categories as category (category.id)}
                <div class="category-card">
                    <div class="card-header">
                        <h2>{category.name}</h2>
                        {#if category.newProductsCount !== undefined && category.newProductsCount > 0}
                            <div class="new-products-badge">
                                +{category.newProductsCount} in {newProductDays}d
                            </div>
                        {/if}
                    </div>
                    <p class="product-count">
                        {category?.product_count} products
                    </p>
                    <a href="/products?category_id={category.id}" class="view-products"
                        >View Products</a
                    >
                </div>
            {/each}
        </div>
    {/if}
</div>

<svelte:head>
    {@html
        generateSEOConfig({
            title: 'Supported Categories for tracking the best prices',
            description:
                'A variety of categories including laptop, smartphone, tablet are currently being tracked to find the best deals and prices',
            canonical: 'https://daam.deals/categories',
        })
    }
</svelte:head>

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
        display: flex;
        flex-direction: column;
    }

    .category-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
    }

    .category-card h2 {
        margin: 0;
        color: #374151;
        font-size: 1.25rem;
        font-weight: 600;
        flex: 1;
    }

    .new-products-badge {
        background: #10b981;
        color: white;
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        white-space: nowrap;
        margin-left: 0.75rem;
    }

    .category-card .product-count {
        color: #6b7280;
        margin: 0.5rem 0 1rem 0;
    }

    .view-products {
        display: inline-block;
        background: #2563eb;
        color: white;
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: 4px;
        text-decoration: none;
        font-size: 0.875rem;
        transition: background-color 0.2s;
        margin-top: auto;
        align-self: flex-start;
    }

    .view-products:hover {
        background: #1d4ed8;
    }
</style>
