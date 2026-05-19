/**
 * Enlaces de cuenta (pedidos, contratos, carrito) filtrados por código de toma.
 */

/**
 * @param {Record<string, boolean[]> | null | undefined} byYear
 */
export function spaceClientMonthsHasAny(byYear) {
  if (!byYear || typeof byYear !== "object") return false;
  return Object.values(byYear).some(
    (flags) => Array.isArray(flags) && flags.some(Boolean),
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} space
 */
export function spaceCodeForAccountLinks(space) {
  const raw =
    typeof space?.code === "string" ? space.code.trim() : String(space?.code ?? "").trim();
  return raw.replace(/^#/, "");
}

/** @param {string} code */
export function pedidosHrefForSpaceCode(code) {
  const p = new URLSearchParams();
  p.set("exclude_status", "active");
  const c = (code || "").trim();
  if (c) p.set("search", c);
  return `/cuenta/pedidos?${p.toString()}`;
}

/** @param {string} code — búsqueda por EP + vigentes (en curso y próximos, sin finalizados). */
export function contratosHrefForSpaceCode(code) {
  const p = new URLSearchParams();
  p.set("phase", "open");
  const c = (code || "").trim();
  if (c) p.set("search", c);
  return `/cuenta/contratos?${p.toString()}`;
}

/** @param {string} code */
export function cartHrefForSpaceCode(code) {
  const c = (code || "").trim();
  if (!c) return "/cart";
  return `/cart?code=${encodeURIComponent(c)}`;
}
