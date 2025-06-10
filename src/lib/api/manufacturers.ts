import type { Manufacturer } from "$lib/types/Manufacturer.js";

export async function getManufacturers(): Promise<Manufacturer[]> {
    return fetch('/api/manufacturers')
        .then((res) => res.json());
}
