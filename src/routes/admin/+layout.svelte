<script lang="ts">
	import { page } from '$app/stores';
	import { userState } from '$lib/user.svelte.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let { children } = $props();
	
	onMount(() => {
		if (!userState.isAdmin) {
			goto('/');
		}
	});

	const adminPages = [
		{
			path: '/admin',
			title: 'Dashboard',
			icon: '📊',
			description: 'Admin overview'
		},
		{
			path: '/admin/tasks',
			title: 'Tasks',
			icon: '⚙️',
			description: 'Run and monitor admin tasks'
		},
		{
			path: '/admin/similar',
			title: 'Similar Products',
			icon: '🔗',
			description: 'Manage similar products'
		},
		{
			path: '/admin/metadata',
			title: 'Metadata',
			icon: '📝',
			description: 'Manage metadata parsing'
		},
		{
			path: '/admin/users',
			title: 'Users',
			icon: '👥',
			description: 'View and manage user accounts'
		},
		{
			path: '/admin/manufacturers',
			title: 'Manufacturers',
			icon: '🏭',
			description: 'View and manage manufacturers'
		},
		{
			path: '/admin/flags',
			title: 'Product Flags',
			icon: '🚩',
			description: 'Review and manage flagged products'
		},
		{
			path: '/admin/groups',
			title: 'Product Groups',
			icon: '📦',
			description: 'Manage product groups and merge related products'
		},
		{
			path: '/admin/fringegroups',
			title: 'Fringe Groups',
			icon: '📦',
			description: 'Manage fringe groups and merge related products'
		},
	];

	let currentPath = $derived($page?.url?.pathname || '/admin');
	let isSidebarOpen = $state(false);
	let isHovered = $state(true);
</script>

<div class="admin-layout">
	<!-- Floating sidebar trigger area -->
	<div 
		class="sidebar-trigger"
		role="presentation"
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
	></div>

	<!-- Mobile sidebar toggle -->
	<button
		class="sidebar-toggle md:hidden"
		onclick={() => (isSidebarOpen = !isSidebarOpen)}
		aria-label="Toggle sidebar"
	>
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<line x1="3" y1="6" x2="21" y2="6"></line>
			<line x1="3" y1="12" x2="21" y2="12"></line>
			<line x1="3" y1="18" x2="21" y2="18"></line>
		</svg>
	</button>

	<!-- Floating Sidebar -->
	<aside 
		class="sidebar {isHovered || isSidebarOpen ? 'sidebar-visible' : ''}"
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
	>
		<div class="sidebar-header">
			<h2>Admin Panel</h2>
		</div>
		
		<nav class="sidebar-nav">
			{#each adminPages as adminPage (adminPage.path)}
				<a
					href={adminPage.path}
					class="nav-item {currentPath === adminPage.path ? 'active' : ''}"
					onclick={() => (isSidebarOpen = false)}
				>
					<span class="nav-icon">{adminPage.icon}</span>
					<div class="nav-content">
						<span class="nav-title">{adminPage.title}</span>
						<span class="nav-description">{adminPage.description}</span>
					</div>
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Overlay for mobile -->
	{#if isSidebarOpen}
		<div
			class="sidebar-overlay md:hidden"
			role="button"
			tabindex="0"
			onclick={() => (isSidebarOpen = false)}
			onkeydown={(e) => e.key === 'Enter' && (isSidebarOpen = false)}
		></div>
	{/if}

	<!-- Main content -->
	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	.admin-layout {
		display: flex;
		min-height: calc(100vh - 120px);
		position: relative;
	}

	.sidebar-trigger {
		position: fixed;
		top: 0;
		left: 0;
		width: 20px;
		height: 100vh;
		z-index: 45;
		background: transparent;
	}

	.sidebar-toggle {
		position: fixed;
		top: 5rem;
		left: 1rem;
		z-index: 60;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 0.5rem;
		color: #374151;
		transition: all 0.2s;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.sidebar-toggle:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 280px;
		height: 100vh;
		background: white;
		border-right: 1px solid #e5e7eb;
		overflow-y: auto;
		transform: translateX(-100%);
		transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
		z-index: 50;
		box-shadow: 0 0 0 rgba(0, 0, 0, 0);
	}

	.sidebar-visible {
		transform: translateX(0);
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
	}

	.sidebar-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		background: #f8fafc;
	}

	.sidebar-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		margin: 0;
	}

	.sidebar-nav {
		padding: 1rem;
	}

	.nav-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 8px;
		text-decoration: none;
		color: #374151;
		transition: all 0.2s;
		margin-bottom: 0.5rem;
	}

	.nav-item:hover {
		background: #f3f4f6;
		color: #111827;
		transform: translateX(4px);
	}

	.nav-item.active {
		background: #dbeafe;
		color: #1d4ed8;
		border-left: 3px solid #2563eb;
	}

	.nav-icon {
		font-size: 1.25rem;
		margin-top: 0.125rem;
		flex-shrink: 0;
	}

	.nav-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.nav-title {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.nav-description {
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.2;
	}

	.sidebar-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 40;
	}

	.main-content {
		flex: 1;
		width: 100%;
		overflow-x: auto;
		padding: 0;
		min-width: 0;
	}

	/* Mobile styles */
	@media (max-width: 768px) {
		.sidebar-trigger {
			display: none;
		}

		.sidebar {
			transform: translateX(-100%);
		}

		.sidebar-visible {
			transform: translateX(0);
		}
	}

	/* Desktop styles */
	@media (min-width: 769px) {
		.sidebar-toggle {
			display: none;
		}

		.main-content {
			width: 100%;
		}
	}

	/* Show a small indicator when sidebar is hidden */
	.sidebar:not(.sidebar-visible)::before {
		content: '◀';
		position: absolute;
		right: -15px;
		top: 50%;
		transform: translateY(-50%);
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0 8px 8px 0;
		padding: 8px 4px;
		font-size: 12px;
		color: #6b7280;
		z-index: 1;
		transition: all 0.2s;
	}

	@media (max-width: 768px) {
		.sidebar:not(.sidebar-visible)::before {
			display: none;
		}
	}
</style>
