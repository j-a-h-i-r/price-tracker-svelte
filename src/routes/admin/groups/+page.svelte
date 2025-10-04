<script lang="ts">
    import { onMount } from 'svelte';
    import { userState } from '$lib/shared.svelte.js';
    import { goto } from '$app/navigation';
    import SearchableSelect from '$lib/components/SearchableSelect.svelte';
    import { mergeProductsIntoGroup, deleteGroup as deleteGroupAPI } from '$lib/api/groups.js';
    import { errAsync, ResultAsync } from 'neverthrow';
    import { toasts } from '$lib/states/toast.js';
    import { diffChars } from 'diff';
    
    type Product = {
        internal_product_id: number;
        external_product_id: number;
        external_product_name: string;
        run_count: number;
        avg_confidence: number;
        distinct_groups: number;
        ip_count: number;
        auto_merge_possible: boolean;
        verified_internal_product_id?: number;
    };

    type Group = {
        id: number;
        internal_product_id: number | null;
        group_name: string;
        created_at: string;
        updated_at: string;
        category_id: number;
        manufacturer_id: number;
        auto_merge_eligible: boolean;
        products?: Product[];
    };

    type GroupRun = {
        created_at: string;
        updated_at: string;
        confidence_score: number;
        run_id: number;
        admin_verified_at: string | null;
    };

    type ExternalGroup = {
        group_id: number;
        group_name: string;
        runs: GroupRun[];
    };

    type Category = {
        id: number;
        name: string;
    };

    type Manufacturer = {
        id: number;
        name: string;
    };

    let groups: Group[] = $state([]);
    let categories: Category[] = $state([]);
    let manufacturers: Manufacturer[] = $state([]);
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let selectedProducts: Set<string> = $state(new Set());
    let currentGroupId = $state<number | null>(null);
    let editingGroupId = $state<number | null>(null);
    let editingGroupName = $state('');
    let showGroupsModal = $state(false);
    let currentProductId = $state<number | null>(null);
    let externalGroups = $state<ExternalGroup[]>([]);
    let loadingExternalGroups = $state(false);
    let deletingProducts: Set<string> = $state(new Set());
    
    // Filter states
    let selectedCategoryId = $state<string | number>('all');
    let selectedManufacturerId = $state<string | number>('all');
    let showOnlyEligible = $state(false);
    let minRunsRequired = $state(4);

    onMount(async () => {
        // Check if user is admin
        if (!userState.isAdmin) {
            goto('/');
            return;
        }

        await Promise.all([loadGroups(), loadCategories(), loadManufacturers()]);
    });

    async function loadGroups() {
        try {
            isLoading = true;
            const params = new URLSearchParams();
            
            if (selectedCategoryId && selectedCategoryId !== 'all') {
                params.set('category_id', selectedCategoryId.toString());
            }
            if (selectedManufacturerId && selectedManufacturerId !== 'all') {
                params.set('manufacturer_id', selectedManufacturerId.toString());
            }
            if (showOnlyEligible) {
                params.set('auto_merge_eligible_only', 'true');
            }
            if (minRunsRequired > 0) {
                params.set('min_runs_count', minRunsRequired.toString());
            }

            const url = `/api/groups${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch groups');
            }
            groups = await response.json();

            // Reset selections when groups change
            selectedProducts.clear();

            // Since the API now returns products within each group,
            // we can process them directly without additional API calls
            groups.forEach((group) => {
                if (group.products) {
                    group.products.forEach((product: Product) => {
                        // Auto-select products based on criteria
                        if (product.auto_merge_possible) {
                            selectedProducts.add(`${group.id}_${product.external_product_id}`);
                        }
                    });
                }
            });

            selectedProducts = new Set(selectedProducts);
        } catch (err) {
            console.error('Error fetching groups:', err);
            error = 'Failed to load product groups';
        } finally {
            isLoading = false;
        }
    }

    async function loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            categories = await response.json();
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    }

    async function loadManufacturers() {
        try {
            const response = await fetch('/api/manufacturers');
            if (!response.ok) {
                throw new Error('Failed to fetch manufacturers');
            }
            manufacturers = await response.json();
        } catch (err) {
            console.error('Error fetching manufacturers:', err);
        }
    }

    // Reactive effect to reload groups when filters change
    $effect(() => {
        if (categories.length > 0
            && manufacturers.length > 0 
            && showOnlyEligible !== null
            && minRunsRequired !== null
        ) {
            loadGroups();
        }
    });

    function clearFilters() {
        selectedCategoryId = 'all';
        selectedManufacturerId = 'all';
    }

    function toggleProductSelection(groupId: number, productId: number) {
        if (selectedProducts.has(`${groupId}_${productId}`)) {
            selectedProducts.delete(`${groupId}_${productId}`);
        } else {
            selectedProducts.add(`${groupId}_${productId}`);
        }
        selectedProducts = new Set(selectedProducts);
    }

    function toggleSelectAllForGroup(groupId: number) {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return;

        const groupProductIds = group.products.map(
            (p) => p.external_product_id,
        );
        const allSelected = groupProductIds.every((id) =>
            selectedProducts.has(`${group.id}_${id}`),
        );

        if (allSelected) {
            // Deselect all products in this group
            groupProductIds.forEach((id) => selectedProducts.delete(`${group.id}_${id}`));
        } else {
            // Select all products in this group
            groupProductIds.forEach((id) => selectedProducts.add(`${group.id}_${id}`));
        }
        selectedProducts = new Set(selectedProducts);
    }

    async function loadExternalGroups(externalProductId: number) {
        try {
            loadingExternalGroups = true;
            const response = await fetch(`/api/externals/${externalProductId}/groups`);
            if (!response.ok) {
                throw new Error('Failed to fetch external groups');
            }
            externalGroups = await response.json();
        } catch (err) {
            console.error('Error fetching external groups:', err);
            externalGroups = [];
        } finally {
            loadingExternalGroups = false;
        }
    }

    async function showExternalGroups(externalProductId: number) {
        currentProductId = externalProductId;
        showGroupsModal = true;
        await loadExternalGroups(externalProductId);
    }

    function closeGroupsModal() {
        showGroupsModal = false;
        currentProductId = null;
        externalGroups = [];
    }

    async function deleteProductFromGroup(
        externalProductId: number,
        groupId: number,
    ) {
        const key = `${groupId}_${externalProductId}`;
        if (!confirm('Remove this product from the group?')) return;

        try {
            deletingProducts.add(key);
            deletingProducts = new Set(deletingProducts);

            const response = await fetch(
                `/api/externals/${externalProductId}/groups/${groupId}`,
                {
                    method: 'DELETE',
                },
            );
            if (!response.ok) {
                throw new Error('Failed to remove product from group');
            }

            // Update local state
            const gIdx = groups.findIndex((g) => g.id === groupId);
            if (gIdx !== -1 && groups[gIdx].products) {
                groups[gIdx].products = groups[gIdx].products!.filter(
                    (p) => p.external_product_id !== externalProductId,
                );
            }

            // Remove selection if present
            if (selectedProducts.has(`${groupId}_${externalProductId}`)) {
                selectedProducts.delete(`${groupId}_${externalProductId}`);
                selectedProducts = new Set(selectedProducts);
            }

            // Trigger reactivity for groups
            groups = [...groups];
        } catch (err) {
            console.error('Error removing product from group:', err);
            alert('Failed to remove product. Please try again.');
        } finally {
            deletingProducts.delete(key);
            deletingProducts = new Set(deletingProducts);
        }
    }

    function handleGroupsModalClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            closeGroupsModal();
        }
    }

    function isAllSelectedInGroup(groupId: number): boolean {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products || group.products.length === 0) return false;

        const groupProductIds = group.products.map(
            (p) => p.external_product_id,
        );
        return groupProductIds.every((id) => selectedProducts.has(`${groupId}_${id}`));
    }

    function isSomeSelectedInGroup(groupId: number): boolean {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return false;

        const groupProductIds = group.products.map(
            (p) => p.external_product_id,
        );
        return groupProductIds.some((id) => selectedProducts.has(`${groupId}_${id}`));
    }

    function getSelectedProductsInGroup(groupId: number): Product[] {
        const group = groups.find((g) => g.id === groupId);
        if (!group?.products) return [];

        return group.products.filter((product) =>
            selectedProducts.has(`${groupId}_${product.external_product_id}`),
        );
    }

    function openMergeModal(groupId: number) {
        const selectedInGroup = getSelectedProductsInGroup(groupId);
        if (selectedInGroup.length < 2) {
            alert('Please select at least 2 products to merge');
            return;
        }

        if (confirm(`Merge ${selectedInGroup.length} selected products in this group? This action cannot be undone.`)) {
            currentGroupId = groupId;
            performMerge();
        }
    }

    function doMerge(groupId: number) {
        const currentGroup = groups.find((g) => g.id === groupId);
        if (!currentGroup) {
            return errAsync(new Error('Group not found'));
        }
        const selectedInGroup = getSelectedProductsInGroup(groupId);
        const externalProductIdsToMerge = selectedInGroup
            .map((p) => p.external_product_id);

        return mergeProductsIntoGroup(
            groupId,
            externalProductIdsToMerge,
        )
    }

    async function performMerge() {
        if (!currentGroupId) {
            alert('Please select a primary product');
            return;
        }

        doMerge(currentGroupId).match(
            () => {
                selectedProducts.clear();
                selectedProducts = new Set();
                groups = groups.filter((g) => g.id !== currentGroupId);
                toasts.success('Products merged successfully');
            },
            (err) => {
                console.error('Error merging products:', err);
                alert(err?.data?.error || 'Failed to merge products. Please try again.');
            }
        )
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
        editingGroupName = '';
    }

    async function saveGroupName(groupId: number) {
        if (!editingGroupName.trim()) {
            alert('Group name cannot be empty');
            return;
        }

        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ groupName: editingGroupName.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to update group name');
            }

            // Update the group in the local state
            const groupIndex = groups.findIndex((g) => g.id === groupId);
            if (groupIndex !== -1) {
                groups[groupIndex].group_name = editingGroupName.trim();
            }

            editingGroupId = null;
            editingGroupName = '';
        } catch (err) {
            console.error('Error updating group name:', err);
            alert('Failed to update group name. Please try again.');
        }
    }


    // Function to get border color for contiguous groups with same internal_product_id
    function getContiguousGroupColors(products: Product[]): Map<number, string> {
        const colorMap = new Map<number, string>();
        const colors = [
            '#ef4444', // red-500
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#8b5cf6', // violet-500
            '#ec4899', // pink-500
            '#06b6d4', // cyan-500
            '#84cc16', // lime-500
        ];
        let colorIndex = 0;
        
        let currentInternalId: number | null = null;
        let groupStart = 0;
        
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Check if we're starting a new group
            if (product.external_product_id !== currentInternalId) {
                // Process the previous group if it had 2+ products
                if (currentInternalId !== null && i - groupStart > 1) {
                    const color = colors[colorIndex % colors.length];
                    for (let j = groupStart; j < i; j++) {
                        colorMap.set(j, color);
                    }
                    colorIndex++;
                }
                
                // Start new group
                currentInternalId = product.external_product_id;
                groupStart = i;
            }
        }
        
        // Process the last group if it has 2+ products
        if (currentInternalId !== null && products.length - groupStart > 1) {
            const color = colors[colorIndex % colors.length];
            for (let j = groupStart; j < products.length; j++) {
                colorMap.set(j, color);
            }
        }
        
        return colorMap;
    }

    function mergeAllSelected() {
        if (!confirm('Merge all selected products across all groups? This action cannot be undone.')) {
            return;
        }
        const mergeReqs = groups.map((g) => {
            const selectedInGroup = getSelectedProductsInGroup(g.id);
            const productIds = selectedInGroup.map(p => p.external_product_id);
            return {
                groupId: g.id,
                productIds,
            }
        }).filter((g) => g.productIds.length >= 2)
        .map((g) => {
            return doMerge(g.groupId);
        });

        ResultAsync.combine(mergeReqs).match(
            () => {
                toasts.success('Merged all selected products successfully');
                return loadGroups();
            },
            (err) => {
                console.error('Error merging products:', err);
                toasts.error('Failed to merge some products. Please try again.');
            }
        )
    }

    function clearAllSelections() {
        selectedProducts.clear();
        selectedProducts = new Set();
    }

    async function deleteGroup(groupId: number, groupName: string) {
        if (!confirm(`Are you sure you want to delete the group "${groupName}"? This will permanently remove the group and all its product associations. This action cannot be undone.`)) {
            return;
        }

        await deleteGroupAPI(groupId).match(
            () => {
                toasts.success(`Group "${groupName}" deleted successfully`);
                groups = groups.filter((g) => g.id !== groupId);
            },
            (err) => {
                console.error('Error deleting group:', err);
                toasts.error(`Failed to delete group: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        );
    }
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

    <!-- Filters Section -->
    <div class="filters-section">
        <div class="filters-header">
            <h3>Filters</h3>
            {#if selectedCategoryId !== 'all' || selectedManufacturerId !== 'all'}
                <button class="clear-filters-btn" onclick={clearFilters}>
                    Clear Filters
                </button>
            {/if}
        </div>
        <div class="filters-grid">
            <SearchableSelect 
                options={categories}
                bind:value={selectedCategoryId}
                allLabel="All Categories"
                label="Category"
            />
            <SearchableSelect 
                options={manufacturers}
                bind:value={selectedManufacturerId}
                allLabel="All Manufacturers"
                label="Manufacturer"
            />
            <div>
                <label for="eligible-checkbox" class="checkbox-label">
                    Show Only Auto-Merge Eligible
                </label>
                <input id="eligible-checkbox" type="checkbox" bind:checked={showOnlyEligible} />
            </div>

            <div>
                <label for="min-runs" class="number-input-label">
                    Min Runs Required
                </label>
                <input 
                    id="min-runs"
                    type="number" 
                    min="1" 
                    bind:value={minRunsRequired} 
                    class="number-input"
                />
            </div>
        </div>
    </div>

    <button type="button" class="merge-btn" onclick={mergeAllSelected}>Merge All Selected</button>
    <button type="button" class="merge-btn" onclick={clearAllSelections}>Clear All Selections</button>

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
                {#each groups as group (group.id)}
                    <div class="group-card">
                        <div class={['group-header', group.auto_merge_eligible ? 'eligible' : 'ineligible']}>
                            <div class="group-info">
                                {#if editingGroupId === group.id}
                                    <div class="group-name-edit">
                                        <input
                                            type="text"
                                            bind:value={editingGroupName}
                                            class="group-name-input"
                                            placeholder="Enter group name"
                                            onkeydown={(e) => {
                                                if (e.key === 'Enter')
                                                    saveGroupName(group.id);
                                                if (e.key === 'Escape')
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
                                    <span>
                                        Attached Internal Product ID: {group.internal_product_id}
                                    </span>
                                </div>
                            </div>
                            <div class="group-actions">
                                <label class="select-all-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelectedInGroup(group.id)}
                                        indeterminate={!isAllSelectedInGroup(
                                            group.id,
                                        ) && isSomeSelectedInGroup(group.id)}
                                        onchange={() =>
                                            toggleSelectAllForGroup(group.id)}
                                    />
                                    <span class="checkmark"></span>
                                    <span class="checkbox-label"
                                        >Select All</span
                                    >
                                </label>
                                <button 
                                    class="delete-btn"
                                    onclick={() => deleteGroup(group.id, group.group_name)}
                                >
                                    Delete
                                </button>
                                <button
                                    class="merge-btn"
                                    onclick={() => openMergeModal(group.id)}
                                    disabled={getSelectedProductsInGroup(
                                        group.id,
                                    ).length < 2}
                                >
                                    Merge ({getSelectedProductsInGroup(group.id)
                                        .length})
                                </button>
                            </div>
                        </div>

                        {#if group.products && group.products.length > 0}
                            {@const groupColorMap = getContiguousGroupColors(group.products)}
                            <div class="products-list">
                                {#each group.products as product, index (index)}
                                    <div 
                                        class={['product-item', product.auto_merge_possible ? '' : 'ineligible']}
                                        style:border-left={groupColorMap.has(index) ? 
                                            `4px solid ${groupColorMap.get(index)}` : 
                                            'none'
                                        }
                                    >
                                        <label class="product-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.has(`${group.id}_${product.external_product_id}`)}
                                                onchange={() =>
                                                    toggleProductSelection(
                                                        group.id,
                                                        product.external_product_id,
                                                    )}
                                            />
                                            <span class="checkmark"></span>
                                        </label>
                                        <div class="product-info">
                                            <div class="product-name">
                                                <div {@attach (div) => {
                                                    const spans: string[] = [];
                                                    diffChars(
                                                        group.group_name,
                                                        product.external_product_name,
                                                        { ignoreCase: true }
                                                    ).forEach((part) => {
                                                        if ((part.added || part.removed) === false) {
                                                            spans.push(`<span>${part.value}</span>`);
                                                        } else if (part.added) {
                                                            spans.push(`<span class="diff-added">${part.value}</span>`);
                                                        } else if (part.removed) {
                                                            spans.push(`<span class="diff-removed">${part.value}</span>`);
                                                        }
                                                    })
                                                    div.innerHTML = spans.join('');
                                                }}>
                                                </div>
                                            </div>
                                            <div>
                                                {#if product.verified_internal_product_id}
                                                    <span class="alert">
                                                        This product is previously added to {product.verified_internal_product_id} internal product
                                                    </span>
                                                {/if}
                                                {#if product.distinct_groups > 1}
                                                    <span class="alert">
                                                        This product belongs to {product.distinct_groups} groups
                                                    </span>
                                                {/if}
                                            </div>
                                            <div class="product-meta">
                                                External ID: {product.external_product_id}
                                                • Internal ID: {product.internal_product_id}
                                                • Confidence: {product.avg_confidence
                                                    ? product.avg_confidence
                                                    : 'N/A'}
                                                • Runs: {product.run_count}
                                                • Group Count: {product.distinct_groups}
                                                • Sibling Products: {product.ip_count}
                                            </div>
                                        </div>
                                        <div class="product-actions">
                                            <a
                                                href="/products/{product.internal_product_id}"
                                                class="view-product-link"
                                                target="_blank"
                                            >
                                                View
                                            </a>
                                            <button
                                                class="groups-button"
                                                onclick={() =>
                                                    showExternalGroups(
                                                        product.external_product_id,
                                                    )}
                                                title="View external groups for this product"
                                            >
                                                Groups
                                            </button>
                                            <button
                                                class="delete-button"
                                                onclick={() =>
                                                    deleteProductFromGroup(
                                                        product.external_product_id,
                                                        group.id,
                                                    )}
                                                disabled={deletingProducts.has(
                                                    `${group.id}:${product.external_product_id}`,
                                                )}
                                                title="Remove this product from the group"
                                            >
                                                {deletingProducts.has(
                                                    `${group.id}:${product.external_product_id}`,
                                                )
                                                    ? 'Removing...'
                                                    : 'Remove'}
                                            </button>
                                        </div>
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
                <p>
                    {#if selectedCategoryId !== 'all' || selectedManufacturerId !== 'all'}
                        No product groups found matching the selected filters.
                    {:else}
                        No product groups found in the system.
                    {/if}
                </p>
            </div>
        {/if}
    {/if}
</div>

<!-- External Groups Modal -->
{#if showGroupsModal}
    <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="groups-modal-title"
        tabindex="-1"
        onclick={handleGroupsModalClick}
        onkeydown={(e) => e.key === 'Escape' && closeGroupsModal()}
    >
        <div class="modal-content" role="document">
            <div class="modal-header">
                <h3 id="groups-modal-title">
                    External Groups for Product #{currentProductId}
                </h3>
                <button
                    class="modal-close"
                    onclick={closeGroupsModal}
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
                {#if loadingExternalGroups}
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading external groups...</p>
                    </div>
                {:else if externalGroups.length > 0}
                    <div class="external-groups-list">
                        {#each externalGroups as group (group.group_id)}
                            <div class="external-group-item">
                                <div class="group-main-info">
                                    <h4 class="group-name">
                                        {group.group_name}

                                        <button class="group-delete-btn" onclick={() => deleteGroup(group.group_id, group.group_name)}>Delete</button>
                                    </h4>
                                    <div class="group-id">
                                        Group ID: {group.group_id} ({group.runs.length} runs)
                                    </div>
                                </div>
                                
                                {#if group.runs && group.runs.length > 0}
                                    <div class="runs-section">
                                        {#each group.runs as run, index (index)}
                                            <div class="run-item">
                                                <div class="run-header">
                                                    <span class="run-id">Run #{run.run_id}</span>
                                                    <span class="confidence-score confidence-{Math.floor(run.confidence_score * 10)}">
                                                        {(run.confidence_score * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div class="run-details">
                                                    <div class="detail-row">
                                                        <span class="detail-label">Created:</span>
                                                        <span class="detail-value">
                                                            {new Date(run.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div class="detail-row">
                                                        <span class="detail-label">Updated:</span>
                                                        <span class="detail-value">
                                                            {new Date(run.updated_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <div class="no-runs">
                                        <p>No runs available for this group</p>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="empty-groups">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            />
                            <circle cx="9" cy="9" r="2" />
                            <path
                                d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
                            />
                        </svg>
                        <h4>No External Groups</h4>
                        <p>
                            This product is not associated with any external
                            groups.
                        </p>
                    </div>
                {/if}
            </div>

            <div class="modal-footer">
                <button class="btn-cancel-modal" onclick={closeGroupsModal}>
                    Close
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

    .filters-section {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
    }

    .filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .filters-header h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
    }

    .clear-filters-btn {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 0.375rem;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .clear-filters-btn:hover {
        background: #dc2626;
    }

    .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
    }

    .filter-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .filter-select {
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        color: #1f2937;
        transition: border-color 0.2s;
    }

    .group-delete-btn {
        margin-left: auto;
        background: #ef4444;
        cursor: pointer;
    }

    .filter-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

    .group-header.eligible {
        background-color: #d1ffe9;
    }

    .group-header.ineligible {
        background-color: #ffe1e1;
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

    .delete-btn {
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .delete-btn:hover {
        background: #b91c1c;
        transform: translateY(-1px);
    }

    .delete-btn:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2);
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

    .product-item.ineligible {
        background-color: #fff1f1;
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

    .product-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .groups-button {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .groups-button:hover {
        background: #e5e7eb;
        border-color: #9ca3af;
    }

    .delete-button {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fca5a5;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .delete-button:hover:not(:disabled) {
        background: #fecaca;
        border-color: #f87171;
    }

    .delete-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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

    /* External Groups Modal Styles */
    .external-groups-list {
        max-height: 60vh;
        overflow-y: auto;
        gap: 1rem;
        display: flex;
        flex-direction: column;
    }

    .external-group-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        background: #f9fafb;
    }

    .group-main-info {
        margin-bottom: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.75rem;
    }

    .group-name {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.25rem 0;
    }

    .group-id {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    .group-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
    }

    .detail-label {
        color: #6b7280;
        font-weight: 500;
    }

    .detail-value {
        color: #1f2937;
        font-weight: 600;
    }

    .empty-groups {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        text-align: center;
        color: #6b7280;
    }

    .empty-groups svg {
        margin-bottom: 1rem;
    }

    .empty-groups h4 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.5rem 0;
    }

    .empty-groups p {
        margin: 0;
        font-size: 0.875rem;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        text-align: center;
    }

    .loading-state .loading-spinner {
        margin-bottom: 1rem;
    }

    .loading-state p {
        color: #6b7280;
        margin: 0;
    }

    /* Runs Section Styles */
    .runs-section {
        margin-top: 1rem;
        padding-top: 1rem;
    }

    .runs-title {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 0.75rem 0;
    }

    .run-item {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .run-item:last-child {
        margin-bottom: 0;
    }

    .run-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .run-id {
        font-weight: 600;
        color: #1f2937;
        font-size: 0.875rem;
    }

    .confidence-score {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
    }

    .confidence-10 { background-color: #059669; }
    .confidence-9 { background-color: #10b981; }
    .confidence-8 { background-color: #34d399; }
    .confidence-7 { background-color: #6ee7b7; color: #1f2937; }
    .confidence-6 { background-color: #fbbf24; color: #1f2937; }
    .confidence-5 { background-color: #f59e0b; color: white; }
    .confidence-4 { background-color: #f97316; color: white; }
    .confidence-3 { background-color: #ea580c; color: white; }
    .confidence-2 { background-color: #dc2626; color: white; }
    .confidence-1 { background-color: #b91c1c; color: white; }
    .confidence-0 { background-color: #7f1d1d; color: white; }

    .run-details {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.5rem;
        font-size: 0.75rem;
    }

    .no-runs {
        margin-top: 1rem;
        padding: 1rem;
        text-align: center;
        color: #6b7280;
        font-style: italic;
        border-top: 1px solid #e5e7eb;
    }

    .no-runs p {
        margin: 0;
        font-size: 0.875rem;
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

        .product-actions {
            flex-direction: column;
            gap: 0.25rem;
            align-items: stretch;
        }

        .groups-button {
            width: 100%;
            justify-content: center;
        }

        .group-details {
            grid-template-columns: 1fr;
        }

        .external-groups-list {
            max-height: 50vh;
        }

        .run-details {
            grid-template-columns: 1fr;
            gap: 0.25rem;
        }

        .run-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }

    .attached-group-product {
        border: 2px solid #4f46e5;
        background: rgba(79, 70, 229, 0.1);
        border-radius: 6px;
    }

    .alert {
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        color: #92400e;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    :global(span.diff-added) {
        background-color: oklch(from green 80% 50% 140 / 60%);
    }

    :global(span.diff-removed) {
        background-color: oklch(from red 90% 50% 20 / 80%);
    }
</style>
