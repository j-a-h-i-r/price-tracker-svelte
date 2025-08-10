<script lang="ts">
    import { onMount } from "svelte";
    import { userState } from "$lib/shared.svelte.js";
    import { goto } from "$app/navigation";

    type Product = {
        external_product_id: number;
        internal_product_id: number;
        internal_product_name: string;
        external_product_name: string;
        created_at: string;
        updated_at: string;
        confidence_score?: number;
        run_count: number;
        distinct_group_count: number;
    };

    type Group = {
        id: number;
        group_name: string;
        created_at: string;
        updated_at: string;
        products?: Product[];
    };

    let groups: Group[] = $state([]);
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let selectedProducts: Set<number> = $state(new Set());
    let showMergeModal = $state(false);
    let currentGroupId = $state<number | null>(null);
    let selectedPrimaryProduct = $state<number | null>(null);
    let editingGroupId = $state<number | null>(null);
    let editingGroupName = $state("");

    onMount(async () => {
        // Check if user is admin
        if (!userState.isAdmin) {
            goto("/");
            return;
        }

        await loadGroups();
    });

    async function loadGroups() {
        try {
            isLoading = true;
            const response = await fetch("/api/groups");
            if (!response.ok) {
                throw new Error("Failed to fetch groups");
            }
            groups = await response.json();

            console.log("Loaded groups:", groups);

            // Load products for each group
            await Promise.all(
                groups.map(async (group) => {
                    await loadGroupProducts(group.id);
                }),
            );

            console.log("Selected products:", selectedProducts);

            selectedProducts = new Set(selectedProducts);
        } catch (err) {
            console.error("Error fetching groups:", err);
            error = "Failed to load product groups";
        } finally {
            isLoading = false;
        }
    }

    async function loadGroupProducts(groupId: number) {
        try {
            const response = await fetch(`/api/groups/${groupId}/products`);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch products for group ${groupId}`,
                );
            }
            const products = await response.json();

            // Update the group with its products
            const groupIndex = groups.findIndex((g) => g.id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex].products = products;
            }

            // Mark products as selected
            products.forEach((product: Product) => {
                console.log("Checking product:", product);
                if (
                    product.run_count >= 2 &&
                    product.distinct_group_count === 1
                ) {
                    selectedProducts.add(product.external_product_id);
                }
            });
        } catch (err) {
            console.error(`Error fetching products for group ${groupId}:`, err);
        }
    }

    function toggleProductSelection(productId: number) {
        if (selectedProducts.has(productId)) {
            selectedProducts.delete(productId);
        } else {
            selectedProducts.add(productId);
        }
        selectedProducts = new Set(selectedProducts);
    }

    function toggleSelectAllForGroup(groupId: number) {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return;

        const groupProductIds = group.products.map(p => p.external_product_id);
        const allSelected = groupProductIds.every(id => selectedProducts.has(id));

        if (allSelected) {
            // Deselect all products in this group
            groupProductIds.forEach(id => selectedProducts.delete(id));
        } else {
            // Select all products in this group
            groupProductIds.forEach(id => selectedProducts.add(id));
        }
        selectedProducts = new Set(selectedProducts);
    }

    function isAllSelectedInGroup(groupId: number): boolean {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products || group.products.length === 0) return false;

        const groupProductIds = group.products.map(p => p.external_product_id);
        return groupProductIds.every(id => selectedProducts.has(id));
    }

    function isSomeSelectedInGroup(groupId: number): boolean {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return false;

        const groupProductIds = group.products.map(p => p.external_product_id);
        return groupProductIds.some(id => selectedProducts.has(id));
    }

    function getSelectedProductsInGroup(groupId: number): Product[] {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return [];

        return group.products.filter((product) =>
            selectedProducts.has(product.external_product_id),
        );
    }

    function openMergeModal(groupId: number) {
        const selectedInGroup = getSelectedProductsInGroup(groupId);
        if (selectedInGroup.length < 2) {
            alert("Please select at least 2 products to merge");
            return;
        }

        currentGroupId = groupId;
        selectedPrimaryProduct = null;
        showMergeModal = true;
    }

    function closeMergeModal() {
        showMergeModal = false;
        currentGroupId = null;
        selectedPrimaryProduct = null;
    }

    function handleModalClick(event: MouseEvent) {
        // Check if the click is on the overlay (not the content)
        if (event.target === event.currentTarget) {
            closeMergeModal();
        }
    }

    async function performMerge() {
        if (!currentGroupId || !selectedPrimaryProduct) {
            alert("Please select a primary product");
            return;
        }

        const currentGroup = groups.find((g) => g.id === currentGroupId);
        const selectedInGroup = getSelectedProductsInGroup(currentGroupId);
        const internalProductIdsToMerge = selectedInGroup
            .filter((p) => p.external_product_id !== selectedPrimaryProduct)
            .map((p) => p.internal_product_id);
        const externalProductIdsToMerge = selectedInGroup.map(
            (p) => p.external_product_id,
        );
        const selectPrimaryProductInternalId = selectedInGroup.find(
            (p) => p.external_product_id === selectedPrimaryProduct,
        )?.internal_product_id;

        try {
            const response = await fetch(
                `/api/groups/${currentGroupId}/merge`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        productName: currentGroup?.group_name,
                        primaryInternalProduct: selectPrimaryProductInternalId,
                        internalProductIds: internalProductIdsToMerge,
                        externalProductIds: externalProductIdsToMerge,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error("Failed to merge products");
            }

            alert("Products merged successfully!");
            closeMergeModal();

            // Clear selections and reload data
            selectedProducts.clear();
            selectedProducts = new Set();
            await loadGroups();
        } catch (err) {
            console.error("Error merging products:", err);
            alert("Failed to merge products. Please try again.");
        }
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    function startEditingGroup(groupId: number, currentName: string) {
        editingGroupId = groupId;
        editingGroupName = currentName;
    }

    function cancelEditingGroup() {
        editingGroupId = null;
        editingGroupName = "";
    }

    async function saveGroupName(groupId: number) {
        if (!editingGroupName.trim()) {
            alert("Group name cannot be empty");
            return;
        }

        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ groupName: editingGroupName.trim() }),
            });

            if (!response.ok) {
                throw new Error("Failed to update group name");
            }

            // Update the group in the local state
            const groupIndex = groups.findIndex((g) => g.id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex].group_name = editingGroupName.trim();
            }

            editingGroupId = null;
            editingGroupName = "";
        } catch (err) {
            console.error("Error updating group name:", err);
            alert("Failed to update group name. Please try again.");
        }
    }

    let selectedProductsInCurrentGroup = $derived.by(() => {
        if (!currentGroupId) return [];
        return getSelectedProductsInGroup(currentGroupId);
    });
</script>

<svelte:head>
    <title>Product Groups - Admin</title>
</svelte:head>

<div class="admin-page">
    <div class="page-header">
        <h1>Product Groups</h1>
        <p class="page-description">
            Manage product groups and merge related products for better
            organization.
        </p>
    </div>

    {#if isLoading}
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Loading product groups...</p>
        </div>
    {:else if error}
        <div class="error-container">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h3>Error Loading Groups</h3>
            <p>{error}</p>
        </div>
    {:else}
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{groups.length}</div>
                <div class="stat-label">Total Groups</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">
                    {groups.reduce(
                        (sum, group) => sum + (group.products?.length || 0),
                        0,
                    )}
                </div>
                <div class="stat-label">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{selectedProducts.size}</div>
                <div class="stat-label">Selected Products</div>
            </div>
        </div>

        {#if groups.length > 0}
            <div class="groups-container">
                {#each groups as group}
                    <div class="group-card">
                        <div class="group-header">
                            <div class="group-info">
                                {#if editingGroupId === group.id}
                                    <div class="group-name-edit">
                                        <input
                                            type="text"
                                            bind:value={editingGroupName}
                                            class="group-name-input"
                                            placeholder="Enter group name"
                                            onkeydown={(e) => {
                                                if (e.key === "Enter")
                                                    saveGroupName(group.id);
                                                if (e.key === "Escape")
                                                    cancelEditingGroup();
                                            }}
                                        />
                                        <div class="edit-actions">
                                            <button
                                                class="btn-save-edit"
                                                onclick={() =>
                                                    saveGroupName(group.id)}
                                                title="Save"
                                                aria-label="Save group name"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <polyline
                                                        points="20,6 9,17 4,12"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                class="btn-cancel-edit"
                                                onclick={cancelEditingGroup}
                                                title="Cancel"
                                                aria-label="Cancel editing"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <line
                                                        x1="18"
                                                        y1="6"
                                                        x2="6"
                                                        y2="18"
                                                    />
                                                    <line
                                                        x1="6"
                                                        y1="6"
                                                        x2="18"
                                                        y2="18"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="group-name-display">
                                        <h2 class="group-name">
                                            {group.group_name}
                                        </h2>
                                        <button
                                            class="btn-edit-group"
                                            onclick={() =>
                                                startEditingGroup(
                                                    group.id,
                                                    group.group_name,
                                                )}
                                            title="Edit group name"
                                            aria-label="Edit group name"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path
                                                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                                />
                                                <path
                                                    d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                {/if}
                                <div class="group-meta">
                                    <span>ID: {group.id}</span>
                                    <span
                                        >Created: {formatDate(
                                            group.created_at,
                                        )}</span
                                    >
                                    <span
                                        >Products: {group.products?.length ||
                                            0}</span
                                    >
                                </div>
                            </div>
                            <div class="group-actions">
                                <label class="select-all-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelectedInGroup(group.id)}
                                        indeterminate={!isAllSelectedInGroup(group.id) && isSomeSelectedInGroup(group.id)}
                                        onchange={() => toggleSelectAllForGroup(group.id)}
                                    />
                                    <span class="checkmark"></span>
                                    <span class="checkbox-label">Select All</span>
                                </label>
                                <button
                                    class="merge-btn"
                                    onclick={() => openMergeModal(group.id)}
                                    disabled={getSelectedProductsInGroup(group.id)
                                        .length < 2}
                                >
                                    Merge ({getSelectedProductsInGroup(group.id)
                                        .length})
                                </button>
                            </div>
                        </div>

                        {#if group.products && group.products.length > 0}
                            <div class="products-list">
                                {#each group.products as product}
                                    <div class="product-item">
                                        <label class="product-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.has(
                                                    product.external_product_id,
                                                )}
                                                onchange={() =>
                                                    toggleProductSelection(
                                                        product.external_product_id,
                                                    )}
                                            />
                                            <span class="checkmark"></span>
                                        </label>
                                        <div class="product-info">
                                            <div class="product-name">
                                                {product.external_product_name}
                                            </div>
                                            {#if product.internal_product_name != product.external_product_name}
                                                <div
                                                    class="product-name"
                                                    style="font-size: 0.75rem;"
                                                >
                                                    {product.internal_product_name}
                                                </div>
                                            {/if}
                                            <div class="product-meta">
                                                ID: {product.external_product_id}
                                                • Confidence: {product.confidence_score
                                                    ? product.confidence_score
                                                    : "N/A"} • Group Count: {product.distinct_group_count}
                                            </div>
                                        </div>
                                        <a
                                            href="/products/{product.internal_product_id}"
                                            class="view-product-link"
                                            target="_blank"
                                        >
                                            View
                                        </a>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="empty-products">
                                <p>No products in this group</p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <div class="empty-state">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <h3>No Product Groups</h3>
                <p>No product groups found in the system.</p>
            </div>
        {/if}
    {/if}
</div>

<!-- Merge Modal -->
{#if showMergeModal}
    <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
        tabindex="-1"
        onclick={handleModalClick}
        onkeydown={(e) => e.key === "Escape" && closeMergeModal()}
    >
        <div class="modal-content" role="document">
            <div class="modal-header">
                <h3 id="merge-modal-title">Merge Products</h3>
                <button
                    class="modal-close"
                    onclick={closeMergeModal}
                    aria-label="Close modal"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <div class="merge-icon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="m8 6 4-4 4 4" />
                        <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22" />
                        <path d="m20 22-6.928-6.928A4 4 0 0 1 12 12.3V2" />
                    </svg>
                </div>

                <h4>Merge Selected Products</h4>
                <p>
                    You are about to merge {selectedProductsInCurrentGroup.length}
                    products. Please select which product should be the primary product
                    (all others will be merged into this one).
                </p>

                <div class="products-to-merge">
                    {#each selectedProductsInCurrentGroup as product}
                        <label class="primary-product-option">
                            <input
                                type="radio"
                                name="primaryProduct"
                                value={product.external_product_id}
                                bind:group={selectedPrimaryProduct}
                            />
                            <div class="product-option-content">
                                <div class="product-option-name">
                                    {product.external_product_name}
                                </div>
                                <div class="product-option-meta">
                                    ID: {product.external_product_id}
                                </div>
                            </div>
                        </label>
                    {/each}
                </div>

                <div class="merge-warning">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path
                            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                        />
                        <path d="M12 9v4" />
                        <path d="m12 17 .01 0" />
                    </svg>
                    <span
                        ><strong>Warning:</strong> This action cannot be undone.
                        All non-primary products will be merged into the selected
                        primary product.</span
                    >
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-cancel-modal" onclick={closeMergeModal}
                    >Cancel</button
                >
                <button
                    class="btn-merge-confirm"
                    onclick={performMerge}
                    disabled={!selectedPrimaryProduct}
                >
                    Merge Products
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .admin-page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    .page-header {
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .page-description {
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.5;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: #dc2626;
    }

    .error-container h3 {
        margin: 1rem 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .stat-label {
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .groups-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .group-card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .group-info {
        flex: 1;
    }

    .group-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }

    .group-name-display {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .group-name-display .group-name {
        margin-bottom: 0;
    }

    .btn-edit-group {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.375rem;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-edit-group:hover {
        color: #2563eb;
        background-color: #eff6ff;
    }

    .group-name-edit {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .group-name-input {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        border: 2px solid #2563eb;
        border-radius: 6px;
        padding: 0.375rem 0.75rem;
        background: white;
        outline: none;
        flex: 1;
        min-width: 200px;
    }

    .group-name-input:focus {
        border-color: #1d4ed8;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .edit-actions {
        display: flex;
        gap: 0.25rem;
    }

    .btn-save-edit,
    .btn-cancel-edit {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.375rem;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-save-edit {
        color: #059669;
    }

    .btn-save-edit:hover {
        color: #047857;
        background-color: #ecfdf5;
    }

    .btn-cancel-edit {
        color: #dc2626;
    }

    .btn-cancel-edit:hover {
        color: #b91c1c;
        background-color: #fef2f2;
    }

    .group-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: #6b7280;
    }

    .merge-btn {
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .merge-btn:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
    }

    .merge-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
    }

    .products-list {
        padding: 0;
    }

    .product-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f3f4f6;
        transition: background-color 0.2s;
    }

    .product-item:hover {
        background-color: #f9fafb;
    }

    .product-item:last-child {
        border-bottom: none;
    }

    .product-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
        position: relative;
    }

    .product-checkbox input {
        opacity: 0;
        position: absolute;
        width: 0;
        height: 0;
    }

    .checkmark {
        width: 18px;
        height: 18px;
        border: 2px solid #d1d5db;
        border-radius: 4px;
        background: white;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .product-checkbox input:checked + .checkmark {
        background: #2563eb;
        border-color: #2563eb;
    }

    .product-checkbox input:checked + .checkmark::after {
        content: "✓";
        color: white;
        font-size: 12px;
        font-weight: bold;
    }

    /* Select All checkbox styles */
    .group-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .select-all-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        padding: 0.25rem 0;
    }

    .select-all-checkbox input {
        opacity: 0;
        position: absolute;
        width: 0;
        height: 0;
    }

    .select-all-checkbox .checkmark {
        width: 16px;
        height: 16px;
        border: 2px solid #d1d5db;
        border-radius: 3px;
        background: white;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .select-all-checkbox input:checked + .checkmark {
        background: #2563eb;
        border-color: #2563eb;
    }

    .select-all-checkbox input:checked + .checkmark::after {
        content: "✓";
        color: white;
        font-size: 10px;
        font-weight: bold;
    }

    .select-all-checkbox input:indeterminate + .checkmark {
        background: #6b7280;
        border-color: #6b7280;
    }

    .select-all-checkbox input:indeterminate + .checkmark::after {
        content: "—";
        color: white;
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
    }

    .select-all-checkbox:hover .checkmark {
        border-color: #9ca3af;
    }

    .select-all-checkbox input:checked:hover + .checkmark,
    .select-all-checkbox input:indeterminate:hover + .checkmark {
        opacity: 0.9;
    }

    .checkbox-label {
        user-select: none;
    }

    .product-info {
        flex: 1;
    }

    .product-name {
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .product-meta {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .view-product-link {
        color: #2563eb;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .view-product-link:hover {
        background: #eff6ff;
        text-decoration: underline;
    }

    .empty-products {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
        font-style: italic;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        color: #6b7280;
    }

    .empty-state h3 {
        margin: 1rem 0 0.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: modalSlideIn 0.2s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 1.5rem 0 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
    }

    .modal-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }

    .modal-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 6px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-close:hover {
        color: #374151;
        background-color: #f3f4f6;
    }

    .modal-body {
        padding: 0 1.5rem;
        text-align: center;
    }

    .merge-icon {
        color: #2563eb;
        margin-bottom: 1rem;
        display: flex;
        justify-content: center;
    }

    .modal-body h4 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 0.75rem;
    }

    .modal-body p {
        color: #6b7280;
        margin-bottom: 1.5rem;
        line-height: 1.5;
        text-align: left;
    }

    .products-to-merge {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        text-align: left;
    }

    .primary-product-option {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .primary-product-option:hover {
        border-color: #2563eb;
        background-color: #f8fafc;
    }

    .primary-product-option input:checked {
        accent-color: #2563eb;
    }

    .primary-product-option:has(input:checked) {
        border-color: #2563eb;
        background-color: #eff6ff;
    }

    .product-option-content {
        flex: 1;
    }

    .product-option-name {
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 0.25rem;
    }

    .product-option-meta {
        font-size: 0.75rem;
        color: #6b7280;
    }

    .merge-warning {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 0.75rem;
        font-size: 0.875rem;
        color: #92400e;
        text-align: left;
    }

    .merge-warning svg {
        margin-top: 0.125rem;
        flex-shrink: 0;
    }

    .modal-footer {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;
        margin-top: 1.5rem;
    }

    .btn-cancel-modal {
        padding: 0.5rem 1rem;
        background: transparent;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-cancel-modal:hover {
        background-color: #f3f4f6;
        border-color: #9ca3af;
    }

    .btn-merge-confirm {
        padding: 0.5rem 1rem;
        background: #dc2626;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-merge-confirm:hover:not(:disabled) {
        background: #b91c1c;
    }

    .btn-merge-confirm:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    @media (max-width: 768px) {
        .admin-page {
            padding: 1rem;
        }

        .group-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
        }

        .group-meta {
            flex-direction: column;
            gap: 0.25rem;
        }

        .product-item {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
        }

        .product-checkbox {
            align-self: flex-start;
        }

        .modal-content {
            margin: 1rem;
            max-width: none;
        }

        .modal-footer {
            flex-direction: column;
        }

        .btn-cancel-modal,
        .btn-merge-confirm {
            width: 100%;
            justify-content: center;
        }

        .group-name-edit {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
        }

        .edit-actions {
            justify-content: center;
        }

        .group-name-input {
            min-width: unset;
        }
    }
</style>
