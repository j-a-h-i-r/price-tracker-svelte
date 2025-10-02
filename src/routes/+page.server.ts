// import type { PageServerLoad } from './$types';
// import { API_URL } from "$env/static/private";
// import { api } from '$lib/core/api.js';
// import type { Stats } from '$lib/api/stats.js';

// export const load: PageServerLoad = async ({ params }) => {
//     const stats = {
//         totalProducts: 0,
//         totalWebsites: 0,
//         totalCategories: 0
//     };
// 	const resp = await api.get<Stats>(`${API_URL}/api/stats`);
//     if (resp.isOk()) {
//         stats.totalProducts = resp.value.products ?? 0;
//         stats.totalWebsites = resp.value.websites ?? 0;
//         stats.totalCategories = resp.value.categories ?? 0;
//     }

// 	return stats;
// };