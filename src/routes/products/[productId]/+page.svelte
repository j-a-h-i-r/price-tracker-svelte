<script lang="ts">
    import { page } from '$app/state';
    import {
    fetchExternalProductBadges,
    fetchExternalProductMetadata,
        fetchExternalProductPrices,
        fetchExternalProductsByInternalId,
        flagIncorrectGrouping,
        mergeProducts,
        trackProduct,
        unmergeProducts,
        untrackProduct,
        updateProductName,
        type ExternalProductOfInternal,
        type ProductBadge,
    } from '$lib/api/products.js';
    import type {
        ExternalProductPrice,
        ProductVariant,
        ExternalProductMetadata,
        Product,
    } from '$lib/types/Product.js';
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
    import { trackedProducts } from '$lib/states/tracked.svelte.js';
    import { userState } from '$lib/user.svelte.js';
    import { formatPrice, getProductIdFromSlug, linkWithUtmSource } from '$lib/util.js';
    import dayjs from 'dayjs';
    import type { Attachment } from 'svelte/attachments';
    import type { FlaggingOption } from '$lib/types/Flagging.js';
    import { getFlaggingOptions } from '$lib/api/flagging.js';
    import { toasts } from '$lib/states/toast.js';
    import { goto } from '$app/navigation';
    import Loader from '$lib/components/Loader.svelte';
    import Pill from '$lib/components/Pill.svelte';
    import Badge from '$lib/components/Badge.svelte';
    import ImageCarouselModal from '$lib/components/ImageCarouselModal.svelte';
    import { generateLdJSON, generateProductStructuredData, generateSEOConfig, generateBreadcrumbStructuredData } from '$lib/seo.js';
    import type { PageProps } from './$types.js';
    import { SvelteMap } from 'svelte/reactivity';
    import { ResultAsync } from 'neverthrow';
    import PriceChart from '$lib/components/PriceChart.svelte';
    import PriceStat from '$lib/components/PriceStat.svelte';

    let { data }: PageProps = $props();

    let websiteMap = data.websiteMap;
    let product: Product | undefined = $state(data.product);
    let variants: ProductVariant[] = $state(data.variantAttributes ?? []);
    let externalProducts: ExternalProductOfInternal[] = $state(data.externalProducts ?? []);
    let externalPrices = $state(data.externalPrices ?? []);

    let externalProductBadgesMap: SvelteMap<number, ProductBadge[]> = new SvelteMap();

    onMount(() => {
        variants.forEach((variant) => {
            selectedVariants![variant.name] = 'unselected';
        });
        fetchExternalProductsBadges(externalProducts)
    })

    function fetchExternalProductsBadges(externalProducts: ExternalProductOfInternal[]) {
        const badgeReqs = externalProducts.map((product) => {
            return fetchExternalProductBadges(product.external_product_id)
        })
        ResultAsync.combine(badgeReqs).map((badgesArray) => {
            externalProducts.forEach((externalProduct, index) => {
                externalProductBadgesMap.set(externalProduct.external_product_id, badgesArray[index]);
            });
        });
    }

    let productId = getProductIdFromSlug(page.params.productId);
    let externalProductPrices: Map<number, ExternalProductPrice[]> = $state(new Map());
    let isEditingMainProduct = $state(false);
    let editedMainName = $state('');
    let selectedVariants: Record<string, string | 'unselected'> = $state({});
    let externalProductMetadatas: Map<number, ExternalProductMetadata[]> = $state(new Map());
    let isExternalProductsLoaded = $state(false);
    let isExternalProductPricesLoaded = $state(false);
    let showUnavailableProducts = $state(false);
    let showFlagModal = $state(false);
    let flaggingProductId = $state<number | null>(null);
    let flaggingProductName = $state('');
    let selectedFlaggingOptions: string[] = $state([]);
    let flaggingOptions: FlaggingOption[] = $state([]);
    
    // Track modal states
    let showTrackModal = $state(false);
    let showLoginModal = $state(false);
    let targetPriceInput = $state('');

    let externalProductIdToHighlight: number | null = $state(null);
    let alreadyScrolledOnce = $state(false);

    // Image carousel state
    let allProductImages: string[] = $state([]);
    let currentImageIndex = $state(0);
    let carouselInterval: ReturnType<typeof setInterval> | null = null;
    let showImageModal = $state(false);

    onMount(() => {
        const { highlight_external_product_id } = page.state as { highlight_external_product_id: number | null };
        if (highlight_external_product_id) {
            externalProductIdToHighlight = Number(highlight_external_product_id);
        }

        return () => {
            if (carouselInterval) {
                clearInterval(carouselInterval);
            }
        };
    })

    // Collect all images from external products
    $effect(() => {
        const images: string[] = [];
        externalProducts.forEach(product => {
            if (product.image_urls && product.image_urls.length > 0) {
                images.push(...product.image_urls);
            }
        });
        allProductImages = images;
        currentImageIndex = 0;

        // Clear existing interval
        if (carouselInterval) {
            clearInterval(carouselInterval);
        }

        // Start carousel if there are images
        if (images.length > 1) {
            carouselInterval = setInterval(() => {
                currentImageIndex = (currentImageIndex + 1) % allProductImages.length;
            }, 3000);
        }
    })

    function openImageModal() {
        showImageModal = true;
    }

    function closeImageModal() {
        showImageModal = false;
    }

    function highlightExternalProduct(externalProduct: ExternalProductOfInternal): Attachment<HTMLElement> {
        return (element: HTMLElement) => {
            if (!element) return;

            if (
                externalProductIdToHighlight
                && externalProductIdToHighlight === externalProduct.external_product_id
                && !alreadyScrolledOnce
            ) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (isExternalProductPricesLoaded) {
                    alreadyScrolledOnce = true;
                }
            }
        };

    }

    async function handleSaveMainProduct() {
        updateProductName(productId, editedMainName)
        .match(
            () => {
                toasts.success('Product name updated successfully!');
                if (product) {
                    product = { ...product, name: editedMainName };
                }
                isEditingMainProduct = false;
                editedMainName = '';
            },
            () => {
                toasts.error('Failed to update product name. Please try again.');
            }
        )
    }

    function startEditingMain() {
        if (product) {
            isEditingMainProduct = true;
            editedMainName = product.name;
        }
    }

    $effect(() => {
        const promises = externalProducts.map(async (externalProduct) => {
            const { external_product_id } = externalProduct;
            return fetchExternalProductMetadata(external_product_id).unwrapOr([]);
        });
        Promise.all(promises)
        .then((metadatas) => {
            const externalMedatas = new Map<number, ExternalProductMetadata[]>();
            externalProducts.forEach((externalProduct, index) => {
                externalMedatas.set(externalProduct.external_product_id, metadatas[index]);
            });
            externalProductMetadatas = externalMedatas;
        })
    });
    
    $effect(() => {
        const promises = externalProducts.map(async (externalProduct) => {
            const { external_product_id } = externalProduct;
            const prices = await fetchExternalProductPrices(external_product_id).unwrapOr([]);
            return prices;
        });
        Promise.all(promises)
        .then((prices) => {
            const productPrices = new Map<number, ExternalProductPrice[]>();
            externalProducts.forEach((externalProduct, index) => {
                productPrices.set(externalProduct.external_product_id, prices[index]);
            });
            externalProductPrices = productPrices;

            // This is really bad code. The idea is that the product will be highlighted
            // on first visit from the deals page. And once the user changes any of the variant
            // configs, the highlight will not be applied.
            // I'm using the alreadyScrolledOnce state to check if the scroll has already happened.
            // The scrolling itself works fine. But since I'm fetching the external products first 
            // amd then the prices, it takes multiple renders to fully display everything.
            // Without this check, it scrolls to the correct div. But then product prices are loaded
            // which causes previous divs to have more content and the scroll position is not accurate
            // anymore. So to ensure that we need to wait for the prices to be loaded

            // In short external products -> external prices -> mark external prices loaded 
            // -> scroll is now accurate -> mark scroll as done
            if (isExternalProductsLoaded) {
                isExternalProductPricesLoaded = true;
            }
        })
    })

    let latestPrice: Map<number, ExternalProductPrice> = $derived.by(() => {
        let latestPriceMap = new Map<number, ExternalProductPrice>();
        externalProductPrices.forEach((prices, externalProductId) => {
            let latestPrice = prices[0];
            latestPriceMap.set(externalProductId, latestPrice);
        });
        return latestPriceMap;
    });

    let externalProductsSorted = $derived.by(() => {
        return externalProducts
        .filter((product) => {
            const price = latestPrice.get(product.external_product_id);
            return showUnavailableProducts || (price && price.is_available);
        })
        .toSorted((a, b) => {
            const aPrice = latestPrice.get(a.external_product_id)?.price || +Infinity;
            const bPrice = latestPrice.get(b.external_product_id)?.price || +Infinity;
            return aPrice - bPrice;
        });
    });

    let maxPrice = $derived.by(() => {
        let maxPrice = 0;
        for (const price of latestPrice.values()) {
            if (price?.price > maxPrice) {
                maxPrice = price.price;
            }
        }
        return maxPrice;
    });

    let unavailableCount = $derived.by(() => {
        let count = 0;
        for (const price of latestPrice.values()) {
            if (!price?.is_available) {
                count++;
            }
        }
        return count;
    });

    let isAvailable = $derived.by(() => {
        for (const price of latestPrice.values()) {
            if (price?.is_available) {
                return true;
            }
        }
        return false;
    });

    let priceStats30Day: Map<number, { high: number; low: number; average: number; count: number }> = $derived.by(() => {
        const statsMap = new Map();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        externalProductPrices.forEach((prices, externalProductId) => {
            const recentPrices = prices
                .filter(price => price.price != null && new Date(price.created_at) >= thirtyDaysAgo)
                .map(price => price.price);
            
            if (recentPrices.length > 0) {
                const high = Math.max(...recentPrices);
                const low = Math.min(...recentPrices);
                const average = Math.ceil(recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length);
                
                statsMap.set(externalProductId, {
                    high,
                    low,
                    average,
                    count: recentPrices.length
                });
            }
        });
        
        return statsMap;
    });

    // function attachInlineChart(product: ExternalProduct): Attachment<HTMLCanvasElement> {
    //     return (chartCanvas: HTMLCanvasElement) => {
    //         if (!chartCanvas) return;

    //         let priceDatasets: {label: string, data: {x: string, y: number}[]}[] = [];

    //         let prices = externalProductPrices.get(product.external_product_id)!.map((p) => {
    //             return {
    //                 x: p.created_at,
    //                 y: p.price,
    //             };
    //         });
    //         priceDatasets.push({
    //             label: product.name,
    //             data: prices,
    //             // cubicInterpolationMode: 'monotone',
    //             tension: 0.4,
    //         });

    //         const data = {
    //             datasets: priceDatasets,
    //         };

    //         const chart = new Chart(chartCanvas, {
    //             type: 'line',
    //             data,
    //             options: {
    //                 elements: {
    //                     point: {
    //                         radius: 0,
    //                     }
    //                 },
    //                 hover: {
    //                     mode: 'index',
    //                     intersect: false,
    //                 },
    //                 responsive: true,
    //                 maintainAspectRatio: false,
    //                 plugins: {
    //                     title: {
    //                         display: false,
    //                     },
    //                     legend: {
    //                         display: false,
    //                     },
    //                 },
    //                 scales: {
    //                     x: {
    //                         border: {
    //                             display: false,
    //                         },
    //                         display: true,
    //                         type: 'time',
    //                         time: {
    //                             unit: 'day'
    //                         },
    //                         ticks: {
    //                             autoSkip: false,
    //                             callback: function(value, index, ticks) {
    //                                 if (index === 0 || index === ticks.length - 1) {
    //                                     return dayjs(value).format('MMM D');
    //                                 }
    //                                 return null;
    //                             }
    //                         },
    //                         grid: {
    //                             display: false,
    //                         }
    //                     },
    //                     y: {
    //                         border: {
    //                             display: false,
    //                         },
    //                         beginAtZero: false,
    //                         display: true,
    //                         title: {
    //                             display: false,
    //                             text: 'Price (৳)',
    //                         },
    //                         ticks: {
    //                             display: true,
    //                             callback: function(value, index, ticks) {
    //                                 if (index === 0 || index === ticks.length - 1) {
    //                                     return formatPrice(Number(value));
    //                                 }
    //                                 return null;
    //                             }
    //                         },
    //                         grid: {
    //                             display: false,
    //                         }
    //                     },
    //                 },
    //             },
    //         });

    //         return () => {
    //             if (chart) chart.destroy();
    //         }
    //     };
    // }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function attachChart(): Attachment<HTMLCanvasElement> {
        return (chartCanvas: HTMLCanvasElement) => {
            if (!chartCanvas) return;

            let priceDatasets: {label: string, data: {x: string, y: number}[]}[] = [];

            externalProductPrices.forEach((prices, externalProductId) => {
                const product = externalProducts.find((product) => product.external_product_id === externalProductId);
                if (!product) return;
                const websiteName = websiteMap.get(product!.website_id)?.name;
                priceDatasets.push({
                    label: `[${websiteName}] ${product!.name}`,
                    data: prices.map((p) => ({
                        x: p.created_at,
                        y: p.price,
                    })),
                })
            });

            const data = {
                datasets: priceDatasets,
            };

            const chart = new Chart(chartCanvas, {
                type: 'line',
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Price History',
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                            align: 'start',
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'day'
                            }
                        },
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Price (৳)',
                            },
                        },
                    },
                },
            });

            return () => {
                if (chart) chart.destroy();
            }
        };
    }

    async function handleUntrack() {
        untrackProduct(productId)
        .match(
            () => {
                toasts.success('Product tracking disabled!');
                return trackedProducts.refresh();
            },
            () => {
                toasts.error('Failed to untrack product. Please try again.');
            }
        )
    }

    async function handleTrack() {
        if (userState.email) {
            // User is logged in, show price input modal
            targetPriceInput = '';
            showTrackModal = true;
        } else {
            // User is not logged in, show login modal
            showLoginModal = true;
        }
    }

    async function submitTrackingPrice() {
        const targetPrice = parseFloat(targetPriceInput);
        if (Number.isNaN(targetPrice) || targetPrice <= 0) {
            toasts.error('Please enter a valid target price');
            return;
        }

        trackProduct(productId, targetPrice)
        .match(
            () => {
                toasts.success('Product tracking enabled!');
                showTrackModal = false;
                targetPriceInput = '';
                return trackedProducts.refresh();
            },
            () => {
                toasts.error('Failed to track product. Please try again.'); 
            }
        )
    }

    function closeTrackModal() {
        showTrackModal = false;
        targetPriceInput = '';
    }

    function closeLoginModal() {
        showLoginModal = false;
    }

    async function handleMergeProduct() {
        const mergeProductIdInput = prompt('Enter the product ID to merge with:');
        const mergeProductId = parseInt(mergeProductIdInput ?? '');
        if (isNaN(mergeProductId) || mergeProductId <= 0) {
            alert('Please enter a valid product ID');
            return;
        }

        mergeProducts(productId, mergeProductId)
        .match(
            () => {
                toasts.success('Products merged successfully!');
                window.location.reload();
            },
            () => {
                toasts.error('Failed to merge products. Please try again.');
            }
        )
    }

    $effect(() => {
        // I don't like this. But without this the external products are fetched
        // twice during the initial load. And since prices and metadata are fetched
        // when external products are fetched, it causes those to be fetched twice as well.
        const sanitizedVariants: Record<string, string> = {};
        for (const [key, value] of Object.entries(selectedVariants)) {
            if (value !== 'unselected') {
                sanitizedVariants[key] = value;
            }
        }
        fetchExternalProductsByInternalId(productId, sanitizedVariants)
        .map((products) => {
            externalProducts = products;
            isExternalProductsLoaded = true;
        });
    });

    let noConfigurationSelected = $derived.by(() => {
        return Object.values(selectedVariants)
            .every(
                (value) => value === 'unselected'
            );
    });

    function getSelectedVariantsFormatted(configs: Record<string, string>) {
        return variants
            .filter((variant) => configs[variant.name] !== 'unselected')
            .map((variant) => ({
                name: variant.display_text,
                value: `${configs[variant.name]} ${variant.unit || ''}`,
            }));
    }

    function handleUnmerge(externalProductId: number) {
        if (!confirm('Are you sure you want to unmerge this product? This action cannot be undone.')) {
            return;
        }

        unmergeProducts(productId, externalProductId)
        .match(
            (resp) => {
                console.log('Unmerge response:', resp);
                toasts.success('Product unmerged successfully!');
                window.location.reload();
            },
            (err) => {
                toasts.error('Failed to unmerge product. Please try again.');
                console.error('Error unmerging product:', err);
            }
        )
    }

    function getLastUpdatedText(updateDate: string | null): string {
        if (!updateDate) return 'Unknown';
        const daysAgo = dayjs().diff(dayjs(updateDate), 'day');
        if (daysAgo === 0) return 'Today';
        if (daysAgo === 1) return 'Yesterday';
        return `${daysAgo} days ago`;

    }

    onMount(async () => {
        flaggingOptions = await getFlaggingOptions().unwrapOr([]);
    });

    async function handleFlagIncorrectGrouping(externalProductId: number) {
        const product = externalProducts.find(p => p.external_product_id === externalProductId);
        flaggingProductId = externalProductId;
        flaggingProductName = product?.name || 'Unknown Product';
        showFlagModal = true;
    }

    async function submitFlag() {
        if (!flaggingProductId) return;
        flagIncorrectGrouping(flaggingProductId, selectedFlaggingOptions)
        .match(
            () => {
                showFlagModal = false;
                toasts.success('Thank you! The incorrect grouping has been flagged for review.');
            },
            () => {
                toasts.error('Failed to flag incorrect grouping. Please try again.');
            }
        )
        .then(() => {
            flaggingProductId = null;
            flaggingProductName = '';
        });
    }

    function closeFlagModal() {
        showFlagModal = false;
        flaggingProductId = null;
        flaggingProductName = '';
    }
