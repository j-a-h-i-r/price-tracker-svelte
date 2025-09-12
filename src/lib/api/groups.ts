import { api } from "$lib/core/api.js";

export function mergeProductsIntoGroup(
    groupId: number,
    internalProductIdsToMerge: number[],) {
    return api.put(`/api/groups/${groupId}/merge`, {
        internalProductIdsToMerge: internalProductIdsToMerge,
    })
}