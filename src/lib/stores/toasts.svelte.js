let sequence = 0;

export const toasts = $state([]);

/**
 * @param {{type?: 'success'|'error'|'info', title?: string, message?: string, timeout?: number}} toast
 */
export function pushToast({ type = 'success', title = 'Operación completada', message = '', timeout = 5000 }) {
	const id = ++sequence;
	toasts.push({ id, type, title, message });
	if (timeout > 0) {
		setTimeout(() => dismissToast(id), timeout);
	}
	return id;
}

export function dismissToast(id) {
	const index = toasts.findIndex((toast) => toast.id === id);
	if (index >= 0) toasts.splice(index, 1);
}

export function toastError(title, message) {
	return pushToast({ type: 'error', title, message, timeout: 8000 });
}
