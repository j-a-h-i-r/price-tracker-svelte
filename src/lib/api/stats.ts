interface Stats {
    products: number;
    categories: number;
    websites: number;
}

export async function fetchStats(): Promise<Stats> {
    const response = await fetch('/api/stats');
    if (!response.ok) {
        throw new Error('Failed to fetch stats');
    }
    return response.json();
}
