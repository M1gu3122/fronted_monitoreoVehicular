import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	envPrefix: ['VITE_', 'PUBLIC_'],
	resolve: {
		alias: {
			'#lib': resolve(__dirname, 'src/lib')
		}
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// La SPA resuelve las rutas dinamicas en el cliente mediante el
			// fallback 'index.html'. 'ignore' evita que el prerender falle
			// por rutas que dependen de datos en tiempo de ejecucion.
			prerender: {
				handleUnseenRoutes: 'ignore'
			},

			// Adaptador de despliegue: salida estatica (SPA).
			// `fallback: 'index.html'` hace que cualquier ruta (/visitas/12, etc.)
			// se resuelva con el shell de la SPA en el cliente.
			// `strict: false` evita que falle el build por rutas dinamicas.
			// Ver https://svelte.dev/docs/kit/adapters
			adapter: adapter({
				fallback: 'index.html',
				strict: false
			})
		})
	]
});