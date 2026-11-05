const STORAGE_KEY = 'lpr.preferences.v1';

const DEFAULTS = {
	umbralPermanenciaMin: 120,
	refreshIntervalSec: 30,
	pageSize: 10,
	compactTables: false
};

function load() {
	try {
		if (typeof localStorage === 'undefined') return { ...DEFAULTS };
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		const parsed = JSON.parse(raw);
		return {
			...DEFAULTS,
			umbralPermanenciaMin: Number(parsed.umbralPermanenciaMin) || DEFAULTS.umbralPermanenciaMin,
			refreshIntervalSec: Number(parsed.refreshIntervalSec) || DEFAULTS.refreshIntervalSec,
			pageSize: Number(parsed.pageSize) || DEFAULTS.pageSize,
			compactTables: Boolean(parsed.compactTables)
		};
	} catch {
		return { ...DEFAULTS };
	}
}

export const preferences = $state(load());

export function savePreferences(patch = {}) {
	Object.assign(preferences, patch);
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					umbralPermanenciaMin: preferences.umbralPermanenciaMin,
					refreshIntervalSec: preferences.refreshIntervalSec,
					pageSize: preferences.pageSize,
					compactTables: preferences.compactTables
				})
			);
		}
	} catch {
		// Preferencias no persistentes si el navegador bloquea el almacenamiento.
	}
}

export function resetPreferences() {
	savePreferences({ ...DEFAULTS });
}

export { DEFAULTS };
