import Link from "next/link";

/** Estilo alineado con enlaces de catálogo (`CatalogSpaceLink` variante texto). */
export const adminDashboardFilterLinkClass =
  "font-medium mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_85%,transparent)]";

export function dashboardCentrosSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/centros";
  return `/dashboard/centros?q=${encodeURIComponent(q)}`;
}

export function dashboardTomasSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/tomas";
  return `/dashboard/tomas?q=${encodeURIComponent(q)}`;
}

/** Abre el modal de detalle (solo lectura) de una toma en Espacios publicitarios. */
export function dashboardTomasViewHref(spaceId) {
  const id = String(spaceId ?? "").trim();
  if (!id) return "/dashboard/tomas";
  return `/dashboard/tomas?view=${encodeURIComponent(id)}`;
}

export function dashboardClientesSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/clientes";
  return `/dashboard/clientes?q=${encodeURIComponent(q)}`;
}

export function dashboardUsuariosSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/usuarios";
  return `/dashboard/usuarios?q=${encodeURIComponent(q)}`;
}

export function dashboardPedidosSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/pedidos";
  return `/dashboard/pedidos?q=${encodeURIComponent(q)}`;
}

export function dashboardContratosSearchHref(query) {
  const q = String(query ?? "").trim();
  if (!q) return "/dashboard/contratos";
  return `/dashboard/contratos?q=${encodeURIComponent(q)}`;
}

/** Enlace interno al listado admin con filtro `q` (evita propagación en filas de tabla). */
export function AdminDashboardFilterLink({ href, children, className = "", ...rest }) {
  return (
    <Link
      href={href}
      className={[adminDashboardFilterLinkClass, className].filter(Boolean).join(" ")}
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      {children}
    </Link>
  );
}
