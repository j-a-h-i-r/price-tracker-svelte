import { api } from "$lib/core/api.js";
import type { FringeGroup } from "$lib/types/FringeGroup.js";

export function getFringeGroups(percentThreshold?: number, sort?: 'asc' | 'desc', excludeMerged?: boolean) {
    const params = new URLSearchParams();
    if (percentThreshold) {
        params.append('percent_threshold', percentThreshold.toString());
    }
    if (sort) {
        params.append('sort', sort);
    }
    if (excludeMerged) {
        params.append('exclude_merged', 'true');
    }
    const queryString = params.toString();
    return api.get<FringeGroup[]>(`/api/fringegroups${queryString ? `?${queryString}` : ''}`);
}

export function purgeGroup(externalId: number, groupId: number) {
    return api.delete(`/api/externals/${externalId}/groups/${groupId}`);
}
