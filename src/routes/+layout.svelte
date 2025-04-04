<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	let { children } = $props();

	function toTitleCase(str: string) {
		return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
	}
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white border-b border-gray-200">
		<div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center space-x-2 text-sm text-gray-600">
				<a href="/" class="hover:text-gray-900">Home</a>
				{#if page.url.pathname !== '/'}
					<span>/</span>
					<span class="text-gray-900">{toTitleCase(page.url.pathname.substring(1))}</span>
				{/if}
			</div>
		</div>
	</nav>
  <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>
</div>
