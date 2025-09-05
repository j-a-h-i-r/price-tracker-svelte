import { api } from "$lib/core/api.js";
import type { Manufacturer } from "$lib/types/Manufacturer.js";

export function getManufacturers() {
    return api.get<Manufacturer[]>('/api/manufacturers')
}
