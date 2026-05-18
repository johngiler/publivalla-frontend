/** Rutas del panel admin (sin iconos). Una sola fuente para sidebar, validación de URL y footer. */
export const ADMIN_NAV_PATHS = [
  { segment: "resumen", href: "/dashboard", label: "Resumen" },
  { segment: "centros", href: "/dashboard/centros", label: "Centros comerciales" },
  {
    segment: "proveedores-montaje",
    href: "/dashboard/proveedores-montaje",
    label: "Proveedores de montaje",
  },
  { segment: "tomas", href: "/dashboard/tomas", label: "Tomas" },
  {
    segment: "bloqueos",
    href: "/dashboard/bloqueos",
    label: "Bloqueos de disponibilidad",
  },
  { segment: "usuarios", href: "/dashboard/usuarios", label: "Usuarios" },
  { segment: "clientes", href: "/dashboard/clientes", label: "Clientes" },
  { segment: "contratos", href: "/dashboard/contratos", label: "Contratos" },
  { segment: "pedidos", href: "/dashboard/pedidos", label: "Pedidos" },
];

export const ADMIN_SECTIONS = new Set(ADMIN_NAV_PATHS.map((n) => n.segment));
