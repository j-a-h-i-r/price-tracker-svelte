<script lang="ts">
    import { userState } from '$lib/shared.svelte.js';
    import { onMount } from 'svelte';
    import { trackedProducts } from '$lib/states/tracked.svelte.js';
    import { formatPrice } from '$lib/util.js';
    import { page } from '$app/state';
    import { logIn } from '$lib/api/auth.js';

    let email = $state('');
    let message = $state('');
    let authEmailSentSuccess = $state(false);
    let isLoading = $state(false);
    let isSignedIn = $state(false);
    let redirectUrlAfterLogin = $state('');
    let showConfirmDialog = $state(false);
    let productToUntrack: { id: number; name: string } | null = $state(null);

    onMount(async () => {
        if (userState.email) {
            email = userState.email;
            isSignedIn = true;
            // Refresh tracked products when user is signed in
            await trackedProducts.refresh();
        }
    });

    onMount(() => {
        const { redirectTo } = page.state as { redirectTo: string };
        if (redirectTo) {
            redirectUrlAfterLogin = redirectTo;
        }
    });

    async function handleSignup() {
        isLoading = true;
        const response = await logIn(email, redirectUrlAfterLogin)
        if (response.isOk()) {
            authEmailSentSuccess = true;
            message = 'An authorization link has been sent to your email. Visit the link to complete your login.';
            email = '';
        } else {
            console.error('Error during login:', response.error);
            authEmailSentSuccess = false;
            message = 'An error occurred. Please try again.';
        }
        isLoading = false;
    }

    async function signOut() {
        await userState.signOut();
        isSignedIn = false;
        trackedProducts.clear();
        email = '';
    }

    async function handleUntrack(productId: number, productName: string) {
        productToUntrack = { id: productId, name: productName };
        showConfirmDialog = true;
    }

    async function confirmUntrack() {
        if (!productToUntrack) return;

        try {
            const response = await fetch(
                `/api/products/${productToUntrack.id}/track`,
                {
                    method: 'DELETE',
                },
            );

            if (!response.ok) {
                throw new Error('Failed to untrack product');
            }

            await trackedProducts.refresh();
            showConfirmDialog = false;
            productToUntrack = null;
        } catch (error) {
            console.error('Error untracking product:', error);
            alert('Failed to untrack product. Please try again.');
        }
    }

    function cancelUntrack() {
        showConfirmDialog = false;
        productToUntrack = null;
    }
</script>

