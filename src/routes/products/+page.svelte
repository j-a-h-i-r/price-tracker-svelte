<script lang="ts">
    import { onMount } from "svelte";
    import { fetchCategories, fetchProducts, type Category } from "$lib/api/products";
    import type { Product } from "$lib/types/Product";

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

    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            {#each paginatedProducts as product}
                <tr>
                    <td>{product.name}</td>
                    <td>${product.price}</td>
                    <td>{product.description}</td>
                </tr>
            {/each}
        </tbody>
    </table>

    <div class="pagination">
        <button disabled={currentPage === 1} onclick={() => currentPage--}
            >Previous</button
        >

        <span>Page {currentPage} of {totalPages}</span>

        <button
            disabled={currentPage === totalPages}
            onclick={() => currentPage++}>Next</button
        >
    </div>
{/if}

<style>
    .filters {
        margin: 1rem 0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 0.5rem;
        text-align: left;
        border: 1px solid #ddd;
    }

    .pagination {
        margin: 1rem 0;
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .error {
        color: red;
    }
</style>
