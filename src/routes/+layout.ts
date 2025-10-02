import { fetchCategories } from "$lib/api/products.js";
import type { LayoutLoad } from "./$types.js";
import { getManufacturers } from "$lib/api/manufacturers.js";
import { arrayToPerIdMap } from "$lib/util.js";
import { fetchDeals } from "$lib/api/deals.js";
import { fetchWebsites } from "$lib/api/websites.js";

// export const prerender = true;
export const ssr = true;

export const load: LayoutLoad = async ({ fetch }) => {
    const categories = await fetchCategories(fetch).unwrapOr([]);
    const manufacturers = await getManufacturers(fetch).unwrapOr([]);
    const websites = await fetchWebsites(fetch).unwrapOr([]);
    const deals = await fetchDeals({}, fetch).unwrapOr([]);
    const categoryMap = arrayToPerIdMap(categories);
    const manufacturerMap = arrayToPerIdMap(manufacturers);
    const websiteMap = arrayToPerIdMap(websites);
    return {
        categories,
        manufacturers,
        categoryMap,
        manufacturerMap,
        websiteMap,
        deals,
    };
}