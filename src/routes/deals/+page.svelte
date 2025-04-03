<script>
  import { onMount } from 'svelte';
  import { Chart } from 'chart.js/auto';

  let deals = [];
  /**
     * @type {{ name: any; price: any; discount: any; msrp?: number; } | null}
     */
  let bestDeal = null;
  /**
     * @type {import("chart.js").ChartItem}
     */
  let chartCanvas;
  let chart;

  // Dummy data remains the same
  const dummyDeals = [
    { name: 'RTX 4070', price: 549, msrp: 599, discount: 8.3 },
    { name: 'RX 6800 XT', price: 499, msrp: 649, discount: 23.1 },
    { name: 'RTX 4060 Ti', price: 379, msrp: 399, discount: 5 },
    { name: 'RX 7900 XT', price: 799, msrp: 899, discount: 11.1 },
  ];

  onMount(() => {
    deals = dummyDeals;
    bestDeal = deals.reduce((prev, current) => 
      (prev.discount > current.discount) ? prev : current
    );

    // Create chart
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: deals.map(deal => deal.name),
        datasets: [
          {
            label: 'Current Price ($)',
            data: deals.map(deal => deal.price),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'MSRP ($)',
            data: deals.map(deal => deal.msrp),
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Price in USD'
            }
          }
        }
      }
    });
  });
</script>

<div class="deals-container">
  <h1>GPU Deals</h1>
  <p>Best deals from last month</p>

  {#if bestDeal}
    <div class="best-deal">
      <h2>🏆 Best Deal</h2>
      <p>
        <strong>{bestDeal.name}</strong> at ${bestDeal.price}
        <span class="discount">{bestDeal.discount}% off MSRP!</span>
      </p>
    </div>
  {/if}

  <div class="chart-container">
    <canvas bind:this={chartCanvas}></canvas>
  </div>

  <!-- Rest of your template remains the same -->
  ...
</div>

