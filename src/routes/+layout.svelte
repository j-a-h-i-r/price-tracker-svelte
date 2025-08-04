<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { userState } from '$lib/shared.svelte.js';
    import { goto } from '$app/navigation';
    import Toast from '$lib/components/Toast.svelte';
	let { children } = $props();

	let pathname = $derived($page?.url?.pathname || '/');

	function gotoAccount() {
		goto('/accounts');
	}

	function toTitleCase(str: string) {
		return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
	}

	function generateBreadCrumbs(path: string): Array<{ path: string; url: string }> {
		const pathArray = path.split('/').filter((p) => p !== '');
		let urlSoFar = '';
		return pathArray.map((p) => {
			urlSoFar += `/${p}`;
			return { path: p, url: urlSoFar };
		});
	}
</script>

<div class="min-h-screen bg-gray-50">
    <Toast />
	<nav class="bg-white border-b border-gray-200">
		<div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex justify-between items-center">
				<div class="flex items-center space-x-2 text-sm text-gray-600">
					<a href="/" class="hover:text-gray-900">Home</a>
					{#if pathname !== '/'}
						<span>/</span>
						{#each generateBreadCrumbs(pathname.substring(1)) as urlpath}
							<a href={urlpath.url} class="hover:text-gray-900">{toTitleCase(urlpath.path)} /</a>
						{/each}
					{/if}
				</div>
				<div class="flex items-center gap-4">
					<a 
						href="https://github.com/j-a-h-i-r/price-tracker-svelte" 
						target="_blank" 
						rel="noopener noreferrer"
						class="group text-sm text-gray-600 hover:text-gray-900 flex items-center transition-all duration-300"
						title="View source code on GitHub"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="flex-shrink-0">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
						<span class="ml-1 max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out">
							View in GitHub
						</span>
					</a>
					{#if userState.isAdmin}
						<a href="/admin" class="text-sm text-gray-600 hover:text-gray-900">Admin</a>
					{/if}
					{#if userState.email}
						<div class="flex items-center gap-4">
							<span class="text-sm text-gray-600 hidden sm:inline">{userState.email}</span>
							<button
								onclick={gotoAccount}
								class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
							>
								Account
							</button>
						</div>
					{:else}
						<a
							href="/accounts"
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Sign in
						</a>
					{/if}
				</div>
			</div>
		</div>
	</nav>
	<main class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
		{@render children()}
	</main>
</div>
