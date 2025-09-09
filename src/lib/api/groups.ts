import { api } from "$lib/core/api.js";

export function mergeProductsIntoGroup(
    groupId: number,
    groupName: string,
    primaryInternalProductId: number,
    internalProductIdsToMerge: number[],
    externalProductIdsToMerge: number[]) {
    return api.put(`/api/groups/${groupId}/merge`, {
        productName: groupName,
        primaryInternalProductId: primaryInternalProductId,
        internalProductIds: internalProductIdsToMerge,
        externalProductIds: externalProductIdsToMerge,
    })
}