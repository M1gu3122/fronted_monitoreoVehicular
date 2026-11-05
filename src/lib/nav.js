// Navegación principal de la aplicación.
// Cada ítem declara `id_modulo` según la tabla `modulo` de la base de datos (IDs 1 al 9),
// que se verifica contra los permisos de modulo_x_rol en la BD.
export const navigation = [
	{
		label: 'Operación',
		items: [
			{
				label: 'Dashboard',
				href: '/',
				icon: 'dashboard',
				section: 'Centro de control',
				description: 'Estado general del área de mantenimiento, ocupación y actividad reciente.',
				id_modulo: 1
			},
			{
				label: 'Monitoreo vehicular',
				href: '/monitoreo',
				icon: 'car',
				section: 'Operación en vivo',
				description: 'Vehículos detectados dentro del área supervisada y permanencia en curso.',
				id_modulo: 4
			},
			{
				label: 'Visitas',
				href: '/visitas',
				icon: 'history',
				section: 'Trazabilidad',
				description: 'Historial de estancias, tiempos registrados y eventos asociados a cada visita.',
				id_modulo: 3
			},
			{
				label: 'Vehículos',
				href: '/vehiculos',
				icon: 'car',
				section: 'Registro maestro',
				description: 'Vehículos identificados por el sistema y sus datos de registro.',
				id_modulo: 2
			},
			{
				label: 'Zonas y ocupación',
				href: '/zonas',
				icon: 'zones',
				section: 'Distribución del área',
				description: 'Capacidad, ocupación observada y cámaras asociadas a cada zona.',
				id_modulo: 5
			},
			{
				label: 'Cámaras',
				href: '/camaras',
				icon: 'camera',
				section: 'Infraestructura',
				description: 'Inventario de cámaras, actividad registrada y relación con las zonas.',
				id_modulo: 4
			}
		]
	},
	{
		label: 'Análisis',
		items: [
			{
				label: 'Eventos',
				href: '/eventos',
				icon: 'events',
				section: 'Registro de detecciones',
				description: 'Eventos puntuales generados por el sistema de visión artificial.',
				id_modulo: 7
			},
			{
				label: 'Seguimientos',
				href: '/seguimientos',
				icon: 'route',
				section: 'Visión multi-cámara',
				description: 'Segmentos de seguimiento y asociaciones provisionales entre cámaras.',
				id_modulo: 6
			},
			{
				label: 'Alertas',
				href: '/alertas',
				icon: 'alert',
				section: 'Atención requerida',
				description: 'Situaciones que requieren revisión y su estado de resolución.',
				id_modulo: 7
			},
			{
				label: 'Reportes',
				href: '/reportes',
				icon: 'chart',
				section: 'Análisis histórico',
				description: 'Tendencias de flujo, permanencia, ocupación y alertas en el período seleccionado.',
				id_modulo: 8
			}
		]
	},
	{
		label: 'Sistema',
		items: [
			{
				label: 'Administración',
				href: '/administracion',
				icon: 'users',
				section: 'Control de acceso',
				description: 'Usuarios, roles, módulos y permisos del sistema.',
				requiresAuth: true,
				adminOnly: true,
				id_modulo: 9
			}
			
		]
	}
];

export const navItems = navigation.flatMap((group) =>
	group.items.map((item) => ({ ...item, group: group.label }))
);

export function findNavItem(path) {
	if (!path) return navItems[0];
	if (path === '/') return navItems[0];
	const match = navItems
		.filter((item) => item.href !== '/' && path.startsWith(item.href))
		.sort((a, b) => b.href.length - a.href.length)[0];
	return match || navItems[0];
}

export function isActive(path, href) {
	if (href === '/') return path === '/';
	return path === href || path.startsWith(`${href}/`);
}

/**
 * Obtiene el ID de módulo de la BD (1 al 9) correspondiente a una ruta específica.
 * @param {string} pathname
 * @returns {number|null}
 */
export function getModuleIdForPath(pathname) {
	if (!pathname || pathname === '/' || pathname.startsWith('/login')) return 1;
	if (pathname.startsWith('/vehiculos')) return 2;
	if (pathname.startsWith('/visitas')) return 3;
	if (pathname.startsWith('/monitoreo') || pathname.startsWith('/camaras')) return 4;
	if (pathname.startsWith('/zonas')) return 5;
	if (pathname.startsWith('/seguimientos')) return 6;
	if (pathname.startsWith('/alertas') || pathname.startsWith('/eventos')) return 7;
	if (pathname.startsWith('/reportes')) return 8;
	if (pathname.startsWith('/administracion') || pathname.startsWith('/configuracion')) return 9;
	return null;
}
