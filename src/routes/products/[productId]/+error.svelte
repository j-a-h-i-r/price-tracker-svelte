<script lang="ts">
    import { goto } from '$app/navigation';
</script>

<div class="product-not-found">
    <div class="not-found-icon-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="not-found-icon">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
    </div>
    <h1>Product Not Found</h1>
    <p class="not-found-description">
        The product you're looking for doesn't exist or may have been removed. This could happen if:
    </p>
    <ul class="not-found-reasons">
        <li>The product ID is incorrect</li>
        <li>The product has been discontinued</li>
        <li>The product has been merged with another product</li>
    </ul>
    <p class="not-found-suggestion">
        You can browse other products or go back to the home page.
    </p>
    <div class="not-found-actions">
        <button onclick={() => goto('/')} class="btn-go-home">Go to Home</button>
        <button onclick={() => goto('/products')} class="btn-browse-products">Browse Products</button>
    </div>
</div>

<style>
    /* Product Not Found Styles */
    .product-not-found {
        max-width: 600px;
        margin: 0 auto;
        padding: 3rem 2rem;
        text-align: center;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .product-not-found h1 {
        color: #1f2937;
        font-size: 2rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .not-found-icon-container {
        margin-bottom: 2rem;
    }

    .not-found-description {
        color: #6b7280;
        font-size: 1.125rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    .not-found-reasons {
        text-align: left;
        color: #6b7280;
        font-size: 1rem;
        margin: 1.5rem auto;
        padding-left: 1.5rem;
        max-width: 400px;
    }

    .not-found-reasons li {
        margin-bottom: 0.75rem;
        line-height: 1.5;
    }

    .not-found-suggestion {
        color: #6b7280;
        font-size: 1.125rem;
        margin: 1.5rem 0 2rem 0;
        line-height: 1.6;
    }

    .not-found-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }

    .btn-go-home {
        padding: 0.75rem 1.5rem;
        background: #6b7280;
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
    }

    .btn-go-home:hover {
        background: #4b5563;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .btn-browse-products {
        padding: 0.75rem 1.5rem;
        background: #2563eb;
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
    }

    .btn-browse-products:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .not-found-icon-container {
        display: flex;
        justify-content: center;
    }

    .not-found-icon {
        color: #dc2626;
    }

    @media (max-width: 640px) {
        .product-not-found {
            padding: 2rem 1.5rem;
        }

        .product-not-found h1 {
            font-size: 1.75rem;
        }

        .btn-go-home,
        .btn-browse-products {
            width: 100%;
            max-width: 200px;
        }

        .not-found-actions {
            flex-direction: column;
            align-items: center;
        }
    }
</style>