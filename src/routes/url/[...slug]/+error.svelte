<script lang="ts">
    import NoResult from '$lib/components/NoResult.svelte';
    import { page } from '$app/state';
</script>

{#if page.status === 500}
    <NoResult
        message="Something went wrong on our end."
        suggestion="Please try again later."
    />
{:else}
    <NoResult
        message="We couldn't find a product for this link."
        suggestion="Double-check the URL or try searching from the products page."
    />
{/if}
