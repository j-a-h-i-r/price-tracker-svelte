import { API_URL } from '$env/static/private';

async function fetchAllProducts() {
    const products = [];
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

export async function GET() {
    const products = await fetchAllProducts();

    const urls = products.map((product) => {
        return `
        <url>
            <loc>https://daam.deals/products/${product.id}</loc>
            <changefreq>daily</changefreq>
            <priority>0.8</priority>
        </url>
        `
    });

    const sitemap = `
		<?xml version="1.0" encoding="UTF-8" ?>
		<urlset
			xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
			xmlns:xhtml="https://www.w3.org/1999/xhtml"
			xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
			xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
			xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
			xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
		>
			${urls.join('\n')}
		</urlset>`.trim();


	return new Response(
        sitemap,
		{
			headers: {
				'Content-Type': 'application/xml'
			}
		}
	);
}