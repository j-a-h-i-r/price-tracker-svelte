<script lang="ts">
    interface PillProps {
        label: string;
        value: string | number;
    }
    const { label, value }: PillProps = $props();
</script>

<div class="metadata-pill">
    <span class="metadata-pill-label">{label}</span>
    <span class="metadata-pill-value">{value}</span>
</div>

<style>
    .metadata-pill {
        display: inline-flex;
        align-items: center;
        background: #f3f4f6;
        border-radius: 9999px;
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        gap: 0.375rem;
        line-height: 1;
    }

    .metadata-pill-label {
        color: #6b7280;
        font-weight: 500;
        white-space: nowrap;
    }

    .metadata-pill-value {
        color: #374151;
        font-weight: 600;
    }
</style>