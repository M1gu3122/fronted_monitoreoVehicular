<script>
 let cargandoEdicionRol = false;
 let falloEdicionRol = '';
 let revisionEdicionRol = 0;

 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

 function navegarPestanas(evento) {
  const opciones = ['usuarios', 'roles', 'permisos'];
  let indice = opciones.indexOf(tab);
  if (evento.key === 'ArrowRight') indice = (indice + 1) % opciones.length;
  else if (evento.key === 'ArrowLeft') indice = (indice + opciones.length - 1) % opciones.length;
  else if (evento.key === 'Home') indice = 0;
  else if (evento.key === 'End') indice = opciones.length - 1;
  else return;
  evento.preventDefault(); tab = opciones[indice]; document.getElementById('tab-' + tab)?.focus();
 }

	import { onMount, tick } from 'svelte';
	import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
	import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon, { iconoAccionHTML } from '#lib/components/Icon.svelte';
	import {
		obtenerUsuarios,
		obtenerUsuarioPorId,
		crearUsuario,
		actualizarUsuario
	} from '#lib/services/api_usuarios.js';
	import { obtenerRoles, obtenerRolPorId, crearRol, actualizarRol, eliminarRol } from '#lib/services/api_roles.js';
 import { obtenerModulos } from '#lib/services/api_modulo.js';
 import { obtenerPermisos, obtenerPermisoPorId, crearPermiso, actualizarPermiso, eliminarPermiso } from '#lib/services/api_modulo_x_rol.js';

	let tab = 'usuarios';

	let usuarios = [];
	let roles = [];
	let cargando = true;
	let cargandoRoles = true;
	let errorCarga = '';
	let errorRoles = '';
	let mensajeExito = '';
	let mensajeError = '';

	let busqueda = '';
	let filtroEstado = 'todos';
	let filtroRol = 'todos';

	let mostrarFormulario = false;
	let idEditando = null;
	let guardando = false;

	let nombre = '';
	let correo = '';
	let contrasena = '';
	let idRol = '';
	let estado = true;
	let contrasenaHashActual = '';


 let modulos = [];
 let permisos = [];
 let cargandoPermisos = true;
 let errorPermisos = '';
 let mensajeExitoRol = '';
 let mensajeErrorRol = '';
 let mensajeExitoPermisos = '';
 let mensajeErrorPermisos = '';
 let mostrarFormularioRol = false;
 let idRolEditando = null;
 let nombreNuevoRol = '';
 let descripcionRol = '';
 let estadoRol = true;
 let soloLecturaRol = false;
 let guardandoRol = false;
 let preparandoRol = false;
 let guardandoPermisos = false;
 let busquedaRoles = '';
 let busquedaPermisos = '';
 let tablaUsuarios;
 let tablaRoles;
 let tablaPermisos;
 let paginaUsuarios = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let paginaRoles = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let paginaPermisos = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let desmontado = false;
 $: firmaModulos = modulos.map((modulo) => modulo.id_modulo + ':' + modulo.nombre_modulo + ':' + modulo.estado).join('|');
 $: if (tablaUsuarios) sincronizarTabla(tablaUsuarios, usuarios, roles);
 $: if (tablaRoles) sincronizarTabla(tablaRoles, roles);
 $: if (tablaPermisos) sincronizarTabla(tablaPermisos, roles, permisos, guardandoPermisos);

 function sincronizarTabla(tabla, registros) {
  tabla.clear(); tabla.rows.add(registros); tabla.draw(false);
 }

 function conectarTabla(nodo, tipo) {
  let destruida = false;
  let instancia;
  const clic = (evento) => {
   const boton = evento.target.closest('button[data-accion]');
   if (!boton || guardando || guardandoRol || preparandoRol) return;
   const id = Number(boton.dataset.id);
   if (tipo === 'roles') {
    if (boton.dataset.accion === 'editar') prepararEdicionRol(id);
    if (boton.dataset.accion === 'eliminar') borrarRol(id);
   } else if (tipo === 'usuarios') {
    if (boton.dataset.accion === 'editar') prepararEdicion(id);
    if (boton.dataset.accion === 'desactivar') desactivarUsuario(usuarios.find((usuario) => usuario.id_usuario === id));
   }
  };
  const cambio = (evento) => {
   const casilla = evento.target.closest('input[data-rol][data-modulo]');
   if (casilla) cambiarPermiso(Number(casilla.dataset.rol), Number(casilla.dataset.modulo), casilla.checked);
  };
  async function iniciar() {
   try {
    const { default: DataTable } = await import('datatables.net-bs5');
    if (destruida || desmontado) return;
    const texto = (valor) => DataTable.render.text().display(String(valor ?? ''));
    const atributo = (valor) => texto(valor).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const estadoColumna = { title: 'Estado', data: 'estado', render: (activo, tipoDato) => tipoDato === 'display' ? '<span class="pill pill--' + (activo ? 'ok' : 'neutral') + '">' + (activo ? 'Activo' : 'Inactivo') + '</span>' : activo ? 'activos' : 'inactivos' };
    let columnas;
    if (tipo === 'usuarios') columnas = [
     { title: 'Número', data: 'id_usuario', render: (id) => '#' + Number(id) },
     { title: 'Usuario', data: null, render: (_, tipoDato, usuario) => tipoDato === 'display' ? '<div class="cell-strong">' + texto(usuario.nombre) + '</div><div class="cell-sub">' + texto(usuario.correo) + '</div>' : usuario.nombre + ' ' + usuario.correo },
     { title: 'Rol', data: 'id_rol', render: (id, tipo) => tipo === 'display' ? '<span class="pill pill--info">' + texto(nombreRol(id)) + '</span>' : texto(nombreRol(id)) },
     estadoColumna,
     { title: 'Actualizado', data: 'actualizado', defaultContent: '', className: 'nowrap', render: (valor, tipoDato) => tipoDato === 'display' ? texto(formatearFecha(valor)) : valor || '' },
     { title: 'Acciones', data: 'id_usuario', orderable: false, searchable: false, className: 'nowrap', render: (id, tipoDato, usuario) => Number.isInteger(id) ? '<div class="d-flex gap-1"><button type="button" class="btn btn-quiet btn-icon accion-registro" data-edicion data-accion="editar" data-id="' + id + '" title="Editar" aria-label="Editar registro ' + id + '">' + iconoAccionHTML('editar') + '</button>' + (usuario.estado ? '<button type="button" class="btn btn-quiet-danger btn-icon accion-registro" data-edicion data-accion="desactivar" data-id="' + id + '" title="Desactivar" aria-label="Desactivar registro ' + id + '">' + iconoAccionHTML('desactivar') + '</button>' : '') + '</div>' : '' },
     { name: 'rol_id', data: 'id_rol', visible: false }
    ];
    else if (tipo === 'roles') columnas = [
     { title: 'Número', data: 'id_rol', render: (id) => '#' + Number(id) },
     { title: 'Rol', data: 'nombre', render: (nombre, tipo, rol) => tipo === 'display' ? '<span class="pill pill--info">' + texto(nombre) + '</span>' + (rol.solo_lectura ? '<span class="cell-sub">Solo consulta</span>' : '') : nombre },
     { title: 'Descripción', data: 'descripcion', defaultContent: '—', render: DataTable.render.text() },
     estadoColumna,
     { title: 'Acciones', data: 'id_rol', orderable: false, searchable: false, className: 'nowrap', render: (id) => Number.isInteger(id) ? '<div class="d-flex gap-1"><button type="button" class="btn btn-quiet btn-icon accion-registro" data-edicion data-accion="editar" data-id="' + id + '" title="Editar" aria-label="Editar registro ' + id + '">' + iconoAccionHTML('editar') + '</button><button type="button" class="btn btn-quiet-danger btn-icon accion-registro" data-edicion data-accion="eliminar" data-id="' + id + '" title="Eliminar" aria-label="Eliminar registro ' + id + '">' + iconoAccionHTML('eliminar') + '</button></div>' : '' }
    ];
    else columnas = [
     { title: 'Rol', data: 'nombre', render: (nombreRolActual, tipoDato, rol) => tipoDato === 'display' ? '<span class="cell-strong">' + texto(nombreRolActual) + '</span><span class="cell-sub">' + (rol.estado ? 'Activo' : 'Inactivo') + '</span>' : nombreRolActual },
     ...modulos.map((modulo) => ({ title: texto(modulo.nombre_modulo) + (modulo.estado ? '' : ' (inactivo)'), data: null, orderable: false, searchable: false, className: 'permiso-celda', render: (_, tipoDato, rol) => {
      const permiso = permisos.find((registro) => registro.id_rol === rol.id_rol && registro.id_modulo === modulo.id_modulo);
      if (tipoDato !== 'display') return permiso?.estado ? 'Habilitado' : 'Sin acceso';
      if (!Number.isInteger(rol.id_rol) || !Number.isInteger(modulo.id_modulo)) return '';
      return '<label class="permiso-control"><input class="form-check-input" type="checkbox" data-rol="' + rol.id_rol + '" data-modulo="' + modulo.id_modulo + '" aria-label="' + atributo('Acceso a ' + modulo.nombre_modulo + ' para ' + rol.nombre) + '"' + (permiso?.estado ? ' checked' : '') + (guardandoPermisos ? ' disabled' : '') + ' /></label>';
     } }))
    ];
    instancia = new DataTable(nodo, { data: tipo === 'usuarios' ? usuarios : roles, columns: columnas, pageLength: 10, autoWidth: false, order: [[0, 'asc']], layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null }, language: { aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' }, emptyTable: 'No hay registros disponibles', zeroRecords: 'No hay coincidencias con la búsqueda' } });
    function registrarPagina() {
     if (tipo === 'usuarios') paginaUsuarios = instancia.page.info();
     else if (tipo === 'roles') paginaRoles = instancia.page.info();
     else paginaPermisos = instancia.page.info();
    }
    instancia.on('draw', registrarPagina);
    nodo.addEventListener('click', clic);
    if (tipo === 'permisos') nodo.addEventListener('change', cambio);
    if (tipo === 'usuarios') tablaUsuarios = instancia;
    else if (tipo === 'roles') tablaRoles = instancia;
    else tablaPermisos = instancia;
    registrarPagina();
    aplicarBusqueda();
   } catch (error) {
    if (tipo === 'usuarios') errorCarga = 'No se pudo preparar la tabla: ' + error.message;
    else if (tipo === 'roles') errorRoles = 'No se pudo preparar la tabla: ' + error.message;
    else errorPermisos = 'No se pudo preparar la matriz: ' + error.message;
   }
  }
  iniciar();
  return { destroy() {
   destruida = true; nodo.removeEventListener('click', clic); nodo.removeEventListener('change', cambio); instancia?.destroy();
   if (tipo === 'usuarios') tablaUsuarios = null;
   else if (tipo === 'roles') tablaRoles = null;
   else tablaPermisos = null;
  } };
 }

 async function aplicarBusqueda() {
  await tick();
  if (desmontado) return;
  if (tablaUsuarios) {
   tablaUsuarios.search(busqueda);
   tablaUsuarios.column(3).search(filtroEstado === 'todos' ? '' : filtroEstado, { exact: true });
   tablaUsuarios.column('rol_id:name').search(filtroRol === 'todos' ? '' : filtroRol, { exact: true });
   tablaUsuarios.draw();
  }
  tablaRoles?.search(busquedaRoles).draw();
  tablaPermisos?.search(busquedaPermisos).draw();
 }
 function cambiarPaginaTabla(tabla, direccion) { tabla?.page(direccion).draw('page'); }

 async function cargarPermisos() {
  cargandoPermisos = true; errorPermisos = '';
  try {
   const [datosModulos, datosPermisos] = await Promise.all([obtenerModulos(), obtenerPermisos()]);
   if (!Array.isArray(datosModulos) || !Array.isArray(datosPermisos)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   if (desmontado) return;
   modulos = datosModulos; permisos = datosPermisos;
  } catch (error) { errorPermisos = 'No se pudieron cargar los permisos: ' + error.message; }
  finally { cargandoPermisos = false; }
 }

 function limpiarFormularioRol() {
  revisionEdicionRol += 1; cargandoEdicionRol = false; falloEdicionRol = ''; preparandoRol = false; idRolEditando = null; nombreNuevoRol = ''; descripcionRol = ''; estadoRol = true; soloLecturaRol = false; mostrarFormularioRol = false; }
 function abrirCreacionRol() { limpiarFormularioRol(); mensajeErrorRol = ''; mensajeExitoRol = ''; mostrarFormularioRol = true; }
 async function prepararEdicionRol(id) {
  limpiarFormularioRol();
  const revision = ++revisionEdicionRol;
  cargandoEdicionRol = true; falloEdicionRol = ''; idRolEditando = id; mostrarFormularioRol = true;

  preparandoRol = true; mensajeErrorRol = ''; mensajeExitoRol = '';
  try {
   const rol = await obtenerRolPorId(id);
   if (revision !== revisionEdicionRol || !mostrarFormularioRol) return;
   if (!rol || rol.id_rol === undefined) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   idRolEditando = rol.id_rol; nombreNuevoRol = rol.nombre; descripcionRol = rol.descripcion ?? ''; estadoRol = rol.estado; soloLecturaRol = rol.solo_lectura === true; 
  
  } catch {
   if (revision === revisionEdicionRol && mostrarFormularioRol) falloEdicionRol = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicionRol) { cargandoEdicionRol = false; preparandoRol = false; }
  }
 }
 async function guardarRol(evento) {
  evento.preventDefault(); if (guardandoRol) return;
  guardandoRol = true; mensajeErrorRol = ''; mensajeExitoRol = '';
  try {
   const datos = { nombre: nombreNuevoRol.trim().toLowerCase(), descripcion: descripcionRol.trim(), estado: estadoRol, solo_lectura: soloLecturaRol };
   if (idRolEditando === null) await crearRol(datos);
   else await actualizarRol(idRolEditando, datos);
   mensajeExitoRol = idRolEditando === null ? 'Rol creado correctamente.' : 'Rol actualizado correctamente.';
   limpiarFormularioRol(); await cargarRoles();
  } catch (error) { mensajeErrorRol = 'No se pudo guardar el rol: ' + error.message; }
  finally { guardandoRol = false; }
 }
 async function borrarRol(id) {
  if (!await confirmarAccion('¿Deseas eliminar el rol ' + id + '?', 'Eliminar')) return;
  guardandoRol = true; mensajeErrorRol = ''; mensajeExitoRol = '';
  try {
   await eliminarRol(id);
   if (idRolEditando === id) limpiarFormularioRol();
   mensajeExitoRol = 'Rol eliminado correctamente.';
   await Promise.all([cargarRoles(), cargarPermisos(), cargarUsuarios()]);
  } catch (error) { mensajeErrorRol = 'No se pudo eliminar el rol: ' + error.message; }
  finally { guardandoRol = false; }
 }
 async function cambiarPermiso(idRolPermiso, idModulo, habilitado) {
  if (guardandoPermisos) { sincronizarTabla(tablaPermisos, roles); return; }
  const existente = permisos.find((permiso) => permiso.id_rol === idRolPermiso && permiso.id_modulo === idModulo);
  guardandoPermisos = true;
  if (!habilitado && !await confirmarAccion('¿Deseas retirar el acceso a este módulo para el rol seleccionado?', 'Retirar acceso')) { guardandoPermisos = false; sincronizarTabla(tablaPermisos, roles); return; }
  guardandoPermisos = true; mensajeErrorPermisos = ''; mensajeExitoPermisos = '';
  try {
   const datos = { id_rol: idRolPermiso, id_modulo: idModulo, estado: habilitado };
   if (existente) {
    await obtenerPermisoPorId(idRolPermiso, idModulo);
    if (habilitado) await actualizarPermiso(idRolPermiso, idModulo, datos);
    else await eliminarPermiso(idRolPermiso, idModulo);
   } else if (habilitado) await crearPermiso(datos);
   mensajeExitoPermisos = habilitado ? 'Acceso habilitado correctamente.' : 'Acceso retirado correctamente.';
   await cargarPermisos();
  } catch (error) { mensajeErrorPermisos = 'No se pudo guardar el permiso: ' + error.message; }
  finally { guardandoPermisos = false; }
 }

	$: totalUsuarios = usuarios.length;
	$: usuariosActivos = usuarios.filter((usuario) => usuario.estado).length;
	$: usuariosInactivos = totalUsuarios - usuariosActivos;

	function nombreRol(idRolUsuario) {
		const rol = roles.find((item) => item.id_rol === idRolUsuario);
		return rol ? rol.nombre : '—';
	}

	function formatearFecha(valor) {
		if (!valor) {
			return '—';
		}

		const fecha = new Date(valor);

		if (Number.isNaN(fecha.getTime())) {
			return '—';
		}

		return fecha.toLocaleString('es-CO', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function cargarUsuarios() {
		cargando = true;
		errorCarga = '';

		try {
			const datos = await obtenerUsuarios();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			usuarios = datos;
		} catch (error) {
			errorCarga = 'No se pudo cargar la información: ' + error.message;
		} finally {
			cargando = false;
		}
	}

	async function cargarRoles() {
		cargandoRoles = true;
		errorRoles = '';

		try {
			const datos = await obtenerRoles();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			roles = datos;
		} catch (error) {
			errorRoles = 'No se pudieron cargar los roles: ' + error.message;
		} finally {
			cargandoRoles = false;
		}
	}

	onMount(() => {
		cargarUsuarios();
		cargarRoles();
		cargarPermisos();
		return () => { desmontado = true; };
	});

	function actualizarTodo() {
		mensajeExito = '';
		mensajeError = '';
		cargarUsuarios();
		cargarRoles();
		cargarPermisos();
	}

	function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = '';
		idEditando = null;
		nombre = '';
		correo = '';
		contrasena = '';
		idRol = '';
		estado = true;
		contrasenaHashActual = '';
	}

	function abrirCreacion() {
		mensajeExito = '';
		mensajeError = '';
		limpiarFormulario();
		mostrarFormulario = true;
	}

	function cancelarFormulario() {
		limpiarFormulario();
		mostrarFormulario = false;
	}

	async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

		mensajeExito = '';
		mensajeError = '';

		try {
			const usuario = await obtenerUsuarioPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;

			idEditando = usuario.id_usuario;
			nombre = usuario.nombre;
			correo = usuario.correo;
			contrasena = '';
			idRol = usuario.id_rol === null || usuario.id_rol === undefined ? '' : String(usuario.id_rol);
			estado = usuario.estado;
			contrasenaHashActual = usuario.contrasena_hash || '';
			
		
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false;  }
  }
 }

	async function guardarUsuario(evento) {
		evento.preventDefault();

		mensajeExito = '';
		mensajeError = '';
		guardando = true;

		const esEdicion = idEditando !== null;
		const datos = {
			nombre: nombre.trim(),
			correo: correo.trim(),
			contrasena_hash: contrasena || '',
			estado,
			id_rol: Number(idRol)
		};

		try {
			if (esEdicion) {
				const respuesta = await actualizarUsuario(idEditando, datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Usuario actualizado correctamente.';
			} else {
				const respuesta = await crearUsuario(datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Usuario creado correctamente.';
			}

			limpiarFormulario();
			mostrarFormulario = false;
			await cargarUsuarios();
		} catch (error) {
			mensajeError =
				'No se pudo ' + (esEdicion ? 'actualizar' : 'crear') + ' el usuario: ' + error.message;
		} finally {
			guardando = false;
		}
	}

	async function desactivarUsuario(usuario) {
		const seguro = await confirmarAccion('¿Deseas desactivar el usuario "' + usuario.nombre + '"?', 'Desactivar');

		if (!seguro) {
			return;
		}

		mensajeExito = '';
		mensajeError = '';

		try {
			const actual = await obtenerUsuarioPorId(usuario.id_usuario);
			await actualizarUsuario(actual.id_usuario, {
				nombre: actual.nombre,
				correo: actual.correo,
				contrasena_hash: '',
				estado: false,
				id_rol: actual.id_rol
			});

			mensajeExito = 'Usuario desactivado correctamente.';

			if (idEditando === usuario.id_usuario) {
				estado = false;
			}

			await cargarUsuarios();
		} catch (error) {
			mensajeError = 'No se pudo desactivar el usuario: ' + error.message;
		}
	}

	function limpiarFiltros() {
		busqueda = '';
		filtroEstado = 'todos';
		filtroRol = 'todos';
		aplicarBusqueda();
	}
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
 $: if (mensajeExitoRol) notificarResultado(mensajeExitoRol, 'success');
 $: if (mensajeErrorRol) notificarResultado(mensajeErrorRol, 'error');
 $: if (mensajeExitoPermisos) notificarResultado(mensajeExitoPermisos, 'success');
 $: if (mensajeErrorPermisos) notificarResultado(mensajeErrorPermisos, 'error');
</script>

<div class="administracion-tablas">
<PageHeader
	eyebrow="Control de acceso"
	title="Administración"
	description="Usuarios, roles, módulos y permisos del sistema."
>
	
</PageHeader>

<div class="tab-strip" role="tablist" aria-label="Administración" tabindex="-1" on:keydown={navegarPestanas}>
	<button id="tab-usuarios" role="tab" aria-selected={tab === 'usuarios'} aria-controls="panel-administracion" tabindex={tab === 'usuarios' ? 0 : -1} class:active={tab === 'usuarios'} type="button" on:click={() => (tab = 'usuarios')}>
		Usuarios
	</button>
	<button id="tab-roles" role="tab" aria-selected={tab === 'roles'} aria-controls="panel-administracion" tabindex={tab === 'roles' ? 0 : -1} class:active={tab === 'roles'} type="button" on:click={() => (tab = 'roles')}>
		Roles
	</button>
	<button id="tab-permisos" role="tab" aria-selected={tab === 'permisos'} aria-controls="panel-administracion" tabindex={tab === 'permisos' ? 0 : -1} class:active={tab === 'permisos'} type="button" on:click={() => (tab = 'permisos')}>
		Permisos
	</button>
</div>

<div id="panel-administracion" role="tabpanel" aria-labelledby={'tab-' + tab} tabindex="0">
{#if tab === 'usuarios'}
	

	

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Usuarios registrados</div>
				<div class="stat-card__value mt-1">{cargando ? '—' : totalUsuarios}</div>
				<div class="fs-8 text-faint">total en el sistema</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Usuarios activos</div>
				<div class="stat-card__value mt-1">{cargando ? '—' : usuariosActivos}</div>
				<div class="fs-8 text-faint">con acceso habilitado</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Usuarios inactivos</div>
				<div class="stat-card__value mt-1">{cargando ? '—' : usuariosInactivos}</div>
				<div class="fs-8 text-faint">sin acceso al sistema</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Roles disponibles</div>
				<div class="stat-card__value mt-1">{cargandoRoles || errorRoles ? '—' : roles.length}</div>
				<div class="fs-8 text-faint">roles disponibles</div>
			</div>
		</div>
	</div>

	<div class="row g-3">
		<div class="col-12">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Usuarios</h3>
						<p>{usuarios.length} registros · {paginaUsuarios.recordsDisplay} visibles</p>
					</div>
					<button data-edicion class="btn btn-accent btn-sm" type="button" on:click={abrirCreacion}>
						<Icon name="plus" size={14} />
						Crear usuario
					</button>
				</div>

				<div class="filter-bar">
					<div class="filter-field filter-field--grow">
						<label for="usuario-search">Buscar</label>
						<div class="input-group input-group-sm">
							<span class="input-group-text"><Icon name="search" size={14} /></span>
							<input
								id="usuario-search"
								class="form-control form-control-sm"
								placeholder="Nombre o correo electrónico"
								bind:value={busqueda} on:input={aplicarBusqueda}
							/>
						</div>
					</div>
					<div class="filter-field filter-field--md">
						<label for="usuario-estado-filtro">Estado</label>
						<select
							id="usuario-estado-filtro"
							class="form-select form-select-sm"
							bind:value={filtroEstado} on:change={aplicarBusqueda}
						>
							<option value="todos">Todos</option>
							<option value="activos">Activos</option>
							<option value="inactivos">Inactivos</option>
						</select>
					</div>
					<div class="filter-field filter-field--md">
						<label for="usuario-rol-filtro">Rol</label>
						<select id="usuario-rol-filtro" class="form-select form-select-sm" bind:value={filtroRol} on:change={aplicarBusqueda}>
							<option value="todos">Todos</option>
							{#each roles as rol (rol.id_rol)}
								<option value={String(rol.id_rol)}>{rol.nombre}</option>
							{/each}
						</select>
					</div>
					<div class="filter-bar__end">
						<button class="btn btn-quiet btn-sm" type="button" on:click={limpiarFiltros}>
							<Icon name="filter" size={14} />
							Limpiar
						</button>
					</div>
				</div>

				{#if cargando}
					<div class="state-block">
						<span class="spinner-inline"></span>
						<p class="mt-2 mb-0">Cargando usuarios...</p>
					</div>
				{:else if errorCarga}
					<div class="alert-app m-3" role="alert">
						<Icon name="alert" size={16} />
						<div>
							<strong>No se pudo cargar la información</strong>
							{errorCarga}
						</div>
					</div>
					<div class="px-3 pb-3">
						<button class="btn btn-quiet btn-sm" type="button" on:click={cargarUsuarios}>
							<Icon name="refresh" size={14} />
							Reintentar
						</button>
					</div>
				{:else if usuarios.length === 0}
					<EmptyState
						icon="users"
						title="Sin usuarios"
						message="Cree el primer usuario administrador u operador para habilitar el acceso al sistema."
					/>
{:else}<div class="table-wrap" role="region" aria-label="Tabla desplazable"><table class="data-table" use:conectarTabla={'usuarios'} aria-label="Usuarios"><caption class="visually-hidden">Usuarios del sistema</caption></table></div><div class="panel__foot pie-tabla"><span role="status">Mostrando {paginaUsuarios.recordsDisplay ? paginaUsuarios.start + 1 : 0}–{paginaUsuarios.end} de {paginaUsuarios.recordsDisplay} usuarios</span><div class="paginacion-tabla"><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaUsuarios, 'previous')} disabled={paginaUsuarios.page <= 0}>Anterior</button><span>{paginaUsuarios.pages ? paginaUsuarios.page + 1 : 0} / {paginaUsuarios.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaUsuarios, 'next')} disabled={paginaUsuarios.page + 1 >= paginaUsuarios.pages}>Siguiente</button></div></div>{/if}
			</section>
		</div>

		{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-administracion-titulo" use:modalFormulario={cancelarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head">
						<div>
							<h3 id="formulario-administracion-titulo">{idEditando === null ? 'Crear usuario' : 'Editar usuario'}</h3>
							<p>
								{idEditando === null
									? 'Complete los datos del nuevo usuario.'
									: 'Actualice los datos del usuario seleccionado.'}
							</p>
						</div>
						<button
							class="modal-app__close"
							type="button"
							title="Cerrar formulario" aria-label="Cerrar formulario"
							on:click={cancelarFormulario}
						>
							<Icon name="close" size={16} />
						</button>
					</div>

					{#if cargandoEdicion}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>Cancelar</button></div>
{:else if falloEdicion}<div class="panel__body estado-edicion"><p role="alert">{falloEdicion}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicion(idEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarUsuario}>
 
						{#if errorRoles}
							<div class="alert-app alert-app--warn mb-3" role="alert">
								<Icon name="alert" size={16} />
								<div>
									<strong>Roles no disponibles</strong>
									{errorRoles}
								</div>
							</div>
						{/if}

						<div class="mb-3">
							<label class="form-label" for="usuario-nombre">Nombre completo</label>
							<input
								id="usuario-nombre"
								class="form-control"
								type="text"
								autocomplete="name"
								bind:value={nombre}
								required
							data-campo-api="nombre" />
						</div>

						<div class="mb-3">
							<label class="form-label" for="usuario-correo">Correo electrónico</label>
							<input
								id="usuario-correo"
								class="form-control"
								type="email"
								autocomplete="email"
								bind:value={correo}
								required
							data-campo-api="correo" />
						</div>

						<div class="mb-3">
							<label class="form-label" for="usuario-contrasena">Contraseña</label>
							<input
								id="usuario-contrasena"
								class="form-control"
								type="password"
								autocomplete="new-password"
								bind:value={contrasena}
								required={idEditando === null}
							data-campo-api="contrasena_hash" />
							<div class="form-text">
								{idEditando === null
									? 'Define la contraseña que usará la persona para ingresar.'
									: 'Déjela en blanco para conservar la contraseña actual.'}
							</div>
						</div>

						<div class="mb-3">
							<label class="form-label" for="usuario-rol">Rol</label>
							<select id="usuario-rol" class="form-select" bind:value={idRol} required data-campo-api="id_rol">
								<option value="" disabled>Seleccione un rol</option>
								{#each roles as rol (rol.id_rol)}
									<option value={String(rol.id_rol)}>{rol.nombre}</option>
								{/each}
							</select>
						</div>

						<div class="form-check mb-3">
							<input
								id="usuario-estado"
								class="form-check-input"
								type="checkbox"
								bind:checked={estado}
							data-campo-api="estado" />
							<label class="form-check-label" for="usuario-estado">Usuario activo</label>
						</div>

						<div class="d-flex gap-2">
							<button class="btn btn-accent" type="submit" disabled={guardando}>
								{#if guardando}
									<span class="spinner-inline"></span>
								{/if}
								{idEditando === null ? 'Crear usuario' : 'Guardar cambios'}
							</button>
							<button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>
								Cancelar
							</button>
						</div>
					</form>
{/if}

 </dialog>
{/if}
	</div>
{:else if tab === 'roles'}
 
 
 {#if preparandoRol}<p class="mb-3" role="status">Consultando rol...</p>{/if}
 <div class="row g-3">
  <div class="col-12">
   <section class="panel">
    <div class="panel__head"><div><h3>Roles</h3><p>Roles disponibles para asignar a los usuarios</p></div><button data-edicion class="btn btn-accent btn-sm" type="button" on:click={abrirCreacionRol} disabled={cargandoRoles || guardandoRol || preparandoRol}><Icon name="plus" size={14} /> Crear rol</button></div>
    <div class="filter-bar"><div class="filter-field filter-field--grow"><label for="rol-busqueda">Buscar</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="rol-busqueda" class="form-control form-control-sm" placeholder="Nombre o descripción del rol" bind:value={busquedaRoles} on:input={aplicarBusqueda} /></div></div></div>
    {#if cargandoRoles}<div class="state-block" role="status"><span class="spinner-inline"></span><p>Cargando roles...</p></div>
    {:else if errorRoles}<div class="alert-app m-3" role="alert">{errorRoles}</div><div class="px-3 pb-3"><button class="btn btn-quiet btn-sm" type="button" on:click={cargarRoles}>Reintentar</button></div>
    {:else if roles.length === 0}<EmptyState icon="shield" title="Sin roles" message="Cree al menos un rol para asignar permisos." />
    {:else}<div class="table-wrap" role="region" aria-label="Tabla desplazable"><table class="data-table" use:conectarTabla={'roles'} aria-label="Roles"><caption class="visually-hidden">Roles del sistema</caption></table></div><div class="panel__foot pie-tabla"><span role="status">Mostrando {paginaRoles.recordsDisplay ? paginaRoles.start + 1 : 0}–{paginaRoles.end} de {paginaRoles.recordsDisplay} roles</span><div class="paginacion-tabla"><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaRoles, 'previous')} disabled={paginaRoles.page <= 0}>Anterior</button><span>{paginaRoles.pages ? paginaRoles.page + 1 : 0} / {paginaRoles.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaRoles, 'next')} disabled={paginaRoles.page + 1 >= paginaRoles.pages}>Siguiente</button></div></div>{/if}
   </section>
  </div>
  {#if mostrarFormularioRol}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-administracion-rol-titulo" use:modalFormulario={limpiarFormularioRol} aria-busy={cargandoEdicionRol}>
<div class="panel__head"><div><h3 id="formulario-administracion-rol-titulo">{idRolEditando === null ? 'Crear rol' : 'Editar rol'}</h3><p>Nombre, descripción y estado del rol.</p></div><button class="modal-app__close" type="button" aria-label="Cerrar formulario" on:click={limpiarFormularioRol}><Icon name="close" size={16} /></button></div>{#if cargandoEdicionRol}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={limpiarFormularioRol}>Cancelar</button></div>
{:else if falloEdicionRol}<div class="panel__body estado-edicion"><p role="alert">{falloEdicionRol}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicionRol(idRolEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={limpiarFormularioRol}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarRol}>
 <fieldset disabled={guardandoRol || preparandoRol}>
   <div class="mb-3"><label class="form-label" for="rol-nombre">Nombre</label><input id="rol-nombre" type="text" class="form-control" bind:value={nombreNuevoRol} required data-campo-api="nombre" /></div>
   <div class="mb-3"><label class="form-label" for="rol-descripcion">Descripción</label><textarea id="rol-descripcion" class="form-control" rows="3" bind:value={descripcionRol} data-campo-api="descripcion"></textarea></div>
   <div class="form-check mb-3"><input id="rol-activo" class="form-check-input" type="checkbox" bind:checked={estadoRol} data-campo-api="estado" /><label class="form-check-label" for="rol-activo">Rol activo</label></div><div class="form-check mb-3"><input id="rol-solo-consulta" class="form-check-input" type="checkbox" bind:checked={soloLecturaRol} /><label class="form-check-label" for="rol-solo-consulta">Solo consulta</label><p class="form-text">Permite revisar información sin crear, editar ni eliminar registros.</p></div>
   <div class="d-flex gap-2"><button class="btn btn-accent" type="submit">{guardandoRol ? 'Guardando...' : idRolEditando === null ? 'Crear rol' : 'Guardar cambios'}</button><button class="btn btn-quiet" type="button" on:click={limpiarFormularioRol}>Cancelar</button></div>
  </fieldset></form>
{/if}

 </dialog>
{/if}
 </div>
{:else}
 
 
 <section class="panel">
  <div class="panel__head"><div><h3>Permisos por rol</h3><p>Marque los módulos habilitados para cada rol. Los cambios se guardan individualmente.</p></div></div>
  <div class="filter-bar"><div class="filter-field filter-field--grow"><label for="permiso-busqueda">Buscar rol</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="permiso-busqueda" class="form-control form-control-sm" bind:value={busquedaPermisos} on:input={aplicarBusqueda} placeholder="Nombre del rol" /></div></div></div>
  {#if guardandoPermisos}<p class="px-3 pt-3" role="status">Guardando permiso...</p>{/if}
  {#if cargandoRoles || cargandoPermisos}<div class="state-block" role="status"><span class="spinner-inline"></span><p>Cargando roles, módulos y permisos...</p></div>
  {:else if errorPermisos || errorRoles}<div class="alert-app m-3" role="alert">{errorRoles || errorPermisos}</div><div class="px-3 pb-3"><button class="btn btn-quiet btn-sm" type="button" on:click={actualizarTodo}>Reintentar</button></div>
  {:else if roles.length === 0 || modulos.length === 0}<EmptyState icon="shield" title="Faltan datos" message="Se necesitan roles y módulos registrados para construir la matriz." />
  {:else}{#key firmaModulos}<div class="permission-matrix table-wrap"><table class="data-table" use:conectarTabla={'permisos'} aria-label="Permisos por rol y módulo"><caption class="visually-hidden">Acceso de cada rol a los módulos</caption></table></div>{/key}<div class="panel__foot pie-tabla"><span role="status">Mostrando {paginaPermisos.recordsDisplay ? paginaPermisos.start + 1 : 0}–{paginaPermisos.end} de {paginaPermisos.recordsDisplay} roles</span><div class="paginacion-tabla"><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaPermisos, 'previous')} disabled={paginaPermisos.page <= 0}>Anterior</button><span>{paginaPermisos.pages ? paginaPermisos.page + 1 : 0} / {paginaPermisos.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPaginaTabla(tablaPermisos, 'next')} disabled={paginaPermisos.page + 1 >= paginaPermisos.pages}>Siguiente</button></div></div>{/if}
 </section>
{/if}
</div>
</div>

<style>
 fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
 .pie-tabla, .paginacion-tabla { display: flex; align-items: center; flex-wrap: wrap; gap: 0.65rem; }
 .pie-tabla { justify-content: space-between; }
 .administracion-tablas :global(.dt-container), .administracion-tablas :global(.dt-layout-row), .administracion-tablas :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .administracion-tablas :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
 .administracion-tablas :global(table.dataTable thead th) { background: var(--surface-soft); color: var(--text-faint); font-size: 0.65rem; padding: 0.55rem 1.6rem 0.55rem 0.7rem; border-color: var(--line); }
 .administracion-tablas :global(table.dataTable tbody td) { background: var(--surface); color: var(--text); padding: 0.6rem 0.7rem; border-color: var(--line); }
 .administracion-tablas :global(table.dataTable tbody tr:hover td) { background: #fbfbf9; }
 .administracion-tablas :global(.permiso-celda) { text-align: center; }
 .administracion-tablas :global(.permiso-celda input) { margin: 0; cursor: pointer; }
</style>
