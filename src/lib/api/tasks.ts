import { api } from "$lib/core/api.js";

export function executeUpdateMetadataTask() {
    return api.post('/api/admin/tasks/updatemetadata');
}