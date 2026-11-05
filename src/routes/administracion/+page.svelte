<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		listarUsuarios,
		obtenerUsuario,
		crearUsuario,
		actualizarUsuario,
		desactivarUsuario,
		listarRoles,
		crearRol,
		listarModulos,
		listarPermisos,
		crearPermiso,
		eliminarPermiso
	} from '#lib/service/administracion.js';
	import { errorMessage, getApiBaseUrl, probeBackend } from '#lib/service/client.js';
	import { session, isAdmin } from '#lib/stores/session.svelte.js';
	import { pushToast, toastError } from '#lib/stores/toasts.svelte.js';
	import { formatDateTime, formatNumber } from '#lib/utils/format.js';
	import {
		construirPayloadActualizacion,
		construirPayloadCreacion,
		normalizeUsuario,
		validarUsuarioForm
	} from '#lib/utils/usuarios.js';

	let tab = $state('usuarios');
	let usuarios = $state([]);
	let roles = $state([]);
	let modulos = $state([]);
	let permisos = $state([]);
	let loading = $state(true);
	let errors = $state({ usuarios: '', roles: '', modulos: '', permisos: '' });
	let lastUpdated = $state(null);
	let probe = $state(null);
	let probing = $state(false);
	let pendingPermission = $state(null);

	let userModalOpen = $state(false);
	let editingUser = $state(null);
	let userForm = $state(blankUser());
	let userErrors = $state({});
	let savingUser = $state(false);
	let loadingUser = $state(false);
	let deactivateTarget = $state(null);
	let deactivating = $state(false);
	let activateTarget = $state(null);
	let activating = $state(false);
	let roleChangeTarget = $state(null);

	let roleModalOpen = $state(false);
	let roleForm = $state({ nombre: '', descripcion: '', estado: true });
	let roleErrors = $state({});
	let savingRole = $state(false);

	function blankUser() {
		return { nombre: '', correo: '', contrasena: '', contrasena_hash: '', id_rol: '', estado: true };
	}

	const roleById = $derived(new Map(roles.map((rol) => [Number(rol.id_rol), rol])));
	const moduleById = $derived(new Map(modulos.map((modulo) => [Number(modulo.id_modulo), modulo])));
	const permissionKeys = $derived(new Set(permisos.map((item) => `${item.id_rol}-${item.id_modulo}`)));

	const loadStatus = $derived.by(() => {
		const items = [
			{ key: 'usuarios', label: 'Usuarios', count: usuarios.length, error: errors.usuarios },
			{ key: 'roles', label: 'Roles', count: roles.length, error: errors.roles },
			{ key: 'modulos', label: 'Módulos', count: modulos.length, error: errors.modulos },
			{ key: 'permisos', label: 'Permisos', count: permisos.length, error: errors.permisos }
		];
		return items;
	});

	async function loadAll(silent = false) {
		if (!silent) loading = true;
		const results = await Promise.allSettled([
			listarUsuarios(),
			listarRoles(),
			listarModulos(),
			listarPermisos()
		]);
		const [usr, rol, mod, per] = results;
		if (usr.status === 'fulfilled') {
			usuarios = Array.isArray(usr.value) ? usr.value : [];
			errors.usuarios = '';
		} else {
			usuarios = [];
			errors.usuarios = errorMessage(usr.reason);
		}
		if (rol.status === 'fulfilled') {
			roles = Array.isArray(rol.value) ? rol.value : [];
			errors.roles = '';
		} else {
			roles = [];
			errors.roles = errorMessage(rol.reason);
		}
		if (mod.status === 'fulfilled') {
			modulos = Array.isArray(mod.value) ? mod.value : [];
			errors.modulos = '';
		} else {
			modulos = [];
			errors.modulos = errorMessage(mod.reason);
		}
		if (per.status === 'fulfilled') {
			permisos = Array.isArray(per.value) ? per.value : [];
			errors.permisos = '';
		} else {
			permisos = [];
			errors.permisos = errorMessage(per.reason);
		}
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		loadAll();
		runProbe();
	});

	async function runProbe() {
		probing = true;
		probe = await probeBackend();
		probing = false;
	}

	function openCreateUser() {
		editingUser = null;
		userForm = blankUser();
		if (roles.length) userForm.id_rol = String(roles[0].id_rol);
		userErrors = {};
		userModalOpen = true;
	}

	/**
	 * Abre el modal de edición y consulta el registro actualizado del usuario.
	 * La API exige el payload completo en cada PUT, por eso se recupera el
	 * detalle (incluye el hash vigente de la contraseña) antes de guardar.
	 */
	async function openEditUser(usuario) {
		editingUser = usuario;
		userForm = {
			nombre: usuario.nombre || '',
			correo: usuario.correo || '',
			contrasena: '',
			contrasena_hash: usuario.contrasena_hash || '',
			id_rol: String(usuario.id_rol ?? ''),
			estado: usuario.estado !== false
		};
		userErrors = {};
		userModalOpen = true;
		loadingUser = true;

		try {
			const detalle = await obtenerUsuario(usuario.id_usuario);
			const registro = normalizeUsuario(detalle);
			if (registro) {
				userForm = {
					...userForm,
					nombre: registro.nombre || userForm.nombre,
					correo: registro.correo || userForm.correo,
					contrasena_hash: registro.contrasena_hash || userForm.contrasena_hash,
					id_rol: String(registro.id_rol ?? userForm.id_rol),
					estado: registro.estado
				};
			}
		} catch (err) {
			// Si el detalle no está disponible se conservan los datos del listado.
			console.warn('No fue posible consultar el detalle del usuario:', err);
		} finally {
			loadingUser = false;
		}
	}

	async function saveUser() {
		const errs = validarUsuarioForm(userForm, { editing: Boolean(editingUser) });
		userErrors = errs;
		if (Object.keys(errs).length) return;

		// Cambiar el propio rol puede dejar al administrador sin permisos: se pide confirmación.
		if (
			editingUser &&
			Number(editingUser.id_usuario) === Number(session.user?.id_usuario) &&
			Number(userForm.id_rol) !== Number(session.user?.id_rol)
		) {
			roleChangeTarget = editingUser;
			return;
		}

		await persistUser();
	}

	async function persistUser() {
		savingUser = true;
		roleChangeTarget = null;
		try {
			if (editingUser) {
				const payload = construirPayloadActualizacion(editingUser, userForm, userForm.contrasena);
				await actualizarUsuario(editingUser.id_usuario, payload);
				pushToast({
					title: 'Usuario actualizado',
					message: `${payload.nombre} se actualizó correctamente.`
				});
			} else {
				const payload = construirPayloadCreacion(userForm);
				await crearUsuario(payload);
				pushToast({ title: 'Usuario creado', message: `${payload.nombre} fue registrado.` });
			}
			userModalOpen = false;
			await loadAll(true);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('lpr:permissions-changed'));
			}
		} catch (err) {
			toastError('No fue posible guardar el usuario', errorMessage(err));
		} finally {
			savingUser = false;
		}
	}

	/**
	 * Recupera el registro completo del usuario para construir el payload que
	 * exige la API (nombre, correo, contrasena_hash, id_rol y estado).
	 */
	async function obtenerRegistroCompleto(usuario) {
		try {
			const detalle = await obtenerUsuario(usuario.id_usuario);
			const registro = normalizeUsuario(detalle);
			return registro ? { ...usuario, ...registro } : usuario;
		} catch (err) {
			console.warn('No fue posible consultar el detalle del usuario:', err);
			return usuario;
		}
	}

	async function confirmDeactivate() {
		if (!deactivateTarget) return;
		const usuario = deactivateTarget;
		deactivating = true;
		try {
			const registro = await obtenerRegistroCompleto(usuario);
			const payload = construirPayloadActualizacion(
				registro,
				{
					nombre: registro.nombre,
					correo: registro.correo,
					contrasena_hash: registro.contrasena_hash,
					id_rol: registro.id_rol,
					estado: false
				},
				''
			);
			await desactivarUsuario(usuario.id_usuario, payload);
			pushToast({
				title: 'Usuario desactivado',
				message: `${payload.nombre} ya no podrá iniciar sesión.`
			});
			deactivateTarget = null;
			await loadAll(true);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('lpr:permissions-changed'));
			}
		} catch (err) {
			toastError('No fue posible desactivar el usuario', errorMessage(err));
		} finally {
			deactivating = false;
		}
	}

	async function confirmActivate() {
		if (!activateTarget) return;
		const usuario = activateTarget;
		activating = true;
		try {
			const registro = await obtenerRegistroCompleto(usuario);
			const payload = construirPayloadActualizacion(
				registro,
				{
					nombre: registro.nombre,
					correo: registro.correo,
					contrasena_hash: registro.contrasena_hash,
					id_rol: registro.id_rol,
					estado: true
				},
				''
			);
			await actualizarUsuario(usuario.id_usuario, payload);
			pushToast({
				title: 'Usuario activado',
				message: `${payload.nombre} puede volver a iniciar sesión.`
			});
			activateTarget = null;
			await loadAll(true);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('lpr:permissions-changed'));
			}
		} catch (err) {
			toastError('No fue posible activar el usuario', errorMessage(err));
		} finally {
			activating = false;
		}
	}

	async function saveRole() {
		const errs = {};
		if (!roleForm.nombre.trim()) errs.nombre = 'El nombre del rol es obligatorio.';
		roleErrors = errs;
		if (Object.keys(errs).length) return;
		savingRole = true;
		try {
			await crearRol({
				nombre: roleForm.nombre.trim(),
				descripcion: roleForm.descripcion.trim() || null,
				estado: roleForm.estado
			});
			pushToast({ title: 'Rol creado', message: `${roleForm.nombre.trim()} se agregó al catálogo.` });
			roleModalOpen = false;
			roleForm = { nombre: '', descripcion: '', estado: true };
			await loadAll(true);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('lpr:permissions-changed'));
			}
		} catch (err) {
			toastError('No fue posible crear el rol', errorMessage(err));
		} finally {
			savingRole = false;
		}
	}

	async function togglePermission(idRol, idModulo, enabled) {
		const key = `${idRol}-${idModulo}`;
		pendingPermission = key;
		try {
			if (enabled) {
				await crearPermiso({ id_rol: Number(idRol), id_modulo: Number(idModulo), estado: true });
				pushToast({ title: 'Permiso habilitado', message: `${roleById.get(Number(idRol))?.nombre || idRol} puede acceder a ${moduleById.get(Number(idModulo))?.nombre_modulo || idModulo}.` });
			} else {
				await eliminarPermiso(Number(idRol), Number(idModulo));
				pushToast({ title: 'Permiso retirado', message: 'El permiso se eliminó del rol.' });
			}
			await loadAll(true);
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('lpr:permissions-changed'));
			}
		} catch (err) {
			permisos = [...permisos];
			toastError('No fue posible cambiar el permiso', errorMessage(err));
		} finally {
			pendingPermission = null;
		}
	}
