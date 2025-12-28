import { API_URL } from '$env/static/private';

interface ProductWithDate {
    id: number;
    updated_at?: string;
    slug: string;
}

async function fetchAllProducts(): Promise<ProductWithDate[]> {
    const products: ProductWithDate[] = [];
    const firstPage = await fetch(`${API_URL}/api/products?page=first`).then(res => res.json());
    products.push(...firstPage.data);

    let nextToken = firstPage.next_token;
    while (nextToken) {
        const nextPage = await fetch(`${API_URL}/api/products?page=next&next_token=${nextToken}`).then(res => res.json());
        products.push(...nextPage.data);
        nextToken = nextPage.next_token;
    }
    return products;
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function generateUrl(loc: string, changefreq: string, priority: string, lastmod?: string): string {
    const lastmodTag = lastmod ? `\n            <lastmod>${lastmod}</lastmod>` : '';
    return `
        <url>
            <loc>${loc}</loc>${lastmodTag}
            <changefreq>${changefreq}</changefreq>
            <priority>${priority}</priority>
        </url>`;
}

export async function GET() {
    const products = await fetchAllProducts();
    const today = formatDate(new Date());

    // Static pages
    const staticUrls = [
        generateUrl('https://daam.deals/', 'daily', '1.0', today),
        generateUrl('https://daam.deals/deals', 'daily', '0.9', today),
        generateUrl('https://daam.deals/products', 'daily', '0.8', today),
        generateUrl('https://daam.deals/categories', 'weekly', '0.7', today),
        generateUrl('https://daam.deals/websites', 'weekly', '0.6', today),
    ];

    // Product pages
    const productUrls = products.map((product) => {
        const lastmod = product.updated_at ? formatDate(new Date(product.updated_at)) : undefined;
        return generateUrl(
            `https://daam.deals/products/${product.slug}`,
            'daily',
            '0.8',
            lastmod
        );
    });

    const allUrls = [...staticUrls, ...productUrls];

    const sitemap = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset
    xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="https://www.w3.org/1999/xhtml"
    xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
    xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
    xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
    xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
>${allUrls.join('')}
</urlset>`;

    return new Response(
        sitemap,
        {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'max-age=3600'
            }
        }
    );
}