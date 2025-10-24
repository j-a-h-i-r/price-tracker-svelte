<script lang="ts">
    import { onMount, onDestroy } from 'svelte';

    interface Props {
        images: string[];
        autoRotate?: boolean;
        autoRotateInterval?: number;
    }

    let { images, autoRotate = false, autoRotateInterval = 3000 }: Props = $props();

    let currentIndex = $state(0);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function nextImage() {
        currentIndex = (currentIndex + 1) % images.length;
    }

    function prevImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
    }

    function goToImage(index: number) {
        currentIndex = index;
    }

    function startAutoRotate() {
        if (autoRotate && images.length > 1) {
            intervalId = setInterval(nextImage, autoRotateInterval);
        }
    }

    function stopAutoRotate() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    onMount(() => {
        startAutoRotate();
    });

    onDestroy(() => {
        stopAutoRotate();
    });
</script>

{#if images.length > 0}
    <div class="carousel-container">
        <div class="carousel-image-wrapper">
            <img 
                src={images[currentIndex]} 
                alt="Product {currentIndex + 1}" 
                class="carousel-image"
            />
        </div>
        
        {#if images.length > 1}
            <div class="carousel-indicators">
                {#each images as image, index (image)}
                    <button
                        class="indicator-dot"
                        class:active={index === currentIndex}
                        onclick={() => goToImage(index)}
                        aria-label="Go to image {index + 1}"
                    ></button>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .carousel-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .carousel-image-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .carousel-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }

    .carousel-indicators {
        position: absolute;
        bottom: 0.5rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 9999px;
        backdrop-filter: blur(4px);
    }

    .indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
    }

    .indicator-dot:hover {
        background: rgba(255, 255, 255, 0.8);
    }

    .indicator-dot.active {
        background: white;
        width: 24px;
        border-radius: 4px;
    }
</style>
