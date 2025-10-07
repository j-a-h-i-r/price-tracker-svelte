import { api } from "$lib/core/api.js";
import type { Manufacturer } from "$lib/types/Manufacturer.js";

export function getManufacturers(superFetch?: typeof fetch) {
    return api.get<Manufacturer[]>('/api/manufacturers', { superFetch })
}

export function mergeIntoManufacturer(manufacturerId: number, mergeIds: number[]) {
    return api.put(`/api/manufacturers/${manufacturerId}/merge`, {
        manufacturer_ids: mergeIds,
    });
}

export function fetchManufacturerStats(manufacturerId: number) {
    return api.get<{product_count: number}>(`/api/manufacturers/${manufacturerId}/stats`)
}