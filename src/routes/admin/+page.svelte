<script lang="ts">
    // The admin check is now handled in the layout
</script>

<div class="container">
    <h1>Admin Dashboard</h1>
    <p class="welcome-text">Welcome to the admin dashboard. Use the sidebar to navigate to different admin functions.</p>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3>Quick Stats</h3>
            <p>Overview of system status and metrics will be displayed here.</p>
        </div>
        
        <div class="stat-card">
            <h3>Recent Activity</h3>
            <p>Latest admin activities and system events will be shown here.</p>
        </div>
        
        <div class="stat-card">
            <h3>System Health</h3>
            <p>Current system health and performance metrics.</p>
        </div>
    </div>
</div>

<style>
    .container {
        max-width: 64rem;
        margin: 0;
        padding: 2rem;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1rem;
        color: #111827;
    }

    .welcome-text {
        color: #6b7280;
        margin-bottom: 2rem;
        font-size: 1rem;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .stat-card {
        padding: 1.5rem;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .stat-card h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #111827;
    }

    .stat-card p {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.5;
    }
</style>