import type { LayoutServerLoad } from "./$types.js";
import { fetchDeals } from "$lib/api/deals.js";
import { getManufacturers } from "$lib/api/manufacturers.js";
import { fetchCategories } from "$lib/api/products.js";
import { fetchWebsites } from "$lib/api/websites.js";
import { arrayToPerIdMap } from "$lib/util.js";
import { getMyInfo } from "$lib/api/me.js";

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
    if (isExistingUser) {
        const me = await getMyInfo(fetch);
        if (me.isOk()) {
            user = {
                ...user,
                ...me.value,
                isExistingUser: true,
            }
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
        categories,
        manufacturers,
        websites,
        categoryMap,
        manufacturerMap,
        websiteMap,
        deals,
    };
}