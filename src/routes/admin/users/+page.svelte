<script lang="ts">
    import { onMount } from 'svelte';
    import { userState } from '$lib/shared.svelte.js';
    import { goto } from '$app/navigation';
    import type { User } from '$lib/types/User';

    let users: User[] = $state([]);

    onMount(async () => {
        if (!userState.isAdmin) {
            goto('/');
            return;
        }

        try {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            users = await response.json();
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    });

    const columns = [
        { key: 'id', title: 'ID' },
        { key: 'email', title: 'Email' },
        { key: 'created_at', title: 'Created At', render: (value: string) => new Date(value).toLocaleDateString() }
    ];
</script>

<div class="container">
    <div class="header">
        <h1>Manage Users</h1>
    </div>

    <div class="content">
        <table>
            <thead>
                <tr>
                    {#each columns as column}
                        <th>{column.title}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each users as user}
                    <tr>
                        {#each columns as column}
                            <td>{user[column.key]}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
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

    .content {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        background-color: #f9fafb;
        padding: 0.75rem 1.5rem;
        text-align: left;
        font-size: 0.875rem;
        font-weight: 500;
        color: #4b5563;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
    }

    td {
        padding: 1rem 1.5rem;
        color: #111827;
        font-size: 0.875rem;
        border-bottom: 1px solid #e5e7eb;
    }

    tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover {
        background-color: #f9fafb;
    }

    /* Style specific columns */
    td:first-child {
        font-family: monospace;
        color: #6b7280;
    }

    td:nth-child(2) {
        font-weight: 500;
    }
</style>
