/** Etiquetas unificadas en panel (URL sigue en /dashboard/tomas). */
export const ADMIN_SPACES_LABEL = "Espacios publicitarios";
export const ADMIN_SPACE_LABEL_SINGULAR = "Espacio publicitario";

/**
 * Rutas del panel admin agrupadas por función (orden dentro de cada grupo).
 * Una sola fuente para sidebar, validación de URL y footer.
 */
export const ADMIN_NAV_GROUPS = [
  {
    id: "panel",
    label: null,
    items: [{ segment: "resumen", href: "/dashboard", label: "Resumen" }],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    items: [
      { segment: "centros", href: "/dashboard/centros", label: "Centros comerciales" },
      { segment: "tomas", href: "/dashboard/tomas", label: ADMIN_SPACES_LABEL },
    ],
  },
  {
    id: "cuentas",
    label: "Cuentas",
    items: [
      { segment: "usuarios", href: "/dashboard/usuarios", label: "Usuarios" },
      { segment: "clientes", href: "/dashboard/clientes", label: "Empresas" },
    ],
  },
  {
    id: "disponibilidad",
    label: "Disponibilidad",
    items: [
      {
        segment: "proveedores-montaje",
        href: "/dashboard/proveedores-montaje",
        label: "Proveedores de montaje",
      },
      {
        segment: "bloqueos",
        href: "/dashboard/bloqueos",
        label: "Bloqueos de disponibilidad",
      },
    ],
  },
  {
    id: "reservas",
    label: "Reservas y ventas",
    items: [
      { segment: "pujas", href: "/dashboard/pujas", label: "Pujas" },
      { segment: "pedidos", href: "/dashboard/pedidos", label: "Pedidos" },
      { segment: "contratos", href: "/dashboard/contratos", label: "Contratos" },
    ],
  },
];

export const ADMIN_NAV_PATHS = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export const ADMIN_SECTIONS = new Set(ADMIN_NAV_PATHS.map((n) => n.segment));
