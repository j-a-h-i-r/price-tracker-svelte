<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { userState } from '$lib/shared.svelte.js';
	let { children } = $props();

	let pathname = $derived($page?.url?.pathname || '/');

	function handleLogout() {
		userState.email = '';
	}

	function toTitleCase(str: string) {
		return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
	}

	function generateBreadCrumbs(path: string): Array<{ path: string; url: string }> {
		// path/sub/anotherpath
		// [{path: 'path', url: '/path'}, {path: 'sub', url: '/path/sub'}]
		const pathArray = path.split('/').filter((p) => p !== '');
		let urlSoFar = '';
		return pathArray.map((p) => {
			urlSoFar += `/${p}`;
			return { path: p, url: urlSoFar };
		});
	}
</script>

<div class="min-h-screen bg-gray-50">
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
				{#if userState.email}
					<div class="flex items-center gap-4">
						<span class="text-sm text-gray-600">{userState.email}</span>
						<button
							onclick={handleLogout}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Sign out
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
	</nav>
	<main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>
