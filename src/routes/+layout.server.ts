import type { LayoutServerLoad } from "./$types.js";
import { fetchDeals } from "$lib/api/deals.js";
import { getManufacturers } from "$lib/api/manufacturers.js";
import { fetchCategories } from "$lib/api/products.js";
import { fetchWebsites } from "$lib/api/websites.js";
import { arrayToPerIdMap } from "$lib/util.js";
import { getMyInfo, getMyTrackedProducts } from "$lib/api/me.js";
import type { TrackedProduct } from "$lib/types/Product.js";

type User = {
    isExistingUser: false;
} | {
    isExistingUser: true;
    email: string;
    isAdmin: boolean;
}

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
    console.log(Date.now(),"[In server layout load]");
    const isExistingUser = cookies.get('LoggedInAt') !== undefined;
    let user: User = { isExistingUser: false }
    let trackedProducts: TrackedProduct[] = [];
    if (isExistingUser) {
        const me = await getMyInfo(fetch);
        if (me.isOk()) {
            user = {
                ...user,
                ...me.value,
                isExistingUser: true,
            }
        }

        const userTrackedProducts = await getMyTrackedProducts(fetch);
        if (userTrackedProducts.isOk()) {
            trackedProducts = userTrackedProducts.value;
        }
    }
    console.log("Is existing user:", user);
    
    const categories = await fetchCategories(fetch).unwrapOr([]);
    const manufacturers = await getManufacturers(fetch).unwrapOr([]);
    const websites = await fetchWebsites(fetch).unwrapOr([]);
    const deals = await fetchDeals({}, fetch).unwrapOr([]);
    const categoryMap = arrayToPerIdMap(categories);
    const manufacturerMap = arrayToPerIdMap(manufacturers);
    const websiteMap = arrayToPerIdMap(websites);
    return {
        user,
        trackedProducts,
        categories,
        manufacturers,
        websites,
        categoryMap,
        manufacturerMap,
        websiteMap,
        deals,
    };
}