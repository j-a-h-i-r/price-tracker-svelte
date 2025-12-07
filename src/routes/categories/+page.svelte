<script lang="ts">
    import { fetchCategories, type Category } from '$lib/api/products.js';
    import { getCategoryNewProductsCount } from '$lib/api/categories.js';
    import { onMount } from 'svelte';
    import { ok, ResultAsync } from 'neverthrow';
    import { generateSEOConfig, generateLdJSON, generateItemListStructuredData } from '$lib/seo.js';
    import Loader from '$lib/components/Loader.svelte';

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

<div>
    {#if loading}
        <Loader headerText="Loading categories..." />
    {:else}
        <section class="categories-info" aria-label="Request a new category">
            <div class="categories-info__icon hidden md:inline-flex" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <circle cx="12" cy="12" r="10" />
                </svg>
            </div>
            <div class="categories-info__copy">
                <h2>Missing a category?</h2>
                <p>
                    Let us know what you'd like to track by opening an
                    <a href="https://github.com/j-a-h-i-r/price-tracker-svelte/issues/new" target="_blank" rel="noopener noreferrer">issue on GitHub</a>.
                </p>
            </div>
        </section>
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
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html
        generateSEOConfig({
            title: 'Find Bangladeshi products at lowest prices for many categories',
            description:
                'Find products include laptops, smartphones, tablets, televisions and more at lowest prices from top Bangladeshi retailers.',
            canonical: 'https://daam.deals/categories',
        })
    }
    
    {#if categories.length > 0}
        <!-- ItemList Structured Data for Categories -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html
            generateLdJSON(JSON.stringify(generateItemListStructuredData(
                categories.map((category, index) => ({
                    name: category.name,
                    url: `https://daam.deals/products?category_id=${category.id}`,
                    position: index + 1
                }))
            ), null, 2))
        }
    {/if}
</svelte:head>

<style>
    .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .categories-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        padding: 1rem 1.25rem;
        border-radius: 12px;
        border: 1px solid rgba(37, 99, 235, 0.15);
        background: rgba(219, 234, 254, 0.45);
        color: #1f3d8a;
    }

    .categories-info__icon {
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.12);
        color: inherit;
        flex-shrink: 0;
    }

    .categories-info__copy {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .categories-info__copy h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: inherit;
    }

    .categories-info__copy p {
        margin: 0;
        font-size: 0.95rem;
        color: rgba(30, 64, 175, 0.9);
    }

    .categories-info__copy a {
        font-weight: 600;
        color: #1d4ed8;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
    }

    .categories-info__copy a:hover {
        color: #1e40af;
    }

    @media (max-width: 640px) {
        .categories-info {
            flex-direction: column;
            align-items: flex-start;
        }

        .categories-info__icon {
            width: 38px;
            height: 38px;
        }
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
