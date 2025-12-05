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
        font-size: 0.65rem;
        font-weight: 600;
        padding: 0.15rem 0.5rem;
        border-radius: 6px;
        background: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
        /* text-transform: uppercase; */
        letter-spacing: 0.025em;
        transition: all 0.2s ease;
    }

    .badge:hover {
        background: #dbeafe;
        border-color: #93c5fd;
    }
</style>