</script>

<svelte:head>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html
        generateSEOConfig({
            title: product?.name ? `${product.name} - Find lowest prices in Bangladesh` : 'Product Details',
            description: `Lowest prices for ${product?.name || 'this product'} in Bangladesh. Check price history, track price drops and grab the best deals from top retailers.`,
            canonical: `https://daam.deals/products/${productId}`,
        })
    }
    
    {#if product}
        <!-- Product Structured Data -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html
            generateLdJSON(JSON.stringify(generateProductStructuredData(product, externalPrices), null, 2))
        }
        
        <!-- Breadcrumb Structured Data -->
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html
            generateLdJSON(JSON.stringify(generateBreadcrumbStructuredData([
                { name: 'Home', url: 'https://daam.deals/' },
                { name: 'Products', url: 'https://daam.deals/products' },
                { name: product.name, url: `https://daam.deals/products/${productId}` }
            ]), null, 2))
        }
    {/if}
</svelte:head>

<div>
    <div class="product-header-container">
        {#if isEditingMainProduct}
            <div class="edit-name-container">
                <input
                    type="text"
                    class="product-name-input"
                    bind:value={editedMainName}
                    placeholder="Enter product name"
                />
                <div class="edit-buttons">
                    <button class="btn-save" onclick={handleSaveMainProduct}>Save</button>
                    <button class="btn-cancel" onclick={() => isEditingMainProduct = false}>Cancel</button>
                </div>
            </div>
        {:else}
            <!-- Left: Thumbnail -->
            {#if allProductImages.length > 0}
                <button class="product-thumbnail-carousel" onclick={openImageModal}>
                    <div class="thumbnail-image-container">
                        <img 
                            src={allProductImages[currentImageIndex]} 
                            alt={product?.name || 'Product image'}
                            class="thumbnail-image"
                        />
                    </div>
                </button>
            {/if}

            <!-- Right: Product Info -->
            <div class="product-header-right">
                <!-- Row 1: Name (and Availability/Track on desktop) -->
                <div class="product-header-row-1">
                    <h1>{product?.name}</h1>
                </div>
                <!-- Row 2 -->
                {#if isExternalProductsLoaded}
                    <div class="product-header-row-2 justify-between">
                        <div class="availability-indicator">
                            <span class="dot" class:available={isAvailable}></span>
                            <span class="status-text"
                                >{isAvailable ? 'Available' : 'Unavailable'}</span
                            >
                        </div>
                        {#if userState.email}
                            {#if trackedProducts.isTracked(productId)}
                                <button class="btn btn-danger" onclick={handleUntrack}> Untrack </button>
                            {:else}
                                <button class="btn btn-primary" onclick={handleTrack}>Track</button>
                            {/if}
                        {:else}
                            <button class="btn btn-primary" onclick={handleTrack}>Track</button>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Row 3: Category and Brand Badges -->
    <div class="my-4">
        {#if product?.manufacturer_name}
            <div class="category-badge">
                <span class="category-label">Brand</span>
                <span class="category-value">{product.manufacturer_name}</span>
            </div>
        {/if}

        {#if product?.category_name}
            <div class="category-badge">
                <span class="category-label">Category</span>
                <span class="category-value">{product.category_name}</span>
            </div>
        {/if}
    </div>

    {#if userState.isAdmin}
        <div class="admin-actions">
            <button class="btn btn-primary" onclick={startEditingMain}>Edit</button>
            <button class="btn" onclick={handleMergeProduct}>Merge</button>
        </div>
    {/if}

    {#if trackedProducts.isTracked(productId)}
        <div class="tracked-info">
            <p>
                You are tracking this product.
                The target price is {formatPrice(trackedProducts.getProduct(productId)!.target_price)}.
                If the price falls below target price you'll receive an email
            </p>
        </div>
    {/if}

    {#if variants.length > 0}
        <div class="variants-header">Select Configuration</div>
        <div class="variants-section">
            <div class="variants-grid">
                {#each variants as variant (variant.name)}
                    <div class="variant-selector">
                        <label for={variant.name}>{variant.display_text}</label>
                        {#if variant.values.length <= 3}
                            <div class="variant-buttons">
                                <button 
                                    class={['btn', selectedVariants[variant.name] === 'unselected' ? 'btn-primary': '']} 
                                    onclick={() => selectedVariants[variant.name] = 'unselected'}
                                >
                                    Any
                                </button>
                                {#each variant.values as value, idx (idx)}
                                    <button 
                                        class={['btn', selectedVariants[variant.name] === value.value ? 'btn-primary': '']} 
                                        onclick={() => selectedVariants[variant.name] = value.value}
                                    >
                                        {value.display_text}
                                    </button>
                                {/each}
                            </div>
                        {:else}
                            <select 
                                id={variant.name}
                                bind:value={selectedVariants[variant.name]}
                            >
                                <option value="unselected"> Choose a value </option>
                                {#each variant.values as value, idx (idx)}
                                    <option value={value.value}>{value.display_text}</option>
                                {/each}
                            </select>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if unavailableCount > 0}
        <div class="toggle-container">
            <label class="toggle-switch">
                <input type="checkbox" bind:checked={showUnavailableProducts} />
                <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">Show unavailable products ({unavailableCount} products)</span>
        </div>
    {/if}
    
    {#if externalProductsSorted.length > 0}
        {#if variants.length > 0}
            <div>
                <p class="savings-info">
                    {#if noConfigurationSelected}
                        The savings are shown for all configurations of this product. Select a configuration
                        if you want to see savings for a specific configuration.
                    {:else}
                        The savings are shown for all products with 
                        {#each getSelectedVariantsFormatted(selectedVariants) as selVar (selVar.name)}
                        <Pill label={selVar.name} value={selVar.value} />
                        {/each}
                    {/if}
                </p>
            </div>
        {/if}

        <div class="details">
            {#each externalProductsSorted as product (product.external_product_id)}
                <div class={['price-card', externalProductIdToHighlight === product.external_product_id ? 'highlighted-deal' : '']}
                    {@attach highlightExternalProduct(product)}
                >
                    {#if externalProductIdToHighlight === product.external_product_id}
                        <div class="deal-pointer">
                            <div class="pointer-arrow">👉</div>
                            <div class="pointer-text">This is the deal you just clicked on</div>
                        </div>
                    {/if}

                    {#if externalProductBadgesMap.has(product.external_product_id) && externalProductBadgesMap.get(product.external_product_id)!.length > 0}
                        <div class="badges-container">
                            {#each externalProductBadgesMap.get(product.external_product_id) ?? [] as badge (badge.key)}
                                <Badge label={badge.label} />
                            {/each}
                        </div>
                    {/if}
                    
                    <div class="product-info-row">
                        <!-- {#if product.image_urls && product.image_urls.length > 0}
                            <div class="product-image-container">
                                <img 
                                    src={product.image_urls[0]} 
                                    alt={product.name}
                                    class="product-image"
                                    loading="lazy"
                                />
                            </div>
                        {/if} -->
                        
                        <div class="product-name">
                            <span>
                                {product.name}
                            </span>
                            <button 
                                class="flag-btn" 
                                onclick={() => handleFlagIncorrectGrouping(product.external_product_id)}
                                title="Flag incorrect information"
                                aria-label="Flag incorrect information"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                    <line x1="4" y1="22" x2="4" y2="15"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="price-container">
                        <div
                            style="display: flex; align-items: center; gap: 0.5rem"
                        >
                            {#if latestPrice.get(product.external_product_id)?.price != null}
                                <div class="price-amount">{formatPrice(latestPrice.get(product.external_product_id)!.price)}</div>
                            {:else}
                                <div class="price-not-found">Price not found</div>
                            {/if}
                            {#if latestPrice.get(product.external_product_id)?.is_available}
                                <div class="availability-dot"></div>
                            {/if}
                            {#if latestPrice.get(product.external_product_id)?.price && latestPrice.get(product.external_product_id)!.price < maxPrice}
                                <div class="savings-badge">Save {formatPrice((maxPrice - latestPrice.get(product.external_product_id)!.price))}</div>
                            {/if}
                        </div>
                        {#if latestPrice.get(product.external_product_id)?.created_at}
                            <div class="timestamp">
                                Updated  {getLastUpdatedText(latestPrice.get(product.external_product_id)!.created_at)}
                            </div>
                        {/if}
                    </div>
                    <div class="store-info">
                        <a
                            href={linkWithUtmSource(product.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="buy-link"
                        >
                            View in <span class="store-name">{websiteMap.get(product.website_id)?.name}</span> →
                        </a>
                    </div>

                    {#if priceStats30Day.get(product.external_product_id)}
                        <PriceStat stats={priceStats30Day.get(product.external_product_id)!}>
                            <div style="padding-top: 0.5rem;">
                                <PriceChart {product} prices={externalProductPrices.get(product.external_product_id) ?? []} />
                            </div>
                        </PriceStat>
                    {/if}

                    {#if (externalProductMetadatas.get(product.external_product_id) ?? []).length > 0}
                        <div class="metadata-pills">
                            {#each externalProductMetadatas.get(product.external_product_id) ?? [] as metadata (metadata.name)}
                                <Pill label={metadata.name_display_text} value={metadata.value_display_text} />
                            {/each}
                        </div> 
                    {/if}

                    {#if userState.isAdmin}
                        <div class="admin-actions-product">
                            <button class="btn btn-danger" onclick={() => handleUnmerge(product.external_product_id)}>Unmerge</button>
                        </div>
                    {/if}
                </div>

            {/each}
        </div>

        <!-- <div class="chart-container">
            <canvas {@attach attachChart()} ></canvas>
        </div> -->
    {:else}
        {#if !isExternalProductsLoaded}
            <Loader headerText="Loading product details..." />
        {:else if externalProducts.length === 0}
            <div class="no-products">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No products available for this configuration.</p>
                <p class="suggestion">Try selecting different configurations.</p>
            </div>
        {/if}
    {/if}
</div>

<!-- Flag Modal -->
{#if showFlagModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeFlagModal} role="dialog" tabindex="-1">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="modal-content" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <span class="flag-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                </span>
                <h3>Report Incorrect Information</h3>
                <button class="modal-close" onclick={closeFlagModal} aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="modal-body">
                <div class="product-info">
                    <strong>{flaggingProductName}</strong>
                </div>
                <p>
                    You're about to flag this product for having incorrect information. Select the issues that apply,
                </p>
                
                <div class="issues-list">
                    {#each flaggingOptions as option (option.id)}
                        <div>
                            <label>
                                <input type="checkbox" name="flaggingOptions" value={option.id} bind:group={selectedFlaggingOptions}>
                                {option.description}
                            </label>
                        </div>
                    {/each}
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-cancel-modal" onclick={closeFlagModal}>Cancel</button>
                <button class="btn-submit-flag" onclick={submitFlag}>Submit Flag</button>
            </div>
        </div>
    </div>
{/if}

<!-- Track Price Modal (for logged-in users) -->
{#if showTrackModal}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div 
        class="modal-overlay" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="track-modal-title"
        onclick={closeTrackModal}
        onkeydown={(e) => e.key === 'Escape' && closeTrackModal()}
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            class="modal-content" 
            role="document"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <div class="modal-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="track-icon">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                <h3 id="track-modal-title">Track Product</h3>
                <button class="modal-close" onclick={closeTrackModal} aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            
            <div class="modal-body">
                <div class="product-info">
                    <strong>{product?.name || 'This Product'}</strong>
                </div>
                <p>
                    This product will be tracked for all of its variants. You'll receive an email notification when the price falls below your target price.
                </p>
                
                <div class="price-input-section">
                    <label for="targetPrice">Target Price (৳)</label>
                    <input 
                        type="number" 
                        id="targetPrice"
                        class="price-input"
                        placeholder="Enter target price"
                        min="0"
                        step="0.01"
                        bind:value={targetPriceInput}
                    />
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick={closeTrackModal}>Cancel</button>
                <button class="btn btn-primary" onclick={submitTrackingPrice}>Start Tracking</button>
            </div>
        </div>
    </div>
{/if}

<!-- Login Required Modal (for non-logged-in users) -->
{#if showLoginModal}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div 
        class="modal-overlay" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onclick={closeLoginModal}
        onkeydown={(e) => e.key === 'Escape' && closeLoginModal()}
    >
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
            class="modal-content" 
            role="document"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <div class="modal-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="login-icon">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <h3 id="login-modal-title">Login Required</h3>
                <button class="modal-close" onclick={closeLoginModal} aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            
            <div class="modal-body">
                <div class="product-info">
                    <strong>{product?.name || 'This Product'}</strong>
                </div>
                <p>
                    Log in to track this product and get price updates when prices drop below your target.
                </p>
            </div>
            
            <div class="modal-footer">
                <button class="btn-cancel-modal" onclick={closeLoginModal}>Cancel</button>
                <button onclick={() => goto('/accounts', { state: { redirectTo: page.url.href } })} class="btn-login">Log In</button>
            </div>
        </div>
    </div>
{/if}

<!-- Image Modal -->
<ImageCarouselModal 
    images={allProductImages}
    show={showImageModal}
    initialIndex={currentImageIndex}
    onClose={closeImageModal}
/>

<style>
    .product-thumbnail-carousel {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }

    .thumbnail-image-container {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .thumbnail-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 0.5rem;
        animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .thumbnail-indicators {
        position: absolute;
        bottom: 0.25rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 9999px;
        backdrop-filter: blur(4px);
    }

    .thumbnail-indicator-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 0;
    }

    .thumbnail-indicator-dot:hover {
        background: rgba(255, 255, 255, 0.8);
        transform: scale(1.3);
    }

    .thumbnail-indicator-dot.active {
        background: white;
        width: 12px;
        border-radius: 2px;
    }

    @media (max-width: 640px) {
        .product-thumbnail-carousel {
            width: 80px;
            height: 80px;
        }

        .thumbnail-image {
            padding: 0.25rem;
        }

        .thumbnail-indicators {
            bottom: 0.125rem;
            padding: 0.125rem 0.375rem;
        }

        .thumbnail-indicator-dot {
            width: 3px;
            height: 3px;
        }

        .thumbnail-indicator-dot.active {
            width: 9px;
        }
    }

    .variants-header {
        margin-top: 2rem;
    }

    .edit-name-container {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .product-name-input {
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1.5rem;
        color: #374151;
        width: 400px;
    }

    .btn-edit {
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        color: #6b7280;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        margin-left: 0.5rem;
    }

    .btn-edit:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .btn-merge {
        padding: 0.25rem 0.5rem;
        background: #4f46e5;
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-merge:hover {
        background: #4338ca;
    }

    .edit-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .btn-save {
        padding: 0.25rem 0.5rem;
        background: #2563eb;
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 0.875rem;
        cursor: pointer;
    }

    .btn-save:hover {
        background: #1d4ed8;
    }

    .btn-cancel {
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        color: #6b7280;
        font-size: 0.875rem;
        cursor: pointer;
    }

    .btn-cancel:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .untrack {
        background-color: #dc2626;
    }

    .track-btn {
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-left: 1rem;
    }

    .track-btn:hover {
        background-color: #1d4ed8;
    }

    .admin-actions-product {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
    }

    .variants-section {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .variants-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .variant-selector {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .variant-selector label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    .variant-selector select {
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background-color: white;
        color: #374151;
        font-size: 0.875rem;
    }

    .variant-selector select:focus {
        outline: none;
        border-color: #2563eb;
    }

    .variant-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .variant-button {
        padding: 0.5rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        background-color: white;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: fit-content;
    }

    .variant-button:hover {
        border-color: #2563eb;
        background-color: #f8fafc;
    }

    .variant-button.selected {
        border-color: #2563eb;
        background-color: #2563eb;
        color: white;
    }

    .variant-button:focus {
        outline: none;
    }

    .savings-badge {
        background-color: #22c55e;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .timestamp {
        font-size: 0.875rem;
        color: #6b7280;
        margin-left: auto;
        font-style: italic;
    }

    .availability-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #22c55e;
        animation: pulse 2s infinite;
    }
    .product-details {
        max-width: 800px;
        margin: 1rem auto;
        padding: 0 1rem;
    }

    .details {
        margin: 1rem 0;
    }

    h1 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    @media (max-width: 640px) {
        h1 {
            font-size: 1.5rem;
            /* margin-bottom: 1.5rem; */
            width: 100%;
            line-height: 1.3;
        }

        .details {
            margin-top: 1rem;
        }
    }

    .chart-container {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        height: 60vh;
        position: relative;
    }

    @media (max-width: 640px) {
        .chart-container {
            height: 40vh;
        }
    }

    .no-products {
        background: white;
        border-radius: 8px;
        padding: 3rem 1.5rem;
        margin: 2rem 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
    }

    .no-products .icon {
        width: 48px;
        height: 48px;
        color: #6b7280;
        margin-bottom: 0.5rem;
    }

    .no-products p {
        color: #374151;
        font-size: 1.125rem;
        font-weight: 500;
        margin: 0;
    }

    .no-products .suggestion {
        color: #6b7280;
        font-size: 0.875rem;
        font-weight: normal;
    }

    .price-container {
        display: flex;
        justify-content: space-between;
        align-items: start;
        flex-flow: wrap-reverse;
        gap: 0.5rem;
    }

    .tracked-info {
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
    }

    .savings-info {
        font-size: 0.875rem;
        color: #6b7280;
        font-style: italic;
        padding: 1rem 0.5rem;
    }

    .deal-pointer {
        top: -2.5rem;
        left: -1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 10;
        /* animation: springBounce 1.5s ease-in-out infinite; */
    }

    .pointer-arrow {
        font-size: 2rem;
        transform-origin: bottom right;
        animation: pointAnimation 1s ease-in-out infinite;
    }

    .pointer-text {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 1.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        animation: textBounce 1s ease-in-out infinite;
    }

    @keyframes springBounce {
        0%, 100% {
            transform: translateY(0) scale(1);
        }
        25% {
            transform: translateY(-8px) scale(1.05);
        }
        50% {
            transform: translateY(0) scale(1);
        }
        75% {
            transform: translateY(-4px) scale(1.02);
        }
    }

    @keyframes pointAnimation {
        0%, 100% {
            transform: rotate(0deg) scale(1);
        }
        25% {
            transform: rotate(-15deg) scale(1.1);
        }
        50% {
            transform: rotate(0deg) scale(1);
        }
        75% {
            transform: rotate(-8deg) scale(1.05);
        }
    }

    @keyframes textBounce {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.02);
        }
    }

    /* Responsive adjustments for mobile */
    @media (max-width: 640px) {
        .pointer-arrow {
            font-size: 1.5rem;
            transform: rotate(90deg);
            transform-origin: center;
        }

        .pointer-text {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
            white-space: normal;
        }
    }

    .price-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        position: relative;
    }

    .product-image-container {
        width: 80px;
        height: 80px;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e5e7eb;
    }

    .product-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: transform 0.2s ease;
    }

    .product-image:hover {
        transform: scale(1.1);
    }

    @media (max-width: 640px) {
        .product-image-container {
            width: 60px;
            height: 60px;
        }
    }

    .price-card.highlighted-deal {
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), 
                    0 8px 16px rgba(37, 99, 235, 0.15);
        animation: pulseGlow 2s ease-in-out infinite;
    }

    @keyframes pulseGlow {
        0%, 100% {
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), 
                        0 8px 16px rgba(37, 99, 235, 0.15);
        }
        50% {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3), 
                        0 12px 24px rgba(37, 99, 235, 0.2);
        }
    }

    .price-card:hover {
        transform: translateY(-2px);
    }

    .badges-container {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
    }

    .product-info-row {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    }

    .product-name {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }

    .flag-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        margin-left: auto;
    }

    .flag-btn:hover {
        color: #dc2626;
        background-color: #fef2f2;
        opacity: 1;
        transform: scale(1.1);
    }

    .flag-btn:active {
        transform: scale(0.95);
    }

    .product-name-input {
        flex: 1;
        padding: 0.25rem 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 0.875rem;
        color: #374151;
    }

    .btn-edit {
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        color: #6b7280;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-edit:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .btn-merge {
        padding: 0.25rem 0.5rem;
        background: #4f46e5;
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-merge:hover {
        background: #4338ca;
    }

    .edit-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .btn-save {
        padding: 0.25rem 0.5rem;
        background: #2563eb;
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 0.75rem;
        cursor: pointer;
    }

    .btn-save:hover {
        background: #1d4ed8;
    }

    .btn-cancel {
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        color: #6b7280;
        font-size: 0.75rem;
        cursor: pointer;
    }

    .btn-cancel:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .price-amount {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
    }

    @media (min-width: 640px) {
        .price-amount {
            font-size: 1.75rem;
        }
    }

    .price-not-found {
        background-color: #fef2f2;
        color: #dc2626;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    @media (min-width: 640px) {
        .price-not-found {
            font-size: 1rem;
        }
    }

    .store-info {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
        align-items: center;
        margin-left: auto;
    }

    .store-name {
        font-weight: 800;
    }

    .buy-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
    }

    .buy-link:hover {
        text-decoration: underline;
    }

    .product-header-container {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 2rem;
        width: 100%;
        align-items: flex-start;
    }

    .product-header-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .product-header-row-1 {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .product-header-row-1 h1 {
        flex: 1;
        margin: 0;
        min-width: 200px;
    }

    .product-header-row-2 {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    @media (max-width: 640px) {
        .product-header-container {
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .product-header-right {
            gap: 0.75rem;
        }

        .product-header-row-1 {
            flex-direction: row;
            align-items: flex-start;
            gap: 1rem;
        }

        .product-header-row-1 h1 {
            flex: 1;
            min-width: unset;
            font-size: 1.25rem;
        }

        .product-header-row-2 {
            width: 100%;
        }

        .edit-name-container {
            flex-direction: column;
            gap: 1rem;
        }

        .product-name-input {
            width: 100%;
            font-size: 1.25rem;
        }
    }

    .availability-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #d1d5db;
    }

    .dot.available {
        background-color: #22c55e;
        animation: pulse 2s infinite;
    }

    .status-text {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .category-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: #e0e7ff;
        color: #4338ca;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        width: fit-content;
    }

    .category-label {
        font-weight: 500;
        opacity: 0.8;
    }

    .category-value {
        font-weight: 600;
    }

    @keyframes pulse {
        0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }

        70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
        }

        100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
    }

    .metadata-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        margin-top: auto;
    }

    @media (max-width: 640px) {
        .store-info {
            width: 100%;
        }

        .buy-link {
            width: 100%;
            text-align: center;
            padding: 0.5rem;
            background-color: #2563eb;
            color: white;
            border-radius: 6px;
        }

        .buy-link:hover {
            background-color: #1d4ed8;
            text-decoration: none;
        }
    }

    /* Toggle Switch Styles */
    .toggle-container {
        display: flex;
        align-items: center;
        padding: 1rem 0rem;
        gap: 1rem;
    }

    .toggle-label {
        font-size: 0.875rem;
        color: #374151;
        font-weight: 500;
    }

    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
        cursor: pointer;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .toggle-slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #d1d5db;
        border-radius: 24px;
        transition: all 0.3s ease;
    }

    .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .toggle-switch input:checked + .toggle-slider {
        background-color: #2563eb;
    }

    .toggle-switch input:checked + .toggle-slider:before {
        transform: translateX(26px);
    }

    .toggle-switch input:focus + .toggle-slider {
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    @media (max-width: 640px) {
        .toggle-container {
            padding: 0.75rem 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
        }

        .toggle-label {
            font-size: 0.8rem;
        }
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
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
        gap: 1rem;
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
        margin-left: auto;
    }

    .modal-close:hover {
        color: #374151;
        background-color: #f3f4f6;
    }

    .modal-body {
        padding: 0 1.5rem;
        text-align: center;
    }

    .flag-icon {
        color: #dc2626;
        display: flex;
        justify-content: center;
    }

    .modal-body p {
        color: #6b7280;
        margin-bottom: 1rem;
        line-height: 1.5;
    }

    .product-info {
        background-color: #f3f4f6;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        color: #374151;
        font-size: 0.875rem;
    }

    .issues-list {
        text-align: left;
        color: #6b7280;
        font-size: 0.875rem;
        margin: 0.75rem 0 1.5rem 0;
        padding-left: 1.25rem;
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

    .btn-submit-flag {
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

    .btn-submit-flag:hover {
        background: #b91c1c;
    }

    /* Track and Login Modal Styles */
    .track-icon {
        color: #2563eb;
        display: flex;
        justify-content: center;
    }

    .login-icon {
        color: #059669;
        display: flex;
        justify-content: center;
    }

    .price-input-section {
        text-align: left;
        margin: 1.5rem 0;
    }

    .price-input-section label {
        display: block;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }

    .price-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
        color: #374151;
        background-color: white;
        transition: border-color 0.2s;
    }

    .price-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .btn-submit-track {
        padding: 0.5rem 1rem;
        background: #2563eb;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-submit-track:hover {
        background: #1d4ed8;
    }

    .btn-login {
        padding: 0.5rem 1rem;
        background: #059669;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
    }

    .btn-login:hover {
        background: #047857;
        text-decoration: none;
    }

    @media (max-width: 640px) {
        .modal-content {
            margin: 1rem;
            max-width: none;
        }

        .modal-footer {
            flex-direction: column;
        }

        .btn-cancel-modal,
        .btn-submit-flag,
        .btn-submit-track,
        .btn-login {
            width: 100%;
            justify-content: center;
            text-align: center;
        }
    }
</style>
