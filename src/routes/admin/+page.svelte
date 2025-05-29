<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { userState } from '$lib/shared.svelte.js';

    onMount(() => {
        if (!userState.isAdmin) {
            goto('/');
        }
    });
</script>

<div class="container">
    <h1>Admin Dashboard</h1>
    
    <div class="grid">
        <button onclick={() => goto('/admin/similar')} class="card">
            <h2>Similar Products</h2>
            <p>Manage similar products</p>
        </button>

        <button onclick={() => goto('/admin/metadata')} class="card">
            <h2>Manage Metadata</h2>
            <p>Manage medatada parsing</p>
        </button>
    </div>
</div>

<style>
    .container {
        max-width: 64rem;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 2rem;
        color: #111827;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .card {
        padding: 1.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        text-align: left;
        transition: all 0.2s;
        cursor: pointer;
    }

    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .card h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #111827;
    }

    .card p {
        color: #6b7280;
        font-size: 0.875rem;
    }
</style>