{#if isSignedIn}
    <div class="app-container">
        <div class="header-section">
            <h1 class="page-title">Tracked Products</h1>
            <button class="logout-button" on:click={signOut}>
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16,17 21,12 16,7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
            </button>
        </div>
        <div class="content">
            {#if trackedProducts.products.length === 0}
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <h3>No tracked products</h3>
                    <p>
                        Start tracking products to monitor their prices and get
                        notified when they drop below your target.
                    </p>
                </div>
            {:else}
                <div class="products-list">
                    {#each trackedProducts.products as product}
                        <div class="product-item">
                            <div class="status-indicator">
                                {#if product.current_price <= product.target_price}
                                    <div class="status-icon success">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <polyline points="20,6 9,17 4,12"
                                            ></polyline>
                                        </svg>
                                    </div>
                                    <span class="status-text success"
                                        >Target reached</span
                                    >
                                {:else}
                                    <div class="status-icon pending">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <circle cx="12" cy="12" r="10"
                                            ></circle>
                                            <polyline points="12,6 12,12 16,14"
                                            ></polyline>
                                        </svg>
                                    </div>
                                    <span class="status-text pending"
                                        >Monitoring price</span
                                    >
                                {/if}
                            </div>

                            <div class="product-main">
                                <div class="product-info">
                                    <h3 class="product-name">
                                        <a
                                            href={`products/${product.product_id}`}
                                            >{product.name}</a
                                        >
                                    </h3>
                                    <div class="product-pricing">
                                        <div class="price-row">
                                            <span class="price-label"
                                                >Current Price</span
                                            >
                                            <span
                                                class="price-value current-price"
                                            >
                                                {formatPrice(
                                                    product.current_price,
                                                )}
                                            </span>
                                        </div>
                                        <div class="price-row">
                                            <span class="price-label"
                                                >Target Price</span
                                            >
                                            <span
                                                class="price-value target-price"
                                            >
                                                {formatPrice(
                                                    product.target_price,
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Price Difference Display -->
                                    <div class="price-difference">
                                        {#if product.current_price <= product.target_price}
                                            <span class="difference-text">
                                                Price is
                                                <span
                                                    class="difference-amount lower"
                                                >
                                                    {formatPrice(
                                                        product.target_price -
                                                            product.current_price,
                                                    )}
                                                </span>
                                                lower than target price
                                            </span>
                                        {:else}
                                            <span class="difference-text">
                                                Price is
                                                <span
                                                    class="difference-amount higher"
                                                >
                                                    {formatPrice(
                                                        product.current_price -
                                                            product.target_price,
                                                    )}
                                                </span>
                                                higher than target price
                                            </span>
                                        {/if}
                                    </div>
                                </div>

                                <button
                                    class="untrack-button"
                                    on:click={() =>
                                        handleUntrack(
                                            product.product_id,
                                            product.name,
                                        )}
                                    title="Stop tracking this product"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18"
                                        ></line>
                                        <line x1="6" y1="6" x2="18" y2="18"
                                        ></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Confirmation Dialog -->
        {#if showConfirmDialog}
            <div class="modal-overlay" on:click={cancelUntrack}>
                <div
                    class="modal-content"
                    on:click={(e) => e.stopPropagation()}
                >
                    <div class="modal-header">
                        <h3>Confirm Untrack</h3>
                    </div>
                    <div class="modal-body">
                        <p>
                            Are you sure you want to stop tracking this product?
                        </p>
                        {#if productToUntrack}
                            <p class="product-name-confirm">
                                <strong>{productToUntrack.name}</strong>
                            </p>
                        {/if}
                        <p class="warning-text">
                            You will no longer receive price alerts for this
                            product.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" on:click={cancelUntrack}
                            >Cancel</button
                        >
                        <button class="btn-confirm" on:click={confirmUntrack}
                            >Untrack Product</button
                        >
                    </div>
                </div>
            </div>
        {/if}
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
                <div
                    class="message {
                        authEmailSentSuccess
                            ? 'success'
                            : 'error'}"
                >
                    {message}
                </div>
            {/if}

            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
    </div>
{/if}

<style>
    .app-container {
        min-height: 100vh;
        background: #f8f9fa;
        display: flex;
        flex-direction: column;
        max-width: 480px;
        margin: 0 auto;
        position: relative;
    }

    .header-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
    }

    .header-section .page-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #212529;
        margin: 0;
    }

    .header-section .logout-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .header-section .logout-button:hover {
        background: #c82333;
    }

    .header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        background: white;
        border-bottom: 1px solid #e9ecef;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .back-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: none;
        border: none;
        color: #6c757d;
        font-size: 0.9rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s;
    }

    .back-button:hover {
        background: #f8f9fa;
    }

    .page-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #212529;
        margin: 0;
    }

    .logout-button {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s;
        width: auto;
        position: static;
    }

    .content {
        flex: 1;
        padding: 1.5rem;
        padding-bottom: 5rem;
    }

    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #6c757d;
    }

    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .empty-state h3 {
        font-size: 1.2rem;
        color: #212529;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }

    .empty-state p {
        font-size: 0.9rem;
        line-height: 1.5;
        max-width: 280px;
        margin: 0 auto;
    }

    .products-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .product-item {
        background: white;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .product-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .status-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .status-icon.success {
        background: #d4edda;
        color: #155724;
    }

    .pending {
        background: #fff3cd;
        color: #856404;
    }

    .status-text {
        font-size: 0.85rem;
        font-weight: 500;
    }

    .status-text.success {
        color: #155724;
        padding: 0.1rem 0.5rem;
        border-radius: 6px;
    }

    .status-text.pending {
        color: #856404;
        padding: 0.1rem 0.5rem;
        border-radius: 6px;
    }

    .product-main {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
    }

    .product-info {
        flex: 1;
        min-width: 0;
    }

    .product-name {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        line-height: 1.3;
    }

    .product-name a {
        color: #212529;
        text-decoration: none;
    }

    .product-name a:hover {
        color: #007bff;
    }

    .product-pricing {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .price-label {
        font-size: 0.8rem;
        color: #6c757d;
        font-weight: 500;
    }

    .price-value {
        font-size: 0.9rem;
        font-weight: 600;
    }

    .current-price {
        color: #212529;
    }

    .target-price {
        color: #6c757d;
    }

    .price-difference {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #f1f3f4;
    }

    .difference-text {
        font-size: 0.85rem;
        color: #495057;
        line-height: 1.4;
    }

    .difference-amount {
        font-weight: 600;
        font-size: 0.9rem;
    }

    .difference-amount.lower {
        color: #28a745;
    }

    .difference-amount.higher {
        color: #dc3545;
    }

    .untrack-button {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: background-color 0.2s;
        width: auto;
        flex-shrink: 0;
    }

    .untrack-button:hover {
        background: #f8d7da;
    }

    /* Login form styles */
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

    button[type="submit"] {
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

    button[type="submit"]:hover {
        background-color: #1d4ed8;
    }

    button[type="submit"]:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    button[type="submit"]:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: modalSlideIn 0.2s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    .modal-header {
        padding: 1.5rem 1.5rem 0 1.5rem;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: #212529;
    }

    .modal-body {
        padding: 1rem 1.5rem;
    }

    .modal-body p {
        margin: 0 0 0.75rem 0;
        color: #6c757d;
        line-height: 1.5;
    }

    .product-name-confirm {
        color: #212529 !important;
        font-size: 0.95rem;
        margin: 0.5rem 0 !important;
    }

    .warning-text {
        font-size: 0.85rem;
        color: #dc3545 !important;
    }

    .modal-footer {
        padding: 0 1.5rem 1.5rem 1.5rem;
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
    }

    .btn-cancel {
        background: #6c757d;
        color: white;
        border: none;
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-cancel:hover {
        background: #5a6268;
    }

    .btn-confirm {
        background: #dc3545;
        color: white;
        border: none;
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .btn-confirm:hover {
        background: #c82333;
    }
</style>
