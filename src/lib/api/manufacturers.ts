import { api } from "$lib/core/api.js";
import type { Manufacturer } from "$lib/types/Manufacturer.js";

export function getManufacturers(superFetch?: typeof fetch) {
    return api.get<Manufacturer[]>('/api/manufacturers', { superFetch })
}
