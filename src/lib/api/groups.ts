import { api } from "$lib/core/api.js";

export function mergeProductsIntoGroup(
    groupId: number,
    externalProductIdsToMerge: number[],) {
    return api.put(`/api/groups/${groupId}/merge`, {
        externalProductIdsToMerge: externalProductIdsToMerge,
    })
}

export function deleteGroup(groupId: number) {
    return api.delete(`/api/groups/${groupId}`);
}