<script lang="ts">
    import { fetchGeneratedSpecs } from '$lib/api/generatedspecs.js';
    import { updateExternalProductMetadata } from '$lib/api/products.js';
    import { toasts } from '$lib/states/toast.js';
    import type { GeneratedSpec } from '$lib/types/GeneratedSpec';
    import { onMount } from 'svelte';
    import { api } from '$lib/core/api.js';

    let specs: GeneratedSpec[] = $state([]);
    let loading = $state(true);
    let error: string | null = $state(null);
    let searchQuery = $state('');
    let expandedProducts = $state<Set<number>>(new Set());
    let savingProducts = $state<Set<number>>(new Set());
    // Track selected values for each product's conflicting fields: productId -> fieldKey -> selectedValue
    let selectedValues = $state<Map<number, Map<string, unknown>>>(new Map());
    // Track ignored fields for each product: productId -> Set of fieldKeys
    let ignoredFields = $state<Map<number, Set<string>>>(new Map());
    let stats = $state<{
        total: string;
        total_same: string;
        total_different: string;
        merged_total: string;
        merged_same: string;
        merged_different: string;
        unmerged_total: string;
        unmerged_same: string;
        unmerged_different: string;
    } | null>(null);
    let mergingAll = $state(false);
    let showNullMismatchOnly = $state(false);
    let showMergeNullModal = $state(false);
    let mergingNullDifferences = $state(false);
    let showRawMetadataModal = $state(false);
    let rawMetadata: Record<string, unknown> | null = $state(null);
    let loadingRawMetadata = $state(false);
    let currentProductName = $state('');
    
    let nullDifferenceStats = $derived.by(() => {
        const nullDiffSpecs = specs.filter(spec => {
            const comparison = compareMetadata(spec.metadatas);
            return comparison.differences.some(d => d.hasNullMismatch) &&
                   comparison.differences.every(d => !d.hasConflict || d.hasNullMismatch);
        });
        
        let totalSameAttrs = 0;
        let totalNullVsValueAttrs = 0;
        
        nullDiffSpecs.forEach(spec => {
            const comparison = compareMetadata(spec.metadatas);
            comparison.differences.forEach(d => {
                if (!d.hasConflict) {
                    totalSameAttrs++;
                } else if (d.hasNullMismatch) {
                    totalNullVsValueAttrs++;
                }
            });
        });
        
        return {
            productCount: nullDiffSpecs.length,
            sameAttributes: totalSameAttrs,
            nullVsValueAttributes: totalNullVsValueAttrs,
            specs: nullDiffSpecs
        };
    });

    let filteredSpecs = $derived(
        specs.filter(spec => {
            // Filter by search query
            if (!spec.external_product_id.toString().includes(searchQuery.toLowerCase())) {
                return false;
            }
            
            // If null mismatch filter is active, only show specs with null-vs-value differences
            if (showNullMismatchOnly) {
                const comparison = compareMetadata(spec.metadatas);
                return comparison.differences.some(d => d.hasNullMismatch);
            }
            
            return true;
        })
    );

    onMount(async () => {
        const [specsResp, statsResp] = await Promise.all([
            fetchGeneratedSpecs(),
            api.get<{
                total: string;
                total_same: string;
                total_different: string;
                merged_total: string;
                merged_same: string;
                merged_different: string;
                unmerged_total: string;
                unmerged_same: string;
                unmerged_different: string;
            }>('/api/generatedspecs/stats')
        ]);
        
        if (specsResp.isOk()) {
            specs = specsResp.value;
        } else {
            error = specsResp.error.message ?? 'An error occurred';
        }
        
        if (statsResp.isOk()) {
            stats = statsResp.value;
        }
        
        loading = false;
    });

    function toggleProduct(productId: number) {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        expandedProducts = newExpanded;
    }

    function selectValue(productId: number, fieldKey: string, value: unknown) {
        if (!selectedValues.has(productId)) {
            selectedValues.set(productId, new Map());
        }
        selectedValues.get(productId)!.set(fieldKey, value);
        // Trigger reactivity
        selectedValues = new Map(selectedValues);
    }

    function getSelectedValue(productId: number, fieldKey: string): unknown | undefined {
        return selectedValues.get(productId)?.get(fieldKey);
    }

    function toggleIgnoreField(productId: number, fieldKey: string) {
        if (!ignoredFields.has(productId)) {
            ignoredFields.set(productId, new Set());
        }
        const ignored = ignoredFields.get(productId)!;
        if (ignored.has(fieldKey)) {
            ignored.delete(fieldKey);
        } else {
            ignored.add(fieldKey);
            // Also remove any selection for this field
            selectedValues.get(productId)?.delete(fieldKey);
        }
        // Trigger reactivity
        ignoredFields = new Map(ignoredFields);
        selectedValues = new Map(selectedValues);
    }

    function isFieldIgnored(productId: number, fieldKey: string): boolean {
        return ignoredFields.get(productId)?.has(fieldKey) ?? false;
    }

    function canSaveWithConflicts(productId: number, differences: { key: string; hasConflict: boolean; hasNullMismatch: boolean }[]): boolean {
        const conflicts = differences.filter(d => d.hasConflict);
        if (conflicts.length === 0) return false;
        
        const selections = selectedValues.get(productId);
        const ignored = ignoredFields.get(productId);
        
        // Check if all conflicts are either selected or ignored
        return conflicts.every(c => selections?.has(c.key) || ignored?.has(c.key));
    }

    function buildMetadataFromSelections(productId: number, differences: { key: string; values: { model: string; value: unknown }[]; hasConflict: boolean; hasNullMismatch: boolean }[]): Record<string, unknown> {
        const metadata: Record<string, unknown> = {};
        const selections = selectedValues.get(productId);
        const ignored = ignoredFields.get(productId);
        
        differences.forEach(diff => {
            // Skip ignored fields
            if (ignored?.has(diff.key)) {
                return;
            }
            
            if (diff.hasConflict && selections?.has(diff.key)) {
                // Use selected value for conflicts
                metadata[diff.key] = selections.get(diff.key);
            } else if (!diff.hasConflict) {
                // Use the common value for non-conflicts
                metadata[diff.key] = diff.values[0]?.value;
            }
        });
        
        return metadata;
    }

    async function saveMetadata(productId: number, metadata: Record<string, unknown>) {
        savingProducts.add(productId);
        
        try {
            const result = await updateExternalProductMetadata(productId, metadata);

            if (result.isErr()) {
                throw new Error(result.error.message);
            }
            specs = specs.filter((spec) => spec.external_product_id !== productId);
            toasts.success('Metadata saved successfully');
        } catch (err) {
            console.error('Error saving metadata:', err);
            toasts.error(`Error saving metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            savingProducts.delete(productId);
        }
    }

    async function viewRawMetadata(productId: number, productName: string) {
        currentProductName = productName;
        showRawMetadataModal = true;
        loadingRawMetadata = true;
        rawMetadata = null;
        
        try {
            const result = await api.get<{ raw_metadata: Record<string, unknown> }>(`/api/externals/${productId}`);
            
            if (result.isOk()) {
                rawMetadata = result.value.raw_metadata;
            } else {
                toasts.error(`Failed to load raw metadata: ${result.error.message}`);
                showRawMetadataModal = false;
            }
        } catch (err) {
            console.error('Error loading raw metadata:', err);
            toasts.error(`Error loading raw metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
            showRawMetadataModal = false;
        } finally {
            loadingRawMetadata = false;
        }
    }
    
    async function mergeNullDifferences() {
        showMergeNullModal = false;
        mergingNullDifferences = true;
        
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const spec of nullDifferenceStats.specs) {
                const comparison = compareMetadata(spec.metadatas);
                const metadata: Record<string, unknown> = {};
                
                comparison.differences.forEach(diff => {
                    if (!diff.hasConflict) {
                        // Use common value for non-conflicts
                        metadata[diff.key] = diff.values[0]?.value;
                    } else if (diff.hasNullMismatch) {
                        // For null mismatches, use the non-null value
                        const nonNullValue = diff.values.find(v => v.value !== null && v.value !== undefined);
                        if (nonNullValue) {
                            metadata[diff.key] = nonNullValue.value;
                        }
                    }
                });
                
                const result = await updateExternalProductMetadata(spec.external_product_id, metadata);
                
                if (result.isOk()) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to merge product ${spec.external_product_id}:`, result.error.message);
                }
            }
            
            if (errorCount === 0) {
                toasts.success(`Successfully merged ${successCount} products with null differences`);
            } else {
                toasts.error(`Merged ${successCount} products, ${errorCount} failed`);
            }
            
            // Refresh the data
            const [specsResp, statsResp] = await Promise.all([
                fetchGeneratedSpecs(),
                api.get<{
                    total: string;
                    total_same: string;
                    total_different: string;
                    merged_total: string;
                    merged_same: string;
                    merged_different: string;
                    unmerged_total: string;
                    unmerged_same: string;
                    unmerged_different: string;
                }>('/api/generatedspecs/stats')
            ]);
            
            if (specsResp.isOk()) {
                specs = specsResp.value;
            }
            
            if (statsResp.isOk()) {
                stats = statsResp.value;
            }
        } catch (err) {
            console.error('Error merging null differences:', err);
            toasts.error(`Error merging null differences: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            mergingNullDifferences = false;
        }
    }
    
    async function mergeAllSame() {
        mergingAll = true;
        
        try {
            const result = await api.put('/api/generatedspecs/mergeall', {});

            if (result.isErr()) {
                throw new Error(result.error.message);
            }
            
            toasts.success('All matching specifications merged successfully');
            
            // Refresh the data
            const [specsResp, statsResp] = await Promise.all([
                fetchGeneratedSpecs(),
                api.get<{
                    total: string;
                    total_same: string;
                    total_different: string;
                    merged_total: string;
                    merged_same: string;
                    merged_different: string;
                    unmerged_total: string;
                    unmerged_same: string;
                    unmerged_different: string;
                }>('/api/generatedspecs/stats')
            ]);
            
            if (specsResp.isOk()) {
                specs = specsResp.value;
            }
            
            if (statsResp.isOk()) {
                stats = statsResp.value;
            }
        } catch (err) {
            console.error('Error merging specifications:', err);
            toasts.error(`Error merging specifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            mergingAll = false;
        }
    }

    function compareMetadata(metadatas: { model: string; metadata: Record<string, unknown> }[]) {
        if (metadatas.length === 0) return { allMatch: true, differences: [] };
        
        // Get all unique keys across all metadata objects
        const allKeys = new Set<string>();
        metadatas.forEach(({ metadata }) => {
            Object.keys(metadata ?? {}).forEach(key => allKeys.add(key));
        });

        const differences: {
            key: string;
            values: { model: string; value: unknown }[];
            hasConflict: boolean;
            hasNullMismatch: boolean;
        }[] = [];

        allKeys.forEach(key => {
            const values = metadatas.map(({ model, metadata }) => ({
                model,
                value: metadata?.[key] ?? null
            }));

            // Check if all values are the same
            const firstValue = JSON.stringify(values[0].value);
            const hasConflict = values.some(v => JSON.stringify(v.value) !== firstValue);
            
            // Check if difference is because some are null and others are not
            const hasNullMismatch = hasConflict && 
                values.some(v => v.value === null || v.value === undefined) &&
                values.some(v => v.value !== null && v.value !== undefined);

            differences.push({
                key,
                values,
                hasConflict,
                hasNullMismatch
            });
        });

        const allMatch = differences.every(d => !d.hasConflict);

        return { allMatch, differences };
    }
</script>

<div class="specs-container">
    <h1>Specifications Review</h1>
    <p class="subtitle">Compare generated metadata by LLM models</p>

    {#if stats}
        <div class="stats-container">
            <div class="stat-card">
                <span class="stat-label">Total</span>
                <span class="stat-value">{stats.total}</span>
                <div class="stat-breakdown">
                    <span class="stat-breakdown-item match-text">{stats.total_same} same</span>
                    <span class="stat-breakdown-separator">•</span>
                    <span class="stat-breakdown-item differ-text">{stats.total_different} different</span>
                </div>
            </div>
            <div class="stat-card merged">
                <span class="stat-label">Merged</span>
                <span class="stat-value">{stats.merged_total}</span>
                <div class="stat-breakdown">
                    <span class="stat-breakdown-item match-text">{stats.merged_same} same</span>
                    <span class="stat-breakdown-separator">•</span>
                    <span class="stat-breakdown-item differ-text">{stats.merged_different} different</span>
                </div>
            </div>
            <div class="stat-card unmerged">
                <span class="stat-label">Unmerged</span>
                <span class="stat-value">{stats.unmerged_total}</span>
                <div class="stat-breakdown">
                    <span class="stat-breakdown-item match-text">{stats.unmerged_same} same</span>
                    <span class="stat-breakdown-separator">•</span>
                    <span class="stat-breakdown-item differ-text">{stats.unmerged_different} different</span>
                </div>
            </div>
        </div>
        
        {#if parseInt(stats.unmerged_same) > 0 || nullDifferenceStats.productCount > 0}
            <div class="merge-all-container">
                {#if parseInt(stats.unmerged_same) > 0}
                    <button
                        class="merge-all-btn"
                        onclick={mergeAllSame}
                        disabled={mergingAll || mergingNullDifferences}
                    >
                        {mergingAll ? 'Merging...' : `Merge all Same (${stats.unmerged_same})`}
                    </button>
                {/if}
                {#if nullDifferenceStats.productCount > 0}
                    <button
                        class="merge-null-btn"
                        onclick={() => showMergeNullModal = true}
                        disabled={mergingAll || mergingNullDifferences}
                    >
                        {mergingNullDifferences ? 'Merging...' : `Merge Null Differences (${nullDifferenceStats.productCount})`}
                    </button>
                {/if}
            </div>
        {/if}
    {/if}

    <div class="search-container">
        <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by product ID..."
            class="search-input"
        />
        <button
            class="filter-toggle-btn {showNullMismatchOnly ? 'active' : ''}"
            onclick={() => showNullMismatchOnly = !showNullMismatchOnly}
        >
            {showNullMismatchOnly ? '✓ ' : ''}Show Null vs Value Differences
        </button>
    </div>

    {#if loading}
        <div class="loading">
            <p>Loading specifications...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else if filteredSpecs.length === 0}
        <div class="no-results">
            <p>No specifications found.</p>
        </div>
    {:else}
        <div class="specs-list">
            {#each filteredSpecs as spec (spec.external_product_id)}
                {@const comparison = compareMetadata(spec.metadatas)}
                {@const isExpanded = expandedProducts.has(spec.external_product_id)}
                
                <div class="spec-card">
                    <div class="spec-header">
                        <button
                            class="header-expand-button"
                            onclick={() => toggleProduct(spec.external_product_id)}
                        >
                            <div class="header-info">
                                <div class="product-info">
                                    <h3>Product ID: {spec.external_product_id}</h3>
                                    <h4>{spec.name}</h4>
                                </div>
                                <span class="model-count">{spec.metadatas.length} models</span>
                            </div>
                            <div class="header-actions">
                                {#if comparison.allMatch}
                                    <span class="status-badge match">✓ All Match</span>
                                {:else}
                                    {@const onlyNullDifferences = comparison.differences.every(d => !d.hasConflict || d.hasNullMismatch)}
                                    <span class="status-badge differ">
                                        ⚠ {onlyNullDifferences ? 'Null value differences' : 'Differences Found'}
                                    </span>
                                {/if}
                                <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            </div>
                        </button>
                        <button
                            class="view-raw-btn"
                            onclick={() => viewRawMetadata(spec.external_product_id, spec.name)}
                        >
                            View Raw
                        </button>
                        {#if comparison.allMatch}
                            <button
                                class="save-btn"
                                onclick={() => saveMetadata(spec.external_product_id, spec.metadatas[0]?.metadata ?? {})}
                                disabled={savingProducts.has(spec.external_product_id)}
                            >
                                {savingProducts.has(spec.external_product_id) ? 'Saving...' : 'Save'}
                            </button>
                        {:else if canSaveWithConflicts(spec.external_product_id, comparison.differences)}
                            <button
                                class="save-btn"
                                onclick={() => saveMetadata(spec.external_product_id, buildMetadataFromSelections(spec.external_product_id, comparison.differences))}
                                disabled={savingProducts.has(spec.external_product_id)}
                            >
                                {savingProducts.has(spec.external_product_id) ? 'Saving...' : 'Save Selected'}
                            </button>
                        {/if}
                    </div>

                    {#if isExpanded}
                        <div class="spec-content">
                            <div class="models-section">
                                <h4>Models:</h4>
                                <ul class="models-list">
                                    {#each spec.metadatas as { model }, idx (idx)}
                                        <li class="model-item">{model}</li>
                                    {/each}
                                </ul>
                            </div>

                            <div class="comparison-section">
                                <h4>Metadata Comparison:</h4>
                                
                                {#if comparison.differences.length === 0}
                                    <p class="no-metadata">No metadata fields found.</p>
                                {:else}
                                    <div class="comparison-table">
                                        {#each comparison.differences as diff (diff.key)}
                                            <div class="field-row {diff.hasConflict ? 'conflict' : 'match'} {isFieldIgnored(spec.external_product_id, diff.key) ? 'ignored' : ''}">
                                                <div class="field-header">
                                                    <div class="field-header-left">
                                                        <strong>{diff.key}</strong>
                                                        {#if diff.hasConflict}
                                                            {#if isFieldIgnored(spec.external_product_id, diff.key)}
                                                                <span class="ignored-badge">Ignored</span>
                                                            {:else}
                                                                <span class="conflict-badge">Conflict</span>
                                                                {#if diff.hasNullMismatch}
                                                                    <span class="null-mismatch-badge">Null vs Value</span>
                                                                {/if}
                                                            {/if}
                                                        {:else}
                                                            <span class="match-badge">Match</span>
                                                        {/if}
                                                    </div>
                                                    {#if diff.hasConflict}
                                                        <button
                                                            class="ignore-btn"
                                                            onclick={() => toggleIgnoreField(spec.external_product_id, diff.key)}
                                                        >
                                                            {isFieldIgnored(spec.external_product_id, diff.key) ? 'Unignore' : 'Ignore'}
                                                        </button>
                                                    {/if}
                                                </div>
                                                <div class="field-values">
                                                    {#each diff.values as { model, value } (model)}
                                                        <div class="value-item">
                                                            {#if diff.hasConflict && !isFieldIgnored(spec.external_product_id, diff.key)}
                                                                <label class="value-selector">
                                                                    <input
                                                                        type="radio"
                                                                        name="field-{spec.external_product_id}-{diff.key}"
                                                                        checked={getSelectedValue(spec.external_product_id, diff.key) === value}
                                                                        onchange={() => selectValue(spec.external_product_id, diff.key, value)}
                                                                    />
                                                                    <span class="model-label">{model}:</span>
                                                                    <span class="value-content">
                                                                        {#if value === null || value === undefined}
                                                                            <em class="null-value">null</em>
                                                                        {:else if typeof value === 'object'}
                                                                            <code>{JSON.stringify(value, null, 2)}</code>
                                                                        {:else}
                                                                            {value}
                                                                        {/if}
                                                                    </span>
                                                                </label>
                                                            {:else}
                                                                <span class="model-label">{model}:</span>
                                                                <span class="value-content">
                                                                    {#if value === null || value === undefined}
                                                                        <em class="null-value">null</em>
                                                                    {:else if typeof value === 'object'}
                                                                        <code>{JSON.stringify(value, null, 2)}</code>
                                                                    {:else}
                                                                        {value}
                                                                    {/if}
                                                                </span>
                                                            {/if}
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

{#if showMergeNullModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => showMergeNullModal = false}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <h2>Merge Null Differences</h2>
            <p class="modal-description">
                This will merge products where the only differences are null vs value mismatches.
                Non-null values will be selected automatically.
            </p>
            
            <div class="modal-stats">
                <div class="modal-stat-item">
                    <span class="modal-stat-label">Products to update:</span>
                    <span class="modal-stat-value">{nullDifferenceStats.productCount}</span>
                </div>
                <div class="modal-stat-item">
                    <span class="modal-stat-label">Same attributes:</span>
                    <span class="modal-stat-value">{nullDifferenceStats.sameAttributes}</span>
                </div>
                <div class="modal-stat-item">
                    <span class="modal-stat-label">Null vs value attributes:</span>
                    <span class="modal-stat-value">{nullDifferenceStats.nullVsValueAttributes}</span>
                </div>
            </div>
            
            <div class="modal-actions">
                <button
                    class="modal-cancel-btn"
                    onclick={() => showMergeNullModal = false}
                >
                    Cancel
                </button>
                <button
                    class="modal-confirm-btn"
                    onclick={mergeNullDifferences}
                >
                    Confirm Merge
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showRawMetadataModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={() => showRawMetadataModal = false}>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content large" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h2>Raw Metadata</h2>
                <button
                    class="modal-close-btn"
                    onclick={() => showRawMetadataModal = false}
                >
                    ✕
                </button>
            </div>
            <p class="modal-description">
                Original scraped metadata for: <strong>{currentProductName}</strong>
            </p>
            
            {#if loadingRawMetadata}
                <div class="modal-loading">
                    <p>Loading raw metadata...</p>
                </div>
            {:else if rawMetadata}
                <div class="raw-metadata-content">
                    {#if Object.keys(rawMetadata).length === 0}
                        <p class="no-metadata">No raw metadata available.</p>
                    {:else}
                        <div class="metadata-grid">
                            {#each Object.entries(rawMetadata) as [key, value] (key)}
                                <div class="metadata-row">
                                    <div class="metadata-key">{key}</div>
                                    <div class="metadata-value">
                                        {#if value === null || value === undefined}
                                            <em class="null-value">null</em>
                                        {:else if typeof value === 'object'}
                                            <code>{JSON.stringify(value, null, 2)}</code>
                                        {:else}
                                            {value}
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
            
            <div class="modal-actions">
                <button
                    class="modal-cancel-btn"
                    onclick={() => showRawMetadataModal = false}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .specs-container {
        max-width: 80rem;
        margin: 0;
        padding: 2rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #111827;
    }

    .subtitle {
        color: #6b7280;
        margin-bottom: 1.5rem;
        font-size: 1rem;
    }

    .stats-container {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }

    .stat-card {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1.5rem;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        min-width: 150px;
        flex: 1;
    }

    .stat-card.merged {
        border-color: #93c5fd;
        background: #eff6ff;
    }

    .stat-card.unmerged {
        border-color: #fda4af;
        background: #fff1f2;
    }

    .stat-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #111827;
    }

    .stat-breakdown {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .stat-breakdown-item {
        font-weight: 500;
    }

    .stat-breakdown-separator {
        color: #d1d5db;
    }

    .match-text {
        color: #166534;
    }

    .differ-text {
        color: #92400e;
    }

    .stat-card.merged .stat-value {
        color: #1e40af;
    }

    .stat-card.unmerged .stat-value {
        color: #be123c;
    }

    .merge-all-container {
        margin-bottom: 2rem;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .merge-all-btn {
        padding: 0.75rem 1.5rem;
        background: #16a34a;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .merge-all-btn:hover:not(:disabled) {
        background: #15803d;
    }

    .merge-all-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .merge-null-btn {
        padding: 0.75rem 1.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .merge-null-btn:hover:not(:disabled) {
        background: #2563eb;
    }

    .merge-null-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .search-container {
        margin-bottom: 1.5rem;
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .search-input {
        flex: 1;
        min-width: 250px;
        max-width: 400px;
        padding: 0.75rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .filter-toggle-btn {
        padding: 0.75rem 1rem;
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .filter-toggle-btn:hover {
        background: #f9fafb;
        border-color: #9ca3af;
    }

    .filter-toggle-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }

    .filter-toggle-btn.active:hover {
        background: #2563eb;
        border-color: #2563eb;
    }

    .loading, .error, .no-results {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
    }

    .error {
        color: #dc2626;
    }

    .specs-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .spec-card {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        background: white;
        overflow: hidden;
        transition: box-shadow 0.2s;
    }

    .spec-card:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .spec-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        gap: 1rem;
    }

    .header-expand-button {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.2s;
        padding: 0;
    }

    .header-expand-button:hover {
        opacity: 0.8;
    }

    .header-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .product-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .header-info h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
    }

    .header-info h4 {
        font-size: 0.875rem;
        font-weight: 500;
        color: #6b7280;
        margin: 0;
    }

    .model-count {
        font-size: 0.875rem;
        color: #6b7280;
        padding: 0.25rem 0.5rem;
        background: #f3f4f6;
        border-radius: 0.375rem;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .status-badge {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        font-weight: 500;
    }

    .status-badge.match {
        background: #dcfce7;
        color: #166534;
    }

    .status-badge.differ {
        background: #fef3c7;
        color: #92400e;
    }

    .view-raw-btn {
        padding: 0.5rem 1rem;
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .view-raw-btn:hover {
        background: #4b5563;
    }

    .view-raw-btn {
        padding: 0.5rem 1rem;
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .view-raw-btn:hover {
        background: #4b5563;
    }

    .save-btn {
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .save-btn:hover:not(:disabled) {
        background: #2563eb;
    }

    .save-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }

    .expand-icon {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .spec-content {
        padding: 0 1.5rem 1.5rem;
        border-top: 1px solid #e5e7eb;
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .models-section {
        margin-bottom: 1.5rem;
        padding-top: 1.5rem;
    }

    .models-section h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.75rem;
    }

    .models-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .model-item {
        padding: 0.5rem 0.75rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 0.375rem;
        color: #1e40af;
        font-size: 0.875rem;
        font-family: monospace;
    }

    .comparison-section h4 {
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 1rem;
    }

    .no-metadata {
        color: #6b7280;
        font-style: italic;
    }

    .comparison-table {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .field-row {
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
    }

    .field-row.match {
        background: #f0fdf4;
        border-color: #bbf7d0;
    }

    .field-row.conflict {
        background: #fffbeb;
        border-color: #fde68a;
    }

    .field-row.ignored {
        background: #f3f4f6;
        border-color: #d1d5db;
        opacity: 0.7;
    }

    .field-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .field-header-left {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .field-header strong {
        color: #111827;
        font-size: 0.875rem;
    }

    .ignore-btn {
        padding: 0.25rem 0.75rem;
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .ignore-btn:hover {
        background: #4b5563;
    }

    .conflict-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        background: #fbbf24;
        color: #78350f;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .ignored-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        background: #9ca3af;
        color: #1f2937;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .match-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        background: #86efac;
        color: #14532d;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .null-mismatch-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        background: #e0e7ff;
        color: #3730a3;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .field-values {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .value-item {
        display: flex;
        gap: 0.75rem;
        font-size: 0.875rem;
        align-items: flex-start;
    }

    .value-selector {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        cursor: pointer;
        padding: 0.5rem;
        margin: -0.5rem;
        border-radius: 0.375rem;
        transition: background-color 0.2s;
        flex: 1;
    }

    .value-selector:hover {
        background-color: #f9fafb;
    }

    .value-selector input[type="radio"] {
        margin-top: 0.125rem;
        cursor: pointer;
    }

    .model-label {
        color: #6b7280;
        font-weight: 500;
        min-width: 200px;
        font-family: monospace;
    }

    .value-content {
        color: #111827;
        flex: 1;
        word-break: break-word;
    }

    .null-value {
        color: #9ca3af;
    }

    .value-content code {
        display: block;
        background: #f3f4f6;
        padding: 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8125rem;
        overflow-x: auto;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
    }

    .modal-content {
        background: white;
        border-radius: 0.75rem;
        padding: 2rem;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        animation: modalSlideIn 0.2s ease-out;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-content.large {
        max-width: 900px;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .modal-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        transition: all 0.2s;
    }

    .modal-close-btn:hover {
        background: #f3f4f6;
        color: #111827;
    }

    .modal-loading {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .modal-content h2 {
        font-size: 1.5rem;
        font-weight: bold;
        color: #111827;
        margin: 0 0 1rem 0;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .modal-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        transition: all 0.2s;
    }

    .modal-close-btn:hover {
        background: #f3f4f6;
        color: #111827;
    }

    .modal-loading {
        padding: 2rem;
        text-align: center;
        color: #6b7280;
    }

    .modal-description {
        color: #6b7280;
        margin-bottom: 1.5rem;
        line-height: 1.5;
    }

    .modal-stats {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .modal-stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
    }

    .modal-stat-item:not(:last-child) {
        border-bottom: 1px solid #e5e7eb;
    }

    .modal-stat-label {
        color: #6b7280;
        font-weight: 500;
    }

    .modal-stat-value {
        color: #111827;
        font-weight: 600;
        font-size: 1.125rem;
    }

    .modal-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
    }

    .modal-cancel-btn {
        padding: 0.625rem 1.25rem;
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .modal-cancel-btn:hover {
        background: #f9fafb;
        border-color: #9ca3af;
    }

    .modal-confirm-btn {
        padding: 0.625rem 1.25rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .modal-confirm-btn:hover {
        background: #2563eb;
    }

    .raw-metadata-content {
        margin-bottom: 1.5rem;
    }

    .metadata-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .metadata-row {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) 2fr;
        gap: 1rem;
        padding: 0.75rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        align-items: start;
    }

    .metadata-key {
        font-weight: 600;
        color: #374151;
        word-break: break-word;
        font-family: monospace;
        font-size: 0.875rem;
    }

    .metadata-value {
        color: #111827;
        word-break: break-word;
        font-size: 0.875rem;
    }

    .metadata-value code {
        display: block;
        background: #1f2937;
        color: #e5e7eb;
        padding: 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.8125rem;
        overflow-x: auto;
        white-space: pre-wrap;
    }

    @media (max-width: 768px) {
        .specs-container {
            padding: 1rem;
        }

        .header-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .header-actions {
            flex-direction: column;
            gap: 0.5rem;
        }

        .model-label {
            min-width: 150px;
        }

        .value-item {
            flex-direction: column;
            gap: 0.25rem;
        }

        .metadata-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
        }

        .modal-content {
            padding: 1.5rem;
        }
    }
</style>
