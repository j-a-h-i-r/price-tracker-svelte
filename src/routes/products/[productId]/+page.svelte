<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { fetchProductPricesById } from '$lib/api/products.js';
    import type { ProductWithPrice } from '$lib/types/Product.js';
    import { onMount } from 'svelte';

    let { productId } = page.params;
    let product: ProductWithPrice | null = $state(null)

    onMount(async () => {
        try {
            product = await fetchProductPricesById(productId);
            console.log($state.snapshot(product))
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    })
    
</script>

<div class="product-details">
    <button class="back-button" onclick={() => goto('/products')}>
        ← Back to Products
    </button>

    <h1>{product?.name}</h1>

    <div class="details">
        {#each (product?.prices ?? []) as price }
        <div class="price-card">
            <div class="price-amount">{price.price}</div>
            <div class="store-info">
                <span class="store-name">{price.website}</span>
                <a href={price.url} target="_blank" rel="noopener noreferrer" class="buy-link">
                    Visit Store →
                </a>
            </div>
        </div>
        {/each}
    </div>

<style>
    .price-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    }

    .price-card:hover {
        transform: translateY(-2px);
    }

    .price-amount {
        font-size: 1.75rem;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 0.5rem;
    }

    .store-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .store-name {
        color: #4b5563;
        font-weight: 500;
    }

    .buy-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .buy-link:hover {
        text-decoration: underline;
    }
</style>
</div>

<style>
    .product-details {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .back-button {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
        margin-bottom: 2rem;
    }

    .back-button:hover {
        background-color: #f8f9fa;
    }

    .details {
        margin-top: 2rem;
    }

    .price {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
        margin-bottom: 1rem;
    }

    .description {
        line-height: 1.6;
        color: #4b5563;
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 1rem;
    }
</style>
