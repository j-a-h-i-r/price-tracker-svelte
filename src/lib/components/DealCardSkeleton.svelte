<script lang="ts">
    interface Props {
        count?: number;
    }

    let { count = 6 }: Props = $props();
</script>

<div class="skeleton-grid">
    <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
    {#each Array(count) as _, i (i)}
        <div class="skeleton-card">
            <div class="skeleton-discount"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-title short"></div>
            <div class="skeleton-price-row">
                <div class="skeleton-price"></div>
                <div class="skeleton-original"></div>
            </div>
            <div class="skeleton-footer">
                <div class="skeleton-pill"></div>
                <div class="skeleton-pill"></div>
            </div>
        </div>
    {/each}
</div>

<style>
    .skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .skeleton-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
    }

    .skeleton-discount,
    .skeleton-title,
    .skeleton-price,
    .skeleton-original,
    .skeleton-pill {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
    }

    .skeleton-discount {
        width: 120px;
        height: 24px;
        margin-bottom: 0.75rem;
        border-radius: 4px;
    }

    .skeleton-title {
        height: 20px;
        margin-bottom: 0.5rem;
        width: 100%;
    }

    .skeleton-title.short {
        width: 70%;
        margin-bottom: 1rem;
    }

    .skeleton-price-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .skeleton-price {
        width: 100px;
        height: 28px;
        border-radius: 4px;
    }

    .skeleton-original {
        width: 70px;
        height: 16px;
    }

    .skeleton-footer {
        display: flex;
        gap: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }

    .skeleton-pill {
        height: 24px;
        width: 80px;
        border-radius: 9999px;
    }

    @keyframes shimmer {
        0% {
            background-position: -200% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }
</style>
