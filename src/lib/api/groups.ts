import { api } from "$lib/core/api.js";

export type GroupProduct = {
    internal_product_id: number;
    external_product_id: number;
    external_product_name: string;
    run_count: number;
    avg_confidence: number;
    distinct_groups: number;
    ip_count: number;
    auto_merge_possible: boolean;
    verified_internal_product_id?: number;
};

export type Group = {
    id: number;
    internal_product_id: number | null;
    group_name: string;
    created_at: string;
    updated_at: string;
    category_id: number;
    manufacturer_id: number;
    auto_merge_eligible: boolean;
    products?: GroupProduct[];
};

export function fetchGroups(params: {
    categoryId?: number,
    manufacturerId?: number,
    onlyAutoMergeEligible?: boolean,
    minRunsCount?: number,
}) {
    const query = new URLSearchParams();
    if (params.categoryId) {
        query.append('category_id', params.categoryId.toString());
    }
    if (params.manufacturerId) {
        query.append('manufacturer_id', params.manufacturerId.toString());
    }
    if (params.onlyAutoMergeEligible) {
        query.append('auto_merge_eligible_only', 'true');
    }
    if (params.minRunsCount && params.minRunsCount > 0) {
        query.append('min_runs_count', params.minRunsCount.toString());
    }
    return api.get<Group[]>(`/api/groups?${query.toString()}`);
}

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

export interface ExternalProductGroup {
    group_id: number;
    group_name: string;
    runs: {
        created_at: string,
        updated_at: string,
        confidence_score: number,
        run_id: number
    }[]
}
export function fetchExternalProductGroups(externalProductId: number) {
    return api.get<ExternalProductGroup[]>(`/api/externals/${externalProductId}/groups`);
}

export function deleteExternalProductFromGroup(externalProductId: number, groupId: number) {
    return api.delete(`/api/externals/${externalProductId}/groups/${groupId}`)

}

export function updateGroup(groupId: number, params: {
    name?: string,
}) {
    const updatedValues: {
        groupName?: string,
    } = {};
    if (params.name !== undefined) {
        updatedValues.groupName = params.name;
    }
    return api.put(`/api/groups/${groupId}`, updatedValues);
}