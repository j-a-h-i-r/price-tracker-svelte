<script lang="ts">
    import type { Snippet } from 'svelte';
    import LoadingSpinner from './LoadingSpinner.svelte';
    interface Props {
        children?: Snippet;
        headerText: string;
        subText?: string;
    }
    let { children, headerText, subText }: Props = $props();
</script>

<div class="loading-container">
    <LoadingSpinner size="lg" />
    {#if children}
        {@render children()}
    {:else}
        <div class="loading-text">
            <h3>{headerText}</h3>
            {#if subText}
                <p>{subText}</p>
            {/if}
        </div>
    {/if}
</div>

<style>
    /* Loading styles */
    .loading-container {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        min-height: 300px;
    }

    .loading-text {
        margin-top: 1.5rem;
    }

    .loading-text h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
    }

    .loading-text p {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
    }

    @media (max-width: 640px) {
        .loading-container {
            font-size: 1.25rem;
        }
    }
</style>