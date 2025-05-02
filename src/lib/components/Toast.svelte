<script lang="ts">
    import { toasts } from '$lib/states/toast';
    import type { Toast } from '$lib/states/toast';
    import { fade, fly } from 'svelte/transition';

    let toastList: Toast[] = $derived($toasts);

    function handleRemove(id: number) {
        toasts.remove(id);
    }
</script>

{#if toastList.length > 0}
    <div class="toast-container">
        {#each toastList as toast (toast.id)}
            <div
                class="toast {toast.type}"
                role="alert"
                transition:fly|local={{ x: 100, duration: 300 }}
            >
                <span class="message">{toast.message}</span>
                <button class="close-btn" onclick={() => handleRemove(toast.id)}>×</button>
            </div>
        {/each}
    </div>
{/if}

<style>
    .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 24rem;
    }

    .toast {
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        animation: slide-in 0.2s ease-out;
    }

    .success {
        background-color: #22c55e;
    }

    .error {
        background-color: #ef4444;
    }

    .info {
        background-color: #3b82f6;
    }

    .message {
        font-size: 0.875rem;
        font-weight: 500;
    }

    .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .close-btn:hover {
        opacity: 1;
    }
</style>