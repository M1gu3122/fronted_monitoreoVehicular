# Repository Guidelines

## Project Structure

This SvelteKit frontend uses Svelte 5, JavaScript ES modules, and Vite. Feature pages live in `src/routes/` under Spanish route names such as `vehiculos` and `eventos`. Use SvelteKit’s `+page.svelte` and `+layout.svelte` conventions. The visit detail route, `src/routes/visitas/[id]/+page.svelte`, shows how dynamic segments are organized.

Shared UI lives in `src/lib/components/` and backend requests live in `src/lib/services/`. Put imported assets in `src/lib/assets/` and files served directly in `static/`.

## Development Commands

- `npm ci` installs dependencies from the committed lockfile.
- `npm run dev` starts Vite. Use `npm run dev -- --open` to open the app in a browser.
- `npm run build` compiles the production bundle.
- `npm run preview` serves the production build locally after a successful build.

Vite forwards development requests under `/api` to the backend at `http://127.0.0.1:8000` and strips the prefix. Run the backend locally when exercising routes that fetch data.

## Coding Style

Follow the indentation of the file you edit. Route and component files generally use tabs, while `vite.config.js` uses two spaces. Follow the surrounding Svelte syntax and JavaScript style. Use PascalCase for shared components such as `PageHeader.svelte`, `api_*.js` for service modules, and Spanish names for domain functions such as `obtenerVehiculos`. Use the existing `#lib/` import alias and reuse `solicitarAPI` for authenticated requests. The package defines no lint or format script. Row and card mutation actions use 44px icon-only buttons with the shared Icon.svelte paths: edit for editar, trash for eliminar, power for desactivar, and check for activar. Use iconoAccionHTML for DataTables-generated HTML. Always include title, a contextual aria-label, and the existing data-edicion marker; preserve handlers and confirmations. Registration and editing forms use native dialog modals with modalFormulario from PageHeader.svelte; retain fields, validation, Escape/Cancel/close behavior, and focus restoration. Keep exactly one registration opener in Vehículos, Zonas, and Cámaras. Use confirmarAccion and notificarResultado from PageHeader.svelte for SweetAlert2 confirmations and mutation outcomes. Await confirmation before any request, preserve cancellation rollback, use Spanish action labels and plain text, and retain inline field validation. Native dialog forms must remain open when dismissing an error alert. Open edit dialogs before fetching detail data, show a loading state inside, and keep fields unavailable until loading succeeds. Invalidate pending detail responses when closing or starting another form so they cannot reopen or overwrite it.

## Verification

The project has no configured test runner or coverage threshold. Run `npm run build` and smoke-test affected routes with the backend running. For data-driven pages, exercise successful requests, empty results, and error states where applicable.

## Commits and Pull Requests

Use a short, action-oriented commit summary that names the affected feature. In pull requests, describe the behavior change, record verification steps, link related issues when available, and include screenshots for visible UI changes.

Keep one manual Actualizar button only in Dashboard and Reportes. Do not add global full-page reload buttons or manual refresh buttons to registry modules or Monitoreo. Preserve automatic refresh, post-mutation reloads and contextual Reintentar controls for failures.
