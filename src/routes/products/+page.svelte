<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { fetchCategories, fetchProducts, type Category } from "$lib/api/products";
    import type { Product } from "$lib/types/Product";
    import Table from "$lib/components/Table.svelte";

    let products: Product[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);

    let categories: Category[] = $state([]);
    let selectedCategory: string | number = $state("all");
    let currentPage = $state(1);
    let itemsPerPage = $state(10);

    let filteredProducts: Product[] = $derived.by(() => {
        return selectedCategory === "all"
            ? products
            : products.filter((p) => p.category_id == selectedCategory);
    })
    let totalPages = $derived(Math.ceil(filteredProducts.length / itemsPerPage));
    let paginatedProducts = $derived.by(() => {
        return filteredProducts.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage,
        )
    });

    const handleRowClick = (row: Product) => {
        goto(`/products/${row.id}`);
    };

    onMount(async () => {
        try {
            products = await fetchProducts();
            categories = await fetchCategories();
            console.log("Fetched products:", products);
        } catch (e) {
            console.error("Error fetching products:", e);
            error = e instanceof Error ? e.message : "An error occurred";
        } finally {
            loading = false;
            console.log("Loading finished", loading);
        }
    });
</script>

<h1>Products</h1>

{#if loading}
    <p>Loading products...</p>
{:else if error}
    <p class="error">{error}</p>
{:else}
    <div class="filters">
        <select bind:value={selectedCategory}>
            <option value="all">All Categories</option>
            {#each categories as category}
                <option value={category?.id}>{category?.name}</option>
            {/each}
        </select>
    </div>

    <Table 
        headers={["Name", "Price", "Description"]}
        keys={["name", "price", "description"]}
        rows={paginatedProducts.map(p => ({
            ...p,
            price: `$${p.price}`
        }))}
        on:rowClick={e => handleRowClick(e.detail)}
    />

    <div class="pagination">
        <button disabled={currentPage === 1} onclick={() => currentPage--}>
            Previous
        </button>

        <span>Page {currentPage} of {totalPages}</span>

        <button disabled={currentPage === totalPages} onclick={() => currentPage++}>
            Next
        </button>
    </div>
{/if}

<style>
    .filters {
        margin: 1rem 0;
        display: flex;
        gap: 1rem;
    }

    select {
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
    }

    .pagination {
        margin: 1rem 0;
        display: flex;
        gap: 1rem;
        align-items: center;
        justify-content: center;
    }

    button {
        padding: 0.5rem 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    button:not(:disabled):hover {
        background-color: #f8f9fa;
    }

    .error {
        color: #ef4444;
        padding: 1rem;
        background-color: #fee2e2;
        border-radius: 4px;
    }

    h1 {
        margin-bottom: 1.5rem;
    }
</style>
