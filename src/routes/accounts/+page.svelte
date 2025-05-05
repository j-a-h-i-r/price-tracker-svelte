<script lang="ts">
    import { userState } from '$lib/shared.svelte.js';
    import { onMount } from 'svelte';
    import { trackedProducts } from '$lib/states/tracked.svelte.js';

    let email = '';
    let message = '';
    let isLoading = false;
    let isSignedIn = false;

    onMount(async () => {
        if (userState.email) {
            email = userState.email;
            isSignedIn = true;
        }
    });

    async function handleSignup() {
        isLoading = true;
        try {
            const response = await fetch('/api/auth/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            if (result === true) {
                message = 'Check your email for an authorization link';
                email = '';
            }
        } catch (error) {
            message = 'An error occurred. Please try again.';
        }
        isLoading = false;
    }

    async function signOut() {
        await fetch('/api/auth/logout', { method: 'POST' });
        userState.signOut();
        isSignedIn = false;
        trackedProducts.clear();
        email = '';
    }

    async function handleUntrack(productId: number) {
        try {
            const response = await fetch(`/api/products/${productId}/track`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to untrack product');
            }
            
            await trackedProducts.refresh();
        } catch (error) {
            console.error('Error untracking product:', error);
            alert('Failed to untrack product. Please try again.');
        }
    }
</script>

{#if isSignedIn}
    <div class="outer-container">
        <button class="logout-button" on:click={signOut}>
            Sign Out
        </button>
        <div class="container">
            <div class="header">
                <h1>Your Tracked Products</h1>
            </div>
            
            {#if trackedProducts.products.length === 0}
                <p class="empty-state">You haven't tracked any products yet.</p>
            {:else}
                <div class="products-grid">
                    {#each trackedProducts.products as product}
                        <div class="product-card">
                            <div class="product-header">
                                <h3>
                                    <a href={`products/${product.id}`}>{product.name}</a>
                                </h3>
                                <button 
                                    class="untrack-button"
                                    on:click={() => handleUntrack(product.id)}
                                >
                                    Untrack
                                </button>
                            </div>
                            <p class="price">Current price: ৳{product.currentPrice}</p>
                            <p class="target">Target price: ৳{product.targetPrice}</p>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
{:else}
    <div class="container">
        <h1>Sign In</h1>
        
        <form on:submit|preventDefault={handleSignup}>
            <div class="form-group">
                <label for="email">Email address</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    required
                    placeholder="Enter your email"
                />
            </div>

            {#if message}
                <div class="message {message.includes('Check your email') ? 'success' : 'error'}">
                    {message}
                </div>
            {/if}

            <button
                type="submit"
                disabled={isLoading}
            >
                {isLoading ? 'Signing up...' : 'Sign up'}
            </button>
        </form>
    </div>
{/if}

<style>
    .container {
        max-width: 28rem;
        margin: 4rem auto 0;
        padding: 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    h1 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #111827;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #374151;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .message {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    .success {
        background-color: #ecfdf5;
        color: #047857;
    }

    .error {
        background-color: #fef2f2;
        color: #b91c1c;
    }

    button {
        width: 100%;
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #1d4ed8;
    }

    button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .product-card {
        padding: 1rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #f9fafb;
    }

    .product-card h3 {
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }

    .price, .target {
        font-size: 0.875rem;
        color: #374151;
    }

    .empty-state {
        text-align: center;
        color: #6b7280;
        padding: 2rem 0;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .header h1 {
        margin-bottom: 0;
    }

    .outer-container {
        position: relative;
        max-width: 28rem;
        margin: 4rem auto 0;
    }

    .logout-button {
        position: absolute;
        top: -2.5rem;
        right: 1.5rem;
        width: auto;
        background-color: #ef4444;
    }

    .logout-button:hover {
        background-color: #dc2626;
    }

    .product-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.5rem;
    }

    .untrack-button {
        width: auto;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background-color: #dc2626;
    }

    .untrack-button:hover {
        background-color: #b91c1c;
    }
</style>