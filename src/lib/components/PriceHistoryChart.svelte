<script lang="ts">
    import { Chart } from "chart.js/auto";
    import "chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm";
    import { formatPrice } from "$lib/util.js";
    import dayjs from "dayjs";
    import type { ExternalProductPrice } from "$lib/types/Product.js";
    import type { Attachment } from "svelte/attachments";

    interface Props {
        priceData: ExternalProductPrice[];
        productName: string;
        height?: string;
        showTitle?: boolean;
        targetPrice?: number;
    }

    let { priceData, productName, height = "200px", showTitle = true, targetPrice }: Props = $props();

    function attachChart(): Attachment<HTMLCanvasElement> {
        return (chartCanvas: HTMLCanvasElement) => {
            if (!chartCanvas || !priceData?.length) return;

            const chartData = priceData.map((p) => ({
                x: p.created_at,
                y: p.price,
            }));

            const datasets: any[] = [{
                label: 'Price',
                data: chartData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4,
            }];

            // Add target price line if provided
            if (targetPrice) {
                datasets.push({
                    label: 'Target Price',
                    data: chartData.map(d => ({ x: d.x, y: targetPrice })),
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                });
            }

            const data = {
                datasets: datasets,
            };

            const chart = new Chart(chartCanvas, {
                type: "line",
                data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: showTitle,
                            text: `${productName} - Price History`,
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: !!targetPrice,
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${formatPrice(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: "time",
                            time: {
                                unit: 'day',
                                displayFormats: {
                                    day: 'MMM D'
                                }
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Price (৳)',
                                font: {
                                    size: 12
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return formatPrice(value);
                                },
                                font: {
                                    size: 11
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                },
            });

            return () => {
                if (chart) chart.destroy();
            }
        };
    }
</script>

<div class="chart-wrapper" style="height: {height};">
    {#if priceData?.length > 0}
        <canvas {@attach attachChart()}></canvas>
    {:else}
        <div class="no-data">
            <p>No price history available</p>
        </div>
    {/if}
</div>

<style>
    .chart-wrapper {
        position: relative;
        border-radius: 8px;
        background: white;
        border: 1px solid #e5e7eb;
    }

    .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
        font-size: 0.875rem;
    }

    canvas {
        border-radius: 8px;
    }
</style>