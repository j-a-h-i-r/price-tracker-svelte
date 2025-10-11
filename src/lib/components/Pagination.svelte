<script lang="ts">
    const {
        handlePageChange,
        hasNext,
        hasPrev,
        align = 'right'
    } = $props();
</script>

<nav class="pagination" aria-label="Pagination navigation">
    <div class="pagination-controls" style={align === 'left' ? 'margin-right: auto;' : 'margin-left: auto;'}>
        <button 
            class="pagination-btn pagination-btn-first" 
            onclick={() => handlePageChange('first')}
            aria-label="Go to first page"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m11 17-5-5 5-5"/>
                <path d="m18 17-5-5 5-5"/>
            </svg>
            <span class="pagination-text">First</span>
        </button>
        
        <button 
            class="pagination-btn pagination-btn-prev" 
            disabled={!hasPrev} 
            onclick={() => handlePageChange('prev')}
            aria-label="Go to previous page"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"/>
            </svg>
            <span class="pagination-text">Previous</span>
        </button>
        
        <button 
            class="pagination-btn pagination-btn-next" 
            disabled={!hasNext} 
            onclick={() => handlePageChange('next')}
            aria-label="Go to next page"
        >
            <span class="pagination-text">Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 18 6-6-6-6"/>
            </svg>
        </button>
        
        <button 
            class="pagination-btn pagination-btn-last" 
            onclick={() => handlePageChange('last')}
            aria-label="Go to last page"
        >
            <span class="pagination-text">Last</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 17 5-5-5-5"/>
                <path d="m13 17 5-5-5-5"/>
            </svg>
        </button>
    </div>
</nav>

<style>
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem 0;
    }

    .pagination-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        background: var(--color-bg-primary);
        border-radius: 0.5rem;
        padding: 0.25rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        border: 1px solid #e5e7eb;
    }

    .pagination-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        background: transparent;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        text-decoration: none;
        white-space: nowrap;
    }

    .pagination-btn:hover:not(:disabled) {
        background-color: var(--color-bg-primary);
        color: #1f2937;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
    }

    .pagination-btn:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
    }

    .pagination-btn:disabled {
        color: #9ca3af;
        cursor: not-allowed;
        background: transparent;
    }

    .pagination-btn:disabled svg {
        opacity: 0.5;
    }

    .pagination-btn svg {
        flex-shrink: 0;
        transition: transform 0.2s ease-in-out;
    }

    .pagination-btn:hover:not(:disabled) svg {
        transform: scale(1.1);
    }

    .pagination-text {
        font-size: 0.875rem;
        font-weight: 500;
    }

    /* Responsive design */
    @media (max-width: 640px) {
        .pagination {
            padding: 0.5rem 0;
        }

        .pagination-controls {
            gap: 0.25rem;
            padding: 0.125rem;
        }

        .pagination-btn {
            padding: 0.375rem 0.5rem;
            font-size: 0.75rem;
        }

        .pagination-text {
            display: none;
        }
    }

    @media (max-width: 480px) {
        .pagination-btn {
            padding: 0.25rem 0.375rem;
        }
    }

    /* Focus styles for accessibility */
    .pagination-btn:focus {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
    }

    .pagination-btn:focus:not(:focus-visible) {
        outline: none;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .pagination-controls {
            border: 2px solid;
        }

        .pagination-btn:hover:not(:disabled) {
            background-color: #000;
            color: #fff;
        }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        .pagination-btn,
        .pagination-btn svg {
            transition: none;
        }

        .pagination-btn:hover:not(:disabled) {
            transform: none;
        }
    }
</style>