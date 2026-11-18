<script context="module">
 let confirmacionEnCurso = false;
 function opcionesAviso() {
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
   target: document.querySelector('dialog[open]') || document.body,
   heightAuto: false, buttonsStyling: false, keydownListenerCapture: true,
   stopKeydownPropagation: true, returnFocus: true,
   customClass: { popup: 'aviso-aplicacion', confirmButton: 'btn btn-accent', cancelButton: 'btn btn-quiet', actions: 'aviso-aplicacion__acciones' },
   ...(reducirMovimiento ? { showClass: { popup: '' }, hideClass: { popup: '' } } : {})
  };
 }
 export async function confirmarAccion(texto, accion = 'Eliminar') {
  if (confirmacionEnCurso) return false;
  confirmacionEnCurso = true;
  const ruta = window.location.pathname;
  try {
   const { default: Swal } = await import('sweetalert2');
   if (window.location.pathname !== ruta) return false;
   const resultado = await Swal.fire({
    ...opcionesAviso(), titleText: accion === 'Retirar acceso' ? 'Retirar acceso' : accion + ' registro', text: texto,
    icon: 'warning', showCancelButton: true, confirmButtonText: accion, cancelButtonText: 'Cancelar',
    focusCancel: true, reverseButtons: true,
    customClass: { ...opcionesAviso().customClass, confirmButton: accion === 'Activar' ? 'btn btn-accent' : 'btn btn-quiet-danger' }
   });
   return resultado.isConfirmed && window.location.pathname === ruta;
  } catch { return false; }
  finally { confirmacionEnCurso = false; }
 }
 export async function notificarResultado(texto, tipo = 'success') {
  const ruta = window.location.pathname;
  try {
   const { default: Swal } = await import('sweetalert2');
   if (window.location.pathname !== ruta || confirmacionEnCurso) return;
   if (tipo === 'success') {
    await Swal.fire({ ...opcionesAviso(), toast: true, position: 'top-end', icon: 'success', titleText: texto,
     showConfirmButton: false, showCloseButton: true, closeButtonAriaLabel: 'Cerrar aviso', timer: 4000, timerProgressBar: true,
     didOpen: popup => { popup.addEventListener('mouseenter', Swal.stopTimer); popup.addEventListener('mouseleave', Swal.resumeTimer); }
    });
   } else {
    const modal = document.querySelector('dialog[open]');
    await Swal.fire({ ...opcionesAviso(), icon: 'error', titleText: 'No se pudo completar la operación', text: texto,
     confirmButtonText: 'Entendido', returnFocus: !modal,
     didClose: () => { if (modal?.isConnected && modal.open) modal.querySelector('[aria-invalid="true"], input:not(:disabled), select:not(:disabled)')?.focus(); }
    });
   }
  } catch {
   const aviso = document.createElement('div');
   aviso.className = 'alert-app mb-3'; aviso.setAttribute('role', 'alert'); aviso.textContent = texto;
   (document.querySelector('dialog[open] form') || document.querySelector('main'))?.prepend(aviso);
  }
 }

 // Ciclo de vida compartido para los formularios modales, sin mover su lógica de negocio.
 export function modalFormulario(nodo, cerrar) {
  const disparador = document.activeElement;
  let cancelado = false;
  const cancelar = evento => { evento.preventDefault(); if (!nodo.querySelector('.swal2-container')) cerrar(); };
  const alCerrar = () => { if (!cancelado) cerrar(); };
  nodo.addEventListener('cancel', cancelar);
  nodo.addEventListener('close', alCerrar);
  const frame = requestAnimationFrame(() => {
   if (!nodo.isConnected || cancelado) return;
   nodo.showModal();
   nodo.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus();
  });
  return {
   update(nuevaAccion) { cerrar = nuevaAccion; },
   destroy() {
    cancelado = true; cancelAnimationFrame(frame);
    nodo.removeEventListener('cancel', cancelar); nodo.removeEventListener('close', alCerrar);
    if (nodo.open) nodo.close();
    if (disparador?.isConnected && typeof disparador.focus === 'function') disparador.focus({ preventScroll: true });
   }
  };
 }
</script>

<script>
	export let eyebrow = '';
	export let title = '';
	export let description = '';
</script>

<header class="page-header">
	<div class="page-header__copy">
		{#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}
	</div>
	{#if $$slots.actions}
		<div class="page-header__actions">
			<slot name="actions" />
		</div>
	{/if}
</header>
