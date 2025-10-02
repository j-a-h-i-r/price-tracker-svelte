import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
	],
	server: {
        // proxy: {
        //     '/api': 'http://localhost:3333',
        // },
		host: true,
    },
});
