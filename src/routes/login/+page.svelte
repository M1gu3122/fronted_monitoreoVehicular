<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { login, enterAsGuest, session } from '#lib/stores/session.svelte.js';
	import { getApiBaseUrl, ApiError } from '#lib/service/client.js';

	let correo = $state('');
	let contrasena = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let errorHint = $state('');
	let touched = $state({ correo: false, contrasena: false });

	const next = $derived(page.url.searchParams.get('next') || '/');

	const correoError = $derived(
		touched.correo && !correo
			? 'Ingrese el correo electrónico.'
			: touched.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
				? 'Ingrese un correo válido.'
				: ''
	);
	const contrasenaError = $derived(
		touched.contrasena && contrasena.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : ''
	);

	onMount(() => {
		if (session.ready && session.token) {
			goto('/', { replace: true });
		}
	});

	async function handleSubmit(event) {
		event.preventDefault();
		touched = { correo: true, contrasena: true };
		error = '';
		errorHint = '';
		if (correoError || contrasenaError || !correo || contrasena.length < 6) return;

		submitting = true;
		try {
			await login(correo.trim(), contrasena);
			await goto(next.startsWith('/') ? next : '/', { replace: true });
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) {
					error = 'Credenciales incorrectas o cuenta desactivada.';
				} else if (err.status === 0) {
					error = 'No fue posible conectar con el backend.';
					errorHint = `Verifique que el servicio esté activo en ${getApiBaseUrl()} y que CORS permita este origen.`;
				} else {
					error = err.message;
					errorHint =
						err.status >= 500
							? 'El backend respondió con un error interno. Revise los logs del servicio o la conexión a PostgreSQL.'
							: '';
				}
			} else {
				error = 'Ocurrió un error inesperado al iniciar sesión.';
			}
		} finally {
			submitting = false;
		}
	}

	async function handleGuest() {
		enterAsGuest();
		await goto('/');
	}
</script>

<svelte:head>
	<title>Iniciar sesión · LPR Control</title>
</svelte:head>

<div class="login-shell">
	<section class="login-brand" aria-label="Información del sistema">
		<div class="login-brand__top">
			<span class="brand-mark">
				<Icon name="camera" size={19} stroke={1.7} />
			</span>
			<span class="brand-copy">
				<strong>LPR CONTROL</strong>
				<span>Flujo vehicular · concesionario</span>
			</span>
		</div>

		<div class="login-brand__content">
			<h1>Cada vehículo <em>ubicado.</em> Cada movimiento registrado.</h1>
			<p>
				Supervisión del área de mantenimiento mediante cámaras IP y visión artificial:
				entradas, salidas, ocupación por zona y permanencia de cada visita.
			</p>

			<ul class="login-points">
				<li>
					<Icon name="car" size={17} />
					<span><strong>Detección y seguimiento.</strong> Los eventos de visión artificial se relacionan con visitas y zonas supervisadas.</span>
				</li>
				<li>
					<Icon name="zones" size={17} />
					<span><strong>Ocupación con contexto.</strong> Capacidad, ocupación observada y estado de cada zona, sin asumir datos que el sistema no pueda demostrar.</span>
				</li>
				<li>
					<Icon name="alert" size={17} />
					<span><strong>Alertas accionables.</strong> Permanencias prolongadas, congestiones y fallas de conexión centralizadas para su revisión.</span>
				</li>
			</ul>
		</div>

		
	</section>

	<section class="login-panel">
		<div class="login-card">
			<div class="login-card__head">
				<div class="eyebrow">Acceso al sistema</div>
				<h2>Iniciar sesión</h2>
				<p>Use las credenciales asignadas por el administrador del sistema.</p>
			</div>

			{#if error}
				<div class="alert-app mb-3" role="alert">
					<Icon name="alert" size={18} />
					<div>
						<strong>{error}</strong>
						{#if errorHint}<span>{errorHint}</span>{/if}
					</div>
				</div>
			{/if}

			<form onsubmit={handleSubmit} novalidate>
				<div>
					<label class="form-label" for="correo">Correo electrónico</label>
					<input
						id="correo"
						type="email"
						class="form-control"
						class:is-invalid={correoError}
						autocomplete="username"
						placeholder="usuario@concesionario.com"
						bind:value={correo}
						onblur={() => (touched.correo = true)}
						aria-describedby={correoError ? 'correo-error' : undefined}
					/>
					{#if correoError}
						<div class="invalid-feedback d-block" id="correo-error">{correoError}</div>
					{/if}
				</div>

				<div>
					<label class="form-label" for="contrasena">Contraseña</label>
					<div class="input-group">
						<input
							id="contrasena"
							type={showPassword ? 'text' : 'password'}
							class="form-control"
							class:is-invalid={contrasenaError}
							autocomplete="current-password"
							placeholder="Mínimo 6 caracteres"
							bind:value={contrasena}
							onblur={() => (touched.contrasena = true)}
							aria-describedby={contrasenaError ? 'contrasena-error' : undefined}
						/>
						<button
							class="btn btn-quiet"
							type="button"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						>
							<Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
						</button>
					</div>
					{#if contrasenaError}
						<div class="invalid-feedback d-block" id="contrasena-error">{contrasenaError}</div>
					{/if}
				</div>

				<button class="btn btn-accent w-100 mt-1" type="submit" disabled={submitting}>
					{#if submitting}
						<span class="spinner-inline"></span>
						Validando…
					{:else}
						Ingresar al panel
						<Icon name="arrow-right" size={15} />
					{/if}
				</button>
			</form>

			

			
		</div>
	</section>
</div>
