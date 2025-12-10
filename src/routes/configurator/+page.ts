import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    return {
        breadcrumb: [
            { path: 'Configurator', url: '/configurator' }
        ]
    };
};
