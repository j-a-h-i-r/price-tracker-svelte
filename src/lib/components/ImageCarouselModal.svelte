<script lang="ts">
    interface Props {
        images: string[];
        show: boolean;
        initialIndex?: number;
        onClose: () => void;
    }

    let { images, show, initialIndex = 0, onClose }: Props = $props();

    let currentIndex = $state(initialIndex);

    function nextImage() {
        currentIndex = (currentIndex + 1) % images.length;
    }

    function prevImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!show) return;
        
        if (event.key === 'Escape') {
            onClose();
        } else if (event.key === 'ArrowLeft') {
            prevImage();
        } else if (event.key === 'ArrowRight') {
            nextImage();
        }
    }

    function handleOverlayClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    // Sync currentIndex with initialIndex prop changes
    $effect(() => {
        if (show) {
            currentIndex = initialIndex;
        }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={handleOverlayClick} role="button" tabindex="-1">
        <div class="image-modal-content">
            <button class="modal-close image-modal-close" onclick={onClose} aria-label="Close modal">
                ×
            </button>

            {#if images.length > 1}
                <button 
                    class="image-nav-btn prev-btn" 
                    onclick={prevImage}
                    aria-label="Previous image"
                >
                    ◀
                </button>
            {/if}

            <div class="image-modal-body">
                <img 
                    src={images[currentIndex]} 
                    alt="Product {currentIndex + 1}" 
                    class="modal-image"
                />
                {#if images.length > 1}
                    <div class="image-counter">
                        {currentIndex + 1} / {images.length}
                    </div>
                {/if}
            </div>

            {#if images.length > 1}
                <button 
                    class="image-nav-btn next-btn" 
                    onclick={nextImage}
                    aria-label="Next image"
                >
                    ▶
                </button>
            {/if}
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    }

    .image-modal-content {
        position: relative;
        background: #1f2937;
        border-radius: 12px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .image-modal-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(255, 255, 255, 0.9);
        color: #1f2937;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
        font-size: 1.5rem;
        font-weight: 300;
    }

    .image-modal-close:hover {
        background: white;
        transform: scale(1.1);
    }

    .image-modal-body {
        position: relative;
        max-width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .modal-image {
        max-width: 80vw;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 8px;
    }

    .image-counter {
        position: absolute;
        bottom: -2.5rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        backdrop-filter: blur(4px);
        white-space: nowrap;
    }

    .image-nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.9);
        color: #1f2937;
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
        font-size: 1.25rem;
    }

    .image-nav-btn:hover {
        background: white;
        transform: translateY(-50%) scale(1.1);
    }

    .prev-btn {
        left: 1rem;
    }

    .next-btn {
        right: 1rem;
    }

    @media (max-width: 640px) {
        .image-modal-content {
            padding: 1rem;
        }

        .modal-image {
            max-width: 90vw;
            max-height: 70vh;
        }

        .image-nav-btn {
            width: 40px;
            height: 40px;
            font-size: 1rem;
        }

        .prev-btn {
            left: 0.5rem;
        }

        .next-btn {
            right: 0.5rem;
        }

        .image-counter {
            bottom: -2rem;
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
        }
    }
</style>
