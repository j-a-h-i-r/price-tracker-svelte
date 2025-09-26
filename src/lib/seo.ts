import type { Product } from '$lib/types/Product.js';
import type { Deal } from '$lib/types/Deal.js';

export interface SEOConfig {
	title: string;
	description: string;
	keywords?: string;
	canonical?: string;
	ogType?: 'website' | 'article' | 'product';
	ogImage?: string;
	twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
	structuredData?: any;
}

export function generateSEOConfig(config: SEOConfig): string {
	const { title, description, canonical, ogType = 'website', ogImage, twitterCard = 'summary_large_image', structuredData } = config;
	
	const siteName = 'daam.deals';
	const siteUrl = 'https://daam.deals';
	const defaultImage = `${siteUrl}/favicon.svg`;
	
	let metaTags = `
		<title>${title} | ${siteName}</title>
		<meta name="description" content="${description}" />
		
		<!-- Open Graph -->
		<meta property="og:title" content="${title}" />
		<meta property="og:description" content="${description}" />
		<meta property="og:type" content="${ogType}" />
		<meta property="og:site_name" content="${siteName}" />
		<meta property="og:image" content="${ogImage || defaultImage}" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:url" content="${canonical || siteUrl}" />
		
		<!-- Twitter Card -->
		<meta name="twitter:card" content="${twitterCard}" />
		<meta name="twitter:title" content="${title}" />
		<meta name="twitter:description" content="${description}" />
		<meta name="twitter:image" content="${ogImage || defaultImage}" />
		
		<!-- Canonical URL -->
		<link rel="canonical" href="${canonical || siteUrl}" />`;
	
	if (structuredData) {
		metaTags += `
		<!-- Structured Data -->
		<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
	}
	
	return metaTags.trim();
}

export function generateProductStructuredData(product: Product): any {
	return {
		"@context": "https://schema.org/",
		"@type": "Product",
		"name": product.name,
		"description": product.name,
		"sku": product.id.toString(),
		"brand": {
			"@type": "Brand",
			"name": product.manufacturer_name || "Unknown"
		},
		"category": product.category_name || "Uncategorized",
	};
}

export function generateLdJSON(data: string): string {
	return `
	<script type="application/ld+json">
		${data}
	</script>
	`.trim();
}

export function generateWebsiteStructuredData(): any {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"name": "daam.deals",
		"alternateName": "Price Tracker Bangladesh",
		"url": "https://daam.deals",
		"description": "Track prices and find the best deals on products in Bangladesh",
		"potentialAction": {
			"@type": "SearchAction",
			"target": {
				"@type": "EntryPoint",
				"urlTemplate": "https://daam.deals/products?q={search_term_string}"
			},
			"query-input": "required name=search_term_string"
		},
		"sameAs": [
			"https://github.com/j-a-h-i-r/price-tracker-svelte"
		]
	};
}

export function generateOrganizationStructuredData(): any {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		"name": "daam.deals",
		"description": "Price tracking service for Bangladesh",
		"url": "https://daam.deals",
		"logo": "https://daam.deals/favicon.png",
		"contactPoint": {
			"@type": "ContactPoint",
			"contactType": "customer service",
			"url": "https://daam.deals"
		},
		"sameAs": [
			"https://github.com/j-a-h-i-r/price-tracker-svelte"
		]
	};
}

export function generateDealStructuredData(deal: Deal): any {
	return {
		"@context": "https://schema.org/",
		"@type": "Offer",
		"name": `Deal on ${deal.product_name}`,
		"description": `Great deal available on ${deal.product_name}`,
		"price": deal.current_price,
		"priceCurrency": "BDT",
		"availability": "https://schema.org/InStock",
		"url": `https://daam.deals/products/${deal.product_id}`,
		"seller": {
			"@type": "Organization",
			"name": deal.website_name
		},
		"itemOffered": {
			"@type": "Product",
			"name": deal.product_name
		}
	};
}

export function generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): any {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		"itemListElement": breadcrumbs.map((crumb, index) => ({
			"@type": "ListItem",
			"position": index + 1,
			"name": crumb.name,
			"item": crumb.url
		}))
	};
}

export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>): any {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		"mainEntity": faqs.map(faq => ({
			"@type": "Question",
			"name": faq.question,
			"acceptedAnswer": {
				"@type": "Answer",
				"text": faq.answer
			}
		}))
	};
}