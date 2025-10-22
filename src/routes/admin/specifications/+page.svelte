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
    let stats = $state<{ total: string; same: string; different: string } | null>(null);
    let mergingAll = $state(false);

    let filteredSpecs = $derived(
        specs.filter(spec => 
            spec.external_product_id.toString().includes(searchQuery.toLowerCase())
        )
    );

    onMount(async () => {
        const [specsResp, statsResp] = await Promise.all([
            fetchGeneratedSpecs(),
            api.get<{ total: string; same: string; different: string }>('/api/generatedspecs/stats')
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

    function canSaveWithConflicts(productId: number, differences: { key: string; hasConflict: boolean }[]): boolean {
        const conflicts = differences.filter(d => d.hasConflict);
        if (conflicts.length === 0) return false;
        
        const selections = selectedValues.get(productId);
        if (!selections) return false;
        
        // Check if all conflicts have a selection
        return conflicts.every(c => selections.has(c.key));
    }

    function buildMetadataFromSelections(productId: number, differences: { key: string; values: { model: string; value: unknown }[]; hasConflict: boolean }[]): Record<string, unknown> {
        const metadata: Record<string, unknown> = {};
        const selections = selectedValues.get(productId);
        
        differences.forEach(diff => {
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
                api.get<{ total: string; same: string; different: string }>('/api/generatedspecs/stats')
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
        }[] = [];

        allKeys.forEach(key => {
            const values = metadatas.map(({ model, metadata }) => ({
                model,
                value: metadata?.[key] ?? null
            }));

            // Check if all values are the same
            const firstValue = JSON.stringify(values[0].value);
            const hasConflict = values.some(v => JSON.stringify(v.value) !== firstValue);

            differences.push({
                key,
                values,
                hasConflict
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
            </div>
            <div class="stat-card match">
                <span class="stat-label">Same</span>
                <span class="stat-value">{stats.same}</span>
            </div>
            <div class="stat-card differ">
                <span class="stat-label">Different</span>
                <span class="stat-value">{stats.different}</span>
            </div>
        </div>
        
        {#if parseInt(stats.same) > 0}
            <div class="merge-all-container">
                <button
                    class="merge-all-btn"
                    onclick={mergeAllSame}
                    disabled={mergingAll}
                >
                    {mergingAll ? 'Merging...' : 'Merge all Same'}
                </button>
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
                                    <span class="status-badge differ">⚠ Differences Found</span>
                                {/if}
                                <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            </div>
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
                                            <div class="field-row {diff.hasConflict ? 'conflict' : 'match'}">
                                                <div class="field-header">
                                                    <strong>{diff.key}</strong>
                                                    {#if diff.hasConflict}
                                                        <span class="conflict-badge">Conflict</span>
                                                    {:else}
                                                        <span class="match-badge">Match</span>
                                                    {/if}
                                                </div>
                                                <div class="field-values">
                                                    {#each diff.values as { model, value } (model)}
                                                        <div class="value-item">
                                                            {#if diff.hasConflict}
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

    .stat-card.match {
        border-color: #86efac;
        background: #f0fdf4;
    }

    .stat-card.differ {
        border-color: #fde68a;
        background: #fffbeb;
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

    .stat-card.match .stat-value {
        color: #166534;
    }

    .stat-card.differ .stat-value {
        color: #92400e;
    }

    .merge-all-container {
        margin-bottom: 2rem;
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

    .search-container {
        margin-bottom: 1.5rem;
    }

    .search-input {
        width: 100%;
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

    .field-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .field-header strong {
        color: #111827;
        font-size: 0.875rem;
    }

    .conflict-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        background: #fbbf24;
        color: #78350f;
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
    }
</style>
