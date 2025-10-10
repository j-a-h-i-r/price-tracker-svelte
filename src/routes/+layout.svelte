<script lang="ts">
	import '../app.css';
	import { userState } from '$lib/user.svelte.js';
	import { goto } from '$app/navigation';
	import Toast from '$lib/components/Toast.svelte';
	import posthog from 'posthog-js';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { toasts } from '$lib/states/toast.js';
    import { page } from '$app/state';
    import { trackedProducts } from '$lib/states/tracked.svelte.js';

	let { children, data } = $props();

	userState.setUser({email: data.user?.email, isAdmin: data.user?.isAdmin});
	if (data.user.isExistingUser && !data.user.email && page.url.pathname !== '/accounts/verify') {
		toasts.error('Failed to fetch user info. Please sign in again.');
	} 
	if (data.user.email && data.trackedProducts.length > 0) {
		trackedProducts.setProducts(data.trackedProducts);
	}
	
	let pathname = $derived(page.url.pathname || '/');

	function gotoAccount() {
		goto('/accounts');
	}

	function toTitleCase(str: string) {
		return str.replace(
			/\w\S*/g,
			(txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
		);
	}

	function generateBreadCrumbs(
		path: string,
	): Array<{ path: string; url: string }> {
		const pathArray = path.split('/').filter((p) => p !== '');
		// Refactor: Let child pages handle the breadcrumbs
		if (pathArray?.[0] === 'url') {
			return [{path: 'URL', url: '/url'}];
		}
		let urlSoFar = '';
		return pathArray.map((p) => {
			urlSoFar += `/${p}`;
			return { path: p, url: urlSoFar };
		});
	}

	onMount(() => {
		if (browser && window.location.hostname !== 'localhost') {
			posthog.init(
				'phc_lMyoqpCqs4BfB8hwKRJydLFZs6P77JgRZffDoiZeopn',
				{
					api_host: 'https://hog.daam.deals/',
					ui_host: 'eu.posthog.com',
					defaults: '2025-05-24',
					person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
				}
			)
		}
	})
</script>

<div class="min-h-screen gradient-bg">
	<Toast />
	<header>
		<nav class="bg-primary border-b" style="border-color: var(--color-border-light);" aria-label="Main navigation">
			<div class="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
				<div class="flex justify-between items-center">
					<nav class="breadcrumb" aria-label="Breadcrumb">
						<ol class="breadcrumb-list">
							<li class="breadcrumb-item">
								<a
									href="/"
									class="breadcrumb-link {pathname === '/'
										? 'active'
										: ''}">Home</a
								>
							</li>
							{#if pathname !== '/'}
								{#each generateBreadCrumbs(pathname.substring(1)) as urlpath, index (index)}
									<li class="breadcrumb-item">
										<svg
											class="breadcrumb-separator"
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											aria-hidden="true"
										>
											<path d="m9 18 6-6-6-6" />
										</svg>
										<a
											href={urlpath.url}
											class="breadcrumb-link {urlpath.url ===
											pathname
												? 'active'
												: ''}"
											>{toTitleCase(urlpath.path)}</a
										>
									</li>
								{/each}
							{/if}
						</ol>
					</nav>
					<div class="flex items-center gap-md">
						<a
							href="https://github.com/j-a-h-i-r/price-tracker-svelte"
							target="_blank"
							rel="noopener noreferrer"
							title="View source code on GitHub"
							aria-label="View source code on GitHub"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
								style="color: var(--color-gray-500);"
							>
								<path
									d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
								/>
							</svg>
						</a>
						{#if userState.isAdmin}
							<a
								href="/admin"
								class="btn btn-ghost"
								>Admin</a
							>
						{/if}
						{#if userState.email}
							<div class="flex items-center gap-md">
								<span class="text-sm text-gray-500 hidden sm:inline"
									>{userState.email}</span
								>
								<button
									onclick={gotoAccount}
									class="btn btn-primary"
								>
									Account
								</button>
							</div>
						{:else}
							<a
								href="/accounts"
								class="btn btn-primary"
							>
								Sign in
							</a>
						{/if}
					</div>
				</div>
			</div>
		</nav>
	</header>
	<main class="container py-4 px-4 lg:px-16 min-[400px]:px-8 mx-auto">
		<div class="sm:max-w-4/5 mx-auto">
		{@render children()}
		</div>
	</main>
</div>

<style>
	.breadcrumb {
		display: flex;
		align-items: center;
	}

	.breadcrumb-list {
		display: flex;
		align-items: center;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.breadcrumb-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.breadcrumb-link {
		text-decoration: none;
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		padding: var(--spacing-xs) var(--spacing-md);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.breadcrumb-link:hover {
		color: var(--color-text-primary);
		background-color: var(--color-bg-tertiary);
	}

	.breadcrumb-link.active {
		color: var(--color-text-primary);
		background-color: var(--color-bg-tertiary);
		font-weight: var(--font-semibold);
	}

	.breadcrumb-separator {
		color: var(--color-text-tertiary);
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.breadcrumb-link {
			padding: var(--spacing-xs) var(--spacing-sm);
			font-size: var(--text-xs);
		}

		.breadcrumb-separator {
			width: 0.875rem;
			height: 0.875rem;
		}
	}
</style>
