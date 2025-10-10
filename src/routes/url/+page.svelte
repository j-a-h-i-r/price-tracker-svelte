<script lang="ts">
    import { goto } from '$app/navigation';

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

<div class="url-landing">
    <section class="hero-card">
        <header class="hero-header">
            <p class="eyebrow">Direct Lookup</p>
            <h1>Check a product by URL</h1>
            <p class="subtitle">Paste a store link to see the latest prices, availability, metadata, and badges collected by Daam.</p>
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

    <section class="tips-card">
        <h2>What to expect</h2>
        <ul>
            <li>Matching is exact—use the full product URL from the source website.</li>
            <li>If we can't find the product, you'll see guidance on other ways to search.</li>
        </ul>
    </section>
</div>

<style>
    .url-landing {
        display: grid;
        gap: 1.5rem;
        padding: 1.5rem 0;
    }

    @media (min-width: 900px) {
        .url-landing {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
            align-items: start;
        }
    }

    .hero-card,
    .tips-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1.75rem;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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

    .tips-card h2 {
        font-size: 1.25rem;
        margin: 0;
        color: #0f172a;
    }

    .tips-card ul {
        list-style: disc;
        padding-left: 1.25rem;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        color: #475569;
    }

    .tips-card li {
        line-height: 1.5;
    }
</style>
