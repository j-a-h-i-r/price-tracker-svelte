<script lang="ts">
    interface Props {
        label: string;
    }

    let { label }: Props = $props();
</script>

<span class="badge">
    {label}
</span>

<style>
    .badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
        text-transform: uppercase;
        letter-spacing: 0.025em;
        transition: all 0.2s ease;
    }

    .badge:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
    }
</style>
