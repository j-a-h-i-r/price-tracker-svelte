<script lang="ts">
    import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
    import type { ExternalProductPrice } from '$lib/types/Product.js';
    import { formatPrice } from '$lib/util.js';
    import { Chart } from 'chart.js/auto';
    import dayjs from 'dayjs';
    import type { Attachment } from 'svelte/attachments';

    interface Props {
        product: {
            name: string;
        };
        prices: ExternalProductPrice[];
    }
    let { product, prices }: Props = $props();
    
    function attachInlineChart(): Attachment<HTMLCanvasElement> {
        return (chartCanvas: HTMLCanvasElement) => {
            if (!chartCanvas) return;

            let priceDatasets: {
                label: string;
                data: { x: string; y: number }[];
            }[] = [];

            let productPrices = prices.map((p) =>({
                x: p.created_at,
                y: p.price,
            }));
            priceDatasets.push({
                label: product.name,
                data: productPrices,
                // cubicInterpolationMode: 'monotone',
                // tension: 0.4,
            });

            const data = {
                datasets: priceDatasets,
            };

            const chart = new Chart(chartCanvas, {
                type: 'line',
                data,
                options: {
                    elements: {
                        point: {
                            radius: 0,
                        },
                    },
                    hover: {
                        mode: 'index',
                        intersect: false,
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false,
                        },
                        legend: {
                            display: false,
                        },
                    },
                    scales: {
                        x: {
                            border: {
                                display: false,
                            },
                            display: true,
                            type: 'time',
                            time: {
                                unit: 'day',
                            },
                            ticks: {
                                autoSkip: false,
                                callback: function (value, index, ticks) {
                                    if (
                                        index === 0 ||
                                        index === ticks.length - 1
                                    ) {
                                        return dayjs(value).format('MMM D');
                                    }
                                    return null;
                                },
                            },
                            grid: {
                                display: false,
                            },
                        },
                        y: {
                            border: {
                                display: false,
                            },
                            beginAtZero: false,
                            display: true,
                            title: {
                                display: false,
                                text: 'Price (৳)',
                            },
                            ticks: {
                                display: true,
                                callback: function (value, index, ticks) {
                                    if (
                                        index === 0 ||
                                        index === ticks.length - 1
                                    ) {
                                        return formatPrice(Number(value));
                                    }
                                    return null;
                                },
                            },
                            grid: {
                                display: false,
                            },
                        },
                    },
                },
            });

            return () => {
                if (chart) chart.destroy();
            };
        };
    }
</script>

<canvas {@attach attachInlineChart()}> </canvas>