</script>

<PageHeader
	eyebrow="Control de acceso"
	title="Administración"
	description=""
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => loadAll(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
	{/snippet}
</PageHeader>

{#if !isAdmin()}
	<div class="alert-app alert-app--warn mb-3">
		<Icon name="shield" size={17} />
		<div>
			<strong>Rol no administrativo</strong>
			<span>La interfaz permite consultar esta sección con cualquier sesión porque el backend no valida roles en estos endpoints. Se recomienda corregir la autorización en la API antes de exponerla.</span>
		</div>
	</div>
{/if}

<div class="tab-strip">
	<button class:active={tab === 'usuarios'} type="button" onclick={() => (tab = 'usuarios')}>
		Usuarios
		{#if errors.usuarios}<span class="tab__dot"></span>{/if}
	</button>
	<button class:active={tab === 'roles'} type="button" onclick={() => (tab = 'roles')}>
		Roles
		{#if errors.roles}<span class="tab__dot"></span>{/if}
	</button>
	<button class:active={tab === 'permisos'} type="button" onclick={() => (tab = 'permisos')}>
		Permisos
		{#if errors.permisos || errors.modulos}<span class="tab__dot"></span>{/if}
	</button>
	
</div>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Consultando usuarios, roles y permisos…" /></div>
{:else}
	{#if tab === 'usuarios'}
		<section class="panel">
			<div class="panel__head">
				<div>
					<h3>Usuarios</h3>
					<p>{usuarios.length} registros · última actualización {lastUpdated ? formatDateTime(lastUpdated) : '—'}</p>
				</div>
				<button class="btn btn-accent btn-sm" type="button" onclick={openCreateUser}>
					<Icon name="plus" size={14} />
					Crear usuario
				</button>
			</div>

			{#if errors.usuarios}
				<div class="panel__body">
					<ErrorState title="No fue posible listar usuarios" message={errors.usuarios} onretry={() => loadAll()} />
					<div class="alert-app alert-app--warn mt-3">
						<Icon name="alert" size={17} />
						<div>
							<strong>Detalle del contrato de la API</strong>
							<span>El endpoint <code>/usuarios/</code> exige el registro completo del usuario (<code>nombre</code>, <code>correo</code>, <code>contrasena_hash</code>, <code>id_rol</code> y <code>estado</code>). Si la lista falla, revise la conexión y los permisos del endpoint en el backend.</span>
						</div>
					</div>
				</div>
			{:else if !usuarios.length}
				<EmptyState icon="users" title="Sin usuarios" message="Cree el primer usuario administrador u operador." actionLabel="Crear usuario" onaction={openCreateUser} />
			{:else}
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Creado</th><th></th></tr>
						</thead>
						<tbody>
							{#each usuarios as usuario (usuario.id_usuario)}
								<tr>
									<td>
										<span class="cell-strong">{usuario.nombre || '—'}</span>
										<span class="cell-sub">ID #{usuario.id_usuario}</span>
									</td>
									<td class="fs-7">{usuario.correo || '—'}</td>
									<td class="fs-7">{roleById.get(Number(usuario.id_rol))?.nombre || `Rol ${usuario.id_rol ?? '—'}`}</td>
									<td><StatusPill tone={usuario.estado === false ? 'neutral' : 'ok'} label={usuario.estado === false ? 'Inactivo' : 'Activo'} dot={false} /></td>
									<td class="fs-7 nowrap">{usuario.creado ? formatDateTime(usuario.creado) : '—'}</td>
									<td class="text-end nowrap">
										<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => openEditUser(usuario)} title="Editar usuario (nombre, rol y estado)" aria-label={`Editar ${usuario.nombre}`}>
											<Icon name="edit" size={14} />
										</button>
										{#if usuario.estado !== false}
											<button class="btn btn-quiet-danger btn-icon btn-xs ms-1" type="button" onclick={() => (deactivateTarget = usuario)} title="Desactivar usuario" aria-label={`Desactivar ${usuario.nombre}`}>
												<Icon name="lock" size={14} />
											</button>
										{:else}
											<button class="btn btn-quiet btn-icon btn-xs ms-1" type="button" onclick={() => (activateTarget = usuario)} title="Activar usuario" aria-label={`Activar ${usuario.nombre}`}>
												<Icon name="check" size={14} />
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			
		</section>
	{:else if tab === 'roles'}
		<section class="panel">
			<div class="panel__head">
				<div>
					<h3>Roles</h3>
					<p>Catálogo de roles del sistema</p>
				</div>
				<button class="btn btn-accent btn-sm" type="button" onclick={() => (roleModalOpen = true)}>
					<Icon name="plus" size={14} />
					Crear rol
				</button>
			</div>
			{#if errors.roles}
				<div class="panel__body"><ErrorState title="No fue posible listar roles" message={errors.roles} onretry={() => loadAll()} /></div>
			{:else if !roles.length}
				<EmptyState icon="shield" title="Sin roles" message="Cree al menos un rol para asignar permisos." actionLabel="Crear rol" onaction={() => (roleModalOpen = true)} />
			{:else}
				<div class="table-wrap">
					<table class="data-table">
						<thead><tr><th>Rol</th><th>Descripción</th><th>Estado</th><th class="num">Permisos</th><th class="num">Usuarios</th></tr></thead>
						<tbody>
							{#each roles as rol (rol.id_rol)}
								<tr>
									<td><span class="cell-strong">{rol.nombre}</span><span class="cell-sub">ID #{rol.id_rol}</span></td>
									<td class="fs-7">{rol.descripcion || 'Sin descripción'}</td>
									<td><StatusPill tone={rol.estado === false ? 'neutral' : 'ok'} label={rol.estado === false ? 'Inactivo' : 'Activo'} dot={false} /></td>
									<td class="num">{formatNumber(permisos.filter((item) => Number(item.id_rol) === Number(rol.id_rol)).length)}</td>
									<td class="num">{formatNumber(usuarios.filter((item) => Number(item.id_rol) === Number(rol.id_rol)).length)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			
		</section>
	{:else if tab === 'permisos'}
		<section class="panel">
			<div class="panel__head">
				<div>
					<h3>Permisos por rol</h3>
					<p>Marque los módulos habilitados para cada rol</p>
				</div>
			</div>
			{#if errors.permisos || errors.modulos || errors.roles}
				<div class="panel__body">
					<ErrorState
						title="No fue posible cargar la matriz de permisos"
						message={[errors.roles, errors.modulos, errors.permisos].filter(Boolean).join(' · ')}
						onretry={() => loadAll()}
					/>
				</div>
			{:else if !roles.length || !modulos.length}
				<EmptyState icon="shield" title="Faltan datos" message="Se necesitan roles y módulos para construir la matriz." />
			{:else}
				<div class="table-wrap">
					<table class="data-table permission-matrix">
						<thead>
							<tr>
								<th>Módulo</th>
								{#each roles as rol (rol.id_rol)}
									<th class="text-center">{rol.nombre}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each modulos as modulo (modulo.id_modulo)}
								<tr>
									<td>
										<span class="cell-strong">{modulo.nombre_modulo}</span>
										<span class="cell-sub">Módulo #{modulo.id_modulo}</span>
									</td>
									{#each roles as rol (rol.id_rol)}
										{@const key = `${rol.id_rol}-${modulo.id_modulo}`}
										{@const enabled = permissionKeys.has(key)}
										<td class="text-center">
											<input
												class="form-check-input"
												type="checkbox"
												checked={enabled}
												disabled={pendingPermission === key}
												onchange={(event) => togglePermission(rol.id_rol, modulo.id_modulo, event.currentTarget.checked)}
												aria-label={`${rol.nombre} · ${modulo.nombre_modulo}`}
											/>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				
			{/if}
		</section>
	{:else}
		<div class="row g-3">
			<div class="col-12 col-lg-5">
				<section class="panel h-100">
					<div class="panel__head">
						<div><h3>Conexión con la API</h3><p>Verificación de /openapi.json</p></div>
						<button class="btn btn-quiet btn-sm" type="button" onclick={runProbe} disabled={probing}>
							<Icon name="refresh" size={14} />
							{probing ? 'Verificando…' : 'Verificar'}
						</button>
					</div>
					<div class="panel__body">
						<div class="definition-grid mb-3">
							<div><dt>URL configurada</dt><dd class="mono fs-8">{getApiBaseUrl()}</dd></div>
							<div><dt>Estado</dt><dd>{#if probe === true}<StatusPill tone="ok" label="Disponible" />{:else if probe === false}<StatusPill tone="danger" label="No disponible" />{:else}Verificando…{/if}</dd></div>
							<div><dt>Sesión</dt><dd>{session.guest ? 'Invitado' : session.token ? 'Autenticada' : 'Sin sesión'}</dd></div>
							<div><dt>Usuario</dt><dd>{session.user?.nombre || '—'}</dd></div>
							<div><dt>Rol actual</dt><dd>{session.user?.rol_nombre || '—'}</dd></div>
							<div><dt>ID de usuario</dt><dd>{session.user?.id_usuario ?? '—'}</dd></div>
						</div>
						{#if probe === false}
							<div class="alert-app alert-app--warn">
								<Icon name="alert" size={17} />
								<div><strong>Sin conexión</strong><span>El backend no respondió a /openapi.json. Verifique que esté activo y que la URL sea correcta.</span></div>
							</div>
						{/if}
					</div>
				</section>
			</div>
			<div class="col-12 col-lg-7">
				<section class="panel h-100">
					<div class="panel__head"><div><h3>Estado de los recursos</h3><p>Resultado de la última carga</p></div></div>
					<div class="table-wrap">
						<table class="data-table">
							<thead><tr><th>Recurso</th><th class="num">Registros</th><th>Resultado</th></tr></thead>
							<tbody>
								{#each loadStatus as item (item.key)}
									<tr>
										<td><span class="cell-strong">{item.label}</span><span class="cell-sub">/{(item.key === 'modulos' ? 'modulo' : item.key)}/</span></td>
										<td class="num">{formatNumber(item.count)}</td>
										<td>
											{#if item.error}
												<StatusPill tone="danger" label="Error" dot={false} />
												<div class="cell-sub text-wrap">{item.error}</div>
											{:else}
												<StatusPill tone="ok" label="Cargado" dot={false} />
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="panel__footer panel__foot">
						Los errores se muestran tal como los devuelve la API. Esta vista no modifica la base de datos ni reintenta automáticamente.
					</div>
				</section>
			</div>
			<div class="col-12">
				<div class="panel-note">
					<Icon name="info" size={15} />
					
				</div>
			</div>
		</div>
	{/if}
{/if}

<Modal open={userModalOpen} onclose={() => (userModalOpen = false)} title={editingUser ? 'Editar usuario' : 'Crear usuario'} subtitle={editingUser ? `ID #${editingUser.id_usuario} · rol y estado editables por el administrador` : ''} size="lg">
	<div class="row g-3">
		<div class="col-12 col-md-6">
			<label class="form-label" for="user-nombre">Nombre *</label>
			<input id="user-nombre" class="form-control" class:is-invalid={userErrors.nombre} bind:value={userForm.nombre} />
			{#if userErrors.nombre}<div class="invalid-feedback d-block">{userErrors.nombre}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="user-correo">Correo *</label>
			<input id="user-correo" type="email" class="form-control" class:is-invalid={userErrors.correo} bind:value={userForm.correo} />
			{#if userErrors.correo}<div class="invalid-feedback d-block">{userErrors.correo}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="user-pass">Contraseña {editingUser ? '(opcional)' : '*'}</label>
			<input id="user-pass" type="password" class="form-control" class:is-invalid={userErrors.contrasena} bind:value={userForm.contrasena} autocomplete="new-password" />
			{#if userErrors.contrasena}<div class="invalid-feedback d-block">{userErrors.contrasena}</div>{/if}

		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="user-rol">Rol *</label>
			<select id="user-rol" class="form-select" class:is-invalid={userErrors.id_rol} bind:value={userForm.id_rol} disabled={loadingUser}>
				<option value="">Seleccione…</option>
				{#each roles as rol (rol.id_rol)}
					<option value={rol.id_rol}>{rol.nombre}</option>
				{/each}
			</select>
			{#if userErrors.id_rol}<div class="invalid-feedback d-block">{userErrors.id_rol}</div>{/if}
			{#if loadingUser}<div class="form-text">Consultando el registro actual…</div>{/if}
		</div>
		<div class="col-12">
			<div class="form-check">
				<input id="user-estado" class="form-check-input" type="checkbox" bind:checked={userForm.estado} />
				<label class="form-check-label" for="user-estado">Usuario activo</label>
			</div>
			<div class="form-text">Un usuario inactivo conserva su registro y sus permisos, pero no puede iniciar sesión.</div>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (userModalOpen = false)} disabled={savingUser}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={saveUser} disabled={savingUser || loadingUser}>
			{#if savingUser}<span class="spinner-inline"></span>{/if}
			{editingUser ? 'Guardar cambios' : 'Crear usuario'}
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(deactivateTarget)} onclose={() => (deactivateTarget = null)} title="Desactivar usuario" size="sm">
	{#if deactivateTarget}
		<p class="fs-7 text-soft">¿Confirma desactivar a <strong>{deactivateTarget.nombre}</strong>? No se elimina el registro, pero el usuario no podrá iniciar sesión.</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (deactivateTarget = null)} disabled={deactivating}>Cancelar</button>
		<button class="btn btn-accent" type="button" style="background: var(--danger); border-color: var(--danger);" onclick={confirmDeactivate} disabled={deactivating}>
			{#if deactivating}<span class="spinner-inline"></span>{/if}
			Desactivar
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(activateTarget)} onclose={() => (activateTarget = null)} title="Activar usuario" size="sm">
	{#if activateTarget}
		<p class="fs-7 text-soft">¿Confirma activar a <strong>{activateTarget.nombre}</strong>? Volverá a poder iniciar sesión con su rol actual.</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (activateTarget = null)} disabled={activating}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={confirmActivate} disabled={activating}>
			{#if activating}<span class="spinner-inline"></span>{/if}
			Activar
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(roleChangeTarget)} onclose={() => (roleChangeTarget = null)} title="Cambiar su propio rol" size="sm">
	{#if roleChangeTarget}
		<p class="fs-7 text-soft">
			Está cambiando el rol de su propia cuenta. Si deja de ser administrador,
			podría perder acceso a esta sección y a los módulos restringidos.
		</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (roleChangeTarget = null)} disabled={savingUser}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={persistUser} disabled={savingUser}>
			{#if savingUser}<span class="spinner-inline"></span>{/if}
			Confirmar cambio
		</button>
	{/snippet}
</Modal>

<Modal open={roleModalOpen} onclose={() => (roleModalOpen = false)} title="Crear rol" subtitle="El rol estará disponible para asignar permisos.">
	<div class="row g-3">
		<div class="col-12">
			<label class="form-label" for="role-nombre">Nombre *</label>
			<input id="role-nombre" class="form-control" class:is-invalid={roleErrors.nombre} bind:value={roleForm.nombre} placeholder="supervisor" />
			{#if roleErrors.nombre}<div class="invalid-feedback d-block">{roleErrors.nombre}</div>{/if}
		</div>
		<div class="col-12">
			<label class="form-label" for="role-desc">Descripción</label>
			<textarea id="role-desc" class="form-control" rows="2" bind:value={roleForm.descripcion}></textarea>
		</div>
		<div class="col-12">
			<div class="form-check">
				<input id="role-estado" class="form-check-input" type="checkbox" bind:checked={roleForm.estado} />
				<label class="form-check-label" for="role-estado">Rol activo</label>
			</div>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (roleModalOpen = false)} disabled={savingRole}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={saveRole} disabled={savingRole}>
			{#if savingRole}<span class="spinner-inline"></span>{/if}
			Crear rol
		</button>
	{/snippet}
</Modal>
