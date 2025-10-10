<script lang="ts">
    import { onMount } from 'svelte';

    let { children, name } = $props();
    let isOpen = $state(false);

    onMount(() => {
        const closed = localStorage.getItem(`closeable-banner-${name}`);
        if (!closed) {
            isOpen = true;
        }
    })

    function onclose() {
        isOpen = false;
        localStorage.setItem(`closeable-banner-${name}`, 'true');
    }
</script>

{#if isOpen}
    <div class="closeable-banner" role="status" aria-live="polite" data-name={name}>
        <div class="closeable-banner__content">
            {@render children()}
        </div>
        <button
            class="closeable-banner__close"
            name={`banner-${name}-close-btn`}
            onclick={onclose}
            aria-label="Dismiss banner"
            type="button"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="m6 6 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
        </button>
    </div>
{/if}

<style>
    .closeable-banner {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border: 1px solid rgba(59, 130, 246, 0.18);
        border-radius: 0.75rem;
        background: rgba(219, 234, 254, 0.55);
        color: #1e3a8a;
    }

    .closeable-banner__content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    }

    .closeable-banner__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 9999px;
        border: none;
        background: rgba(255, 255, 255, 0.7);
        color: inherit;
        cursor: pointer;
        transition: background-color 0.15s ease;
    }

    .closeable-banner__close:hover {
        background: rgba(255, 255, 255, 0.9);
    }

    .closeable-banner__close:active {
        background: rgba(37, 99, 235, 0.12);
    }

    .closeable-banner__close svg {
        pointer-events: none;
    }

    @media (max-width: 640px) {
        .closeable-banner__content {
            flex-direction: column;
            align-items: flex-start;
        }
    }
</style>
