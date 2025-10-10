<script lang="ts">
    const { message, suggestion }: { message: string, suggestion?: string } = $props();
</script>

<div class="no-results">
    <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p>{message}</p>
    {#if suggestion}
        <p class="suggestion">{suggestion}</p>
    {/if}
</div>

<style>
    .no-results {
        background: white;
        border-radius: 8px;
        padding: 3rem 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .no-results .icon {
        width: 48px;
        height: 48px;
        color: #6b7280;
        margin-bottom: 0.5rem;
    }

    .no-results p {
        color: #374151;
        font-size: 1.125rem;
        font-weight: 500;
        margin: 0;
    }

    .no-results .suggestion {
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: normal;
    }
</style>