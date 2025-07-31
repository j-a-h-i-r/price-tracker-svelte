<script lang="ts">
    export let size: 'sm' | 'md' | 'lg' = 'md';
    export let color: string = '#2563eb';
    export let inline: boolean = false;
</script>

<div class="spinner-container" class:inline>
    <div class="spinner {size}" style="border-top-color: {color}; border-right-color: {color}"></div>
</div>

<style>
    .spinner-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
    }

    .spinner-container.inline {
        display: inline-flex;
        padding: 0;
    }

    .spinner {
        border: 2px solid #e5e7eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .spinner.sm {
        width: 16px;
        height: 16px;
        border-width: 2px;
    }

    .spinner.md {
        width: 24px;
        height: 24px;
        border-width: 2px;
    }

    .spinner.lg {
        width: 32px;
        height: 32px;
        border-width: 3px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>
