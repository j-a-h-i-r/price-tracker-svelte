import { api } from '$lib/core/api.js';
import type { GeneratedSpec } from '$lib/types/GeneratedSpec.js';

export function fetchGeneratedSpecs() {
    return api.get<GeneratedSpec[]>('/api/generatedspecs');
}
