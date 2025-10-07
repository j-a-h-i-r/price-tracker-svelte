<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { userState } from '$lib/user.svelte.js';
    import { executeUpdateMetadataTask } from '$lib/api/tasks.js';
    import { toasts } from '$lib/states/toast.svelte.js';
    
    let isUpdatingMetadata = $state(false);
    let updateStatus = $state('');
    
    onMount(() => {
        if (!userState.isAdmin) {
            goto('/');
        }
    });
    
    async function updateMetadata() {
        isUpdatingMetadata = true;
        updateStatus = 'Starting metadata update...';
        const response = await executeUpdateMetadataTask();
        if (response.isOk()) {
            updateStatus = 'Metadata update task started successfully';
        } else {
            toasts.error('Failed to start metadata update');
        }
        isUpdatingMetadata = false;
    }
</script>

<div class="container">
    <div class="header">
        <h1>Admin Tasks</h1>
        <a href="/admin" class="back-link">← Back to Dashboard</a>
    </div>
    
    <div class="tasks-grid">
        <div class="task-card">
            <div class="task-header">
                <h2>Update Metadata</h2>
                <p>Update metadata for all products in the database</p>
            </div>
            
            <div class="task-actions">
                <button 
                    class="run-btn"
                    disabled={isUpdatingMetadata}
                    onclick={updateMetadata}
                >
                    {isUpdatingMetadata ? 'Running...' : 'Run Task'}
                </button>
            </div>
            
            {#if updateStatus}
                <div class="status-message" class:error={updateStatus.includes('Failed')}>
                    {updateStatus}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .container {
        max-width: 64rem;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
        margin: 0;
    }

    .back-link {
        color: #4b5563;
        text-decoration: none;
        font-size: 0.875rem;
        transition: color 0.2s;
    }

    .back-link:hover {
        color: #111827;
    }

    .tasks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .task-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1.5rem;
    }

    .task-header {
        margin-bottom: 1.5rem;
    }

    .task-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
    }

    .task-header p {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .task-actions {
        margin-bottom: 1rem;
    }

    .run-btn {
        background-color: #2563eb;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.2s;
        cursor: pointer;
    }

    .run-btn:hover:not(:disabled) {
        background-color: #1d4ed8;
    }

    .run-btn:disabled {
        background-color: #93c5fd;
        cursor: not-allowed;
    }

    .status-message {
        padding: 0.75rem;
        border-radius: 6px;
        background-color: #f3f4f6;
        color: #374151;
        font-size: 0.875rem;
        margin-top: 1rem;
    }

    .status-message.error {
        background-color: #fee2e2;
        color: #991b1b;
    }
</style>
