import { fetchCategories } from "$lib/api/products.js";
import type { LayoutLoad } from "./$types.js";
import { getManufacturers } from "$lib/api/manufacturers.js";
import { arrayToPerIdMap } from "$lib/util.js";
import { fetchDeals } from "$lib/api/deals.js";
import { fetchWebsites } from "$lib/api/websites.js";

// export const prerender = true;
export const ssr = true;

export const load: LayoutLoad = async ({ fetch }) => {
    console.log("[In layout load]");
    // I don't expect these values to change while the user
    // is browsing the site. So fetching these once
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