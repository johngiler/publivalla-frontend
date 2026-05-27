/** Rutas de listado admin con paginación y filtros (parámetros alineados con el backend). */

/**
 * @param {string} [excludeStatus] — p. ej. `active` (excluye ese estado del listado).
 */
export function ordersListPath(page, search, status, excludeStatus) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (status && status !== "all") p.set("status", status);
  const ex = (excludeStatus ?? "").trim();
  if (ex) p.set("exclude_status", ex);
  return `/api/orders/?${p.toString()}`;
}

/** Mismos filtros de búsqueda y estado que el listado; sin paginación (todos los resultados). */
export function ordersExportReportPath(search, status) {
  const p = new URLSearchParams();
  if (search.trim()) p.set("search", search.trim());
  if (status && status !== "all") p.set("status", status);
  const q = p.toString();
  return q ? `/api/orders/export-report/?${q}` : "/api/orders/export-report/";
}

export function clientsListPath(page, search, status) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (status && status !== "all") p.set("status", status);
  return `/api/clients/?${p.toString()}`;
}

export function usersAdminListPath(page, search, role) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (role && role !== "all") p.set("role", role);
  return `/api/admin/users/?${p.toString()}`;
}

export function centersAdminListPath(page, search, active, city) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (active && active !== "all") p.set("active", active);
  const c = (city ?? "").trim();
  if (c && c !== "all") p.set("city", c);
  return `/api/admin/centers/?${p.toString()}`;
}

export function spacesAdminListPath(page, search, status, shoppingCenterId) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (status && status !== "all") p.set("status", status);
  const cid =
    shoppingCenterId != null ? String(shoppingCenterId).trim() : "";
  if (cid && cid !== "all") p.set("shopping_center", cid);
  return `/api/admin/spaces/?${p.toString()}`;
}

/**
 * Contratos marketplace (líneas de pedido activo/vencido).
 * @param {string} ordering `-end_date` | `end_date` | `-start_date` | `start_date` | `client`
 * @param {string} [adSpaceId] — opcional; id numérico de toma
 */
/**
 * Proveedores de montaje del workspace.
 * @param {number|string} page
 * @param {number|string} [shoppingCenterId] — si se indica, filtra por centro.
 */
/**
 * Bloqueos de disponibilidad (tomas / fechas).
 * @param {number|string} page
 * @param {string} [search]
 * @param {string} [shoppingCenterId]
 * @param {string} [adSpaceId]
 * @param {string} [type] — `occupied` | `expired` | `all`
 * @param {string} [active] — `1` | `0` | `all`
 */
export function availabilityBlocksListPath(
  page,
  search,
  shoppingCenterId,
  adSpaceId,
  type,
  active,
) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", "50");
  if (search?.trim()) p.set("search", search.trim());
  const cid = shoppingCenterId != null ? String(shoppingCenterId).trim() : "";
  if (cid) p.set("shopping_center", cid);
  const aid = adSpaceId != null ? String(adSpaceId).trim() : "";
  if (aid) p.set("ad_space", aid);
  if (type && type !== "all") p.set("type", type);
  if (active === "1" || active === "0") p.set("active", active);
  return `/api/admin/availability-blocks/?${p.toString()}`;
}

export function mountingProvidersListPath(page, search, shoppingCenterId, active) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("page_size", "50");
  if (search?.trim()) p.set("search", search.trim());
  const cid = shoppingCenterId != null ? String(shoppingCenterId).trim() : "";
  if (cid && cid !== "all") p.set("shopping_center", cid);
  if (active === "1" || active === "0") p.set("active", active);
  return `/api/admin/mounting-providers/?${p.toString()}`;
}

export function contractsListPath(page, search, orderStatus, phase, endingWithin, ordering, adSpaceId) {
  const p = new URLSearchParams();
  p.set("page", String(page));
  if (search.trim()) p.set("search", search.trim());
  if (orderStatus && orderStatus !== "all") p.set("order_status", orderStatus);
  if (phase && phase !== "all") p.set("phase", phase);
  if (endingWithin && endingWithin !== "all") p.set("ending_within", endingWithin);
  if (ordering && ordering !== "-end_date") p.set("ordering", ordering);
  const aid = adSpaceId != null ? String(adSpaceId).trim() : "";
  if (aid) p.set("ad_space_id", aid);
  return `/api/admin/contracts/?${p.toString()}`;
}
