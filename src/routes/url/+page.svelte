<script lang="ts">
    import { goto } from '$app/navigation';
    import { generateSEOConfig } from '$lib/seo.js';

    let inputUrl = $state('');
    let errorMessage: string | null = $state(null);
    let isSubmitting = $state(false);

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        const trimmed = inputUrl.trim();
        if (!trimmed) {
            errorMessage = 'Please paste a product URL to continue.';
            return;
        }
        try {
            new URL(trimmed);
        } catch {
            errorMessage = 'That does not seem to be a valid URL.';
            return;
        }
        errorMessage = null;
        isSubmitting = true;
        const encoded = encodeURIComponent(trimmed);
        goto(`/url/${encoded}`);
    }
</script>

<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html generateSEOConfig({
        title: 'Check a product by URL | daam.deals',
        description: 'Paste any retailer product link to view price, availability, and badges.',
        canonical: 'https://daam.deals/url',
    })}
</svelte:head>

<div class="url-landing">
    <section class="hero-card">
        <header class="hero-header">
            <p class="eyebrow">Direct Lookup</p>
            <h1>Check a product by URL</h1>
            <p class="subtitle">Paste a product link to see the latest prices, availability, metadata, and badges.</p>
        </header>

    <form class="lookup-form" onsubmit={handleSubmit}>
            <label for="product-url">Product URL</label>
            <div class="input-row">
                <input
                    id="product-url"
                    type="url"
                    name="product-url"
                    placeholder="https://example.com/product"
                    bind:value={inputUrl}
                    class:error={Boolean(errorMessage)}
                    required
                />
                <button type="submit" class="submit-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Finding…' : 'Find product'}
                </button>
            </div>
            {#if errorMessage}
                <p class="error-text">{errorMessage}</p>
            {/if}
            <p class="helper-text">We'll redirect you to a detail page if we have a match for this URL.</p>
        </form>
    </section>

    <div class="tip-box">
        <div class="tip-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tip-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span class="tip-title">Pro Tip</span>
        </div>
        <p class="tip-text">You can just add <code>https://daam.deals/url/</code> in front of any product URL</p>
        <div class="tip-example">
            <div class="example-row">
                <span class="example-label">Original:</span>
                <code class="example-code">https://startech.com.bd/iphone-15-pro</code>
            </div>
            <div class="example-arrow">↓</div>
            <div class="example-row">
                <span class="example-label">Result:</span>
                <code class="example-code highlight">https://daam.deals/url/https://startech.com.bd/iphone-15-pro</code>
            </div>
        </div>
    </div>
</div>

<style>
    .url-landing {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem 0;
    }

    .hero-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.75rem;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        width: 100%;
    }

    .hero-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .eyebrow {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6366f1;
    }

    h1 {
        font-size: clamp(1.75rem, 2vw + 1.25rem, 2.5rem);
        margin: 0;
        color: #0f172a;
    }

    .subtitle {
        font-size: 1rem;
        line-height: 1.6;
        color: #475569;
        margin: 0;
    }

    .lookup-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    label {
        font-weight: 600;
        color: #1f2937;
    }

    .input-row {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 640px) {
        .input-row {
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
        }
    }

    input[type="url"] {
        flex: 1;
        padding: 0.85rem 1rem;
        border-radius: 10px;
        border: 1px solid #d1d5db;
        background: white;
        font-size: 1rem;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    input[type="url"]:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
    }

    input[type="url"].error {
        border-color: #dc2626;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
    }

    .submit-button {
        padding: 0.85rem 1.5rem;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        white-space: nowrap;
    }

    .submit-button:hover:enabled {
        transform: translateY(-1px);
        box-shadow: 0 10px 24px -12px rgba(37, 99, 235, 0.7);
    }

    .submit-button:disabled {
        opacity: 0.7;
        cursor: progress;
    }

    .error-text {
        color: #dc2626;
        font-size: 0.9rem;
        margin: 0;
    }

    .helper-text {
        font-size: 0.85rem;
        color: #6b7280;
        margin: 0;
    }

    code {
        background: #f3f4f6;
        color: #ff6767;
        padding: 0.2rem 0.4rem;
        border-radius: 6px;
        font-family: 'Fira Code', monospace;
        font-size: 0.875rem;
    }

    .tip-box {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 2px 8px rgba(56, 189, 248, 0.08);
    }

    .tip-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .tip-icon {
        color: #0284c7;
        flex-shrink: 0;
    }

    .tip-title {
        font-weight: 600;
        color: #0c4a6e;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .tip-text {
        color: #075985;
        font-size: 0.9rem;
        margin: 0 0 1rem 0;
        line-height: 1.5;
    }

    .tip-text code {
        background: #fff;
        color: #0284c7;
        border: 1px solid #bae6fd;
        font-weight: 500;
    }

    .tip-example {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #fff;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #e0f2fe;
    }

    .example-row {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    @media (min-width: 640px) {
        .example-row {
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
        }
    }

    .example-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        min-width: 70px;
    }

    .example-code {
        background: #f8fafc;
        color: #475569;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-family: 'Fira Code', monospace;
        font-size: 0.8rem;
        border: 1px solid #e2e8f0;
        word-break: break-all;
        flex: 1;
    }

    .example-code.highlight {
        background: #fef3c7;
        border-color: #fde047;
        color: #78350f;
        font-weight: 500;
    }

    .example-arrow {
        text-align: center;
        color: #0284c7;
        font-size: 1.25rem;
        font-weight: bold;
        margin: 0.25rem 0;
    }
</style>
