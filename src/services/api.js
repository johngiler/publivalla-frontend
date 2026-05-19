import {
  workspaceSlugHeadersForFetch,
  workspaceSlugRequestHeaders,
} from "@/lib/tenant";
import { apiBase } from "@/lib/apiBase";

export { apiBase };
export { mediaAbsoluteUrl, normalizeMediaUrlForUi } from "@/lib/mediaUrls";

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const b = apiBase();
  return `${b}${p}`;
}

/** Parsea cuerpo JSON; si falla devuelve el string crudo. */
export function parseJsonText(text) {
  if (text == null || text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function parseFetchResponse(res) {
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    data: parseJsonText(text),
    text,
  };
}

/**
 * Convierte `next` absoluto de DRF en ruta relativa para `fetch`.
 * @param {string | null | undefined} next
 */
export function drfNextToRelativePath(next) {
  if (!next) return null;
  try {
    const u = new URL(next);
    return u.pathname + u.search;
  } catch {
    const s = String(next);
    return s.startsWith("/") ? s : null;
  }
}

/**
 * Respuesta paginada DRF (`count`, `next`, `previous`, `results`) o array.
 * @returns {{ results: Array<unknown>, count: number, next: string | null, previous: string | null }}
 */
export function parsePaginatedResponse(data) {
  if (data && Array.isArray(data.results)) {
    return {
      results: data.results,
      count: typeof data.count === "number" ? data.count : data.results.length,
      next: data.next ?? null,
      previous: data.previous ?? null,
    };
  }
  if (data && Array.isArray(data.spaces)) {
    return {
      results: data.spaces,
      count: data.spaces.length,
      next: null,
      previous: null,
    };
  }
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return { results: [], count: 0, next: null, previous: null };
}

/** Lista paginada DRF o array plano (solo el array `results`). */
export function normalizeListPayload(data) {
  return parsePaginatedResponse(data).results;
}

export async function fetchJson(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    next: options.next ?? { revalidate: 30 },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchJsonFirst(paths, options = {}) {
  let last = null;
  for (const path of paths) {
    try {
      return await fetchJson(path, options);
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Sigue enlaces `next` hasta agotar páginas (DRF).
 * @param {(path: string) => Promise<unknown>} fetchJsonFn
 * @param {string} firstPath
 */
export async function fetchAllPagesWithJson(fetchJsonFn, firstPath) {
  const all = [];
  let path = firstPath;
  while (path) {
    const data = await fetchJsonFn(path);
    const p = parsePaginatedResponse(data);
    all.push(...p.results);
    path = p.next ? drfNextToRelativePath(p.next) : null;
  }
  return all;
}

export async function getSpaces(centerSlug) {
  const slugHeaders = await workspaceSlugHeadersForFetch();
  const q =
    centerSlug != null && String(centerSlug).trim() !== ""
      ? `?center=${encodeURIComponent(String(centerSlug).trim())}`
      : "";
  const paths = [`/api/spaces${q}`, `/api/catalog/spaces${q}`];
  for (const path of paths) {
    try {
      return await fetchAllPagesWithJson(
        (p) => fetchJson(p, { headers: slugHeaders }),
        path,
      );
    } catch {
      /* try next base path */
    }
  }
  return [];
}

export async function getSpace(id, { token = null } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await workspaceSlugHeadersForFetch()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const sid = encodeURIComponent(String(id));
  const paths = [`/api/spaces/${sid}/`, `/api/catalog/spaces/${sid}/`];
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), {
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Carga la siguiente página de proveedores de montaje (`next` de la respuesta paginada DRF).
 * @param {string} nextPath URL absoluta o ruta relativa (`/api/catalog/...`)
 */
export async function fetchMountingProvidersPage(nextPath) {
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
  };
  const s = nextPath != null ? String(nextPath).trim() : "";
  if (!s) throw new Error("Sin página siguiente");
  let rel = s.startsWith("http") ? drfNextToRelativePath(s) : s;
  if (!rel) throw new Error("Sin página siguiente");

  async function doFetch(path) {
    const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
    const parsed = await parseFetchResponse(res);
    return { res, parsed };
  }

  let { res, parsed } = await doFetch(rel);
  if (!parsed.ok && res.status === 404 && rel.includes("/api/catalog/")) {
    const alt = rel.replace(/^\/api\/catalog\//, "/api/");
    ({ res, parsed } = await doFetch(alt));
  }
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsePaginatedResponse(parsed.data);
}

/**
 * Valida rango de fechas contra reservas y bloques (misma regla que al enviar la orden).
 * @param {string | number} spaceId
 * @param {{ start_date: string, end_date: string }} range ISO date (YYYY-MM-DD)
 * @returns {Promise<{ ok: boolean, detail?: string }>}
 */

export async function postSpaceRentalRangeCheck(
  spaceId,
  { start_date, end_date, rental_segments },
) {
  const body = JSON.stringify(
    Array.isArray(rental_segments) && rental_segments.length
      ? { rental_segments }
      : { start_date, end_date },
  );
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
  };
  const sid = encodeURIComponent(String(spaceId));
  const paths = [
    `/api/spaces/${sid}/check-rental-range/`,
    `/api/catalog/spaces/${sid}/check-rental-range/`,
  ];
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), {
        method: "POST",
        headers,
        body,
        cache: "no-store",
      });
      const parsed = await parseFetchResponse(res);
      if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
      return /** @type {{ ok: boolean, detail?: string }} */ (parsed.data);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/** @param {URLSearchParams} params @param {{ mine?: string, cartIds?: number[] }} scope */
function appendCatalogMineQuery(params, { mine = "", cartIds = [] } = {}) {
  const m = (mine || "").trim();
  if (m) params.set("mine", m);
  if (m === "cart" && Array.isArray(cartIds) && cartIds.length) {
    params.set("cart_ids", cartIds.map(String).join(","));
  }
}

/**
 * Portada: tomas paginadas con búsqueda y filtro por ciudad del centro.
 * @param {{ search?: string, city?: string, center?: string, type?: string, mine?: string, cartIds?: number[], page?: number, pageSize?: number }} params
 * @returns {Promise<{ results: Array<Record<string, unknown>>, count: number, next: string | null, previous: string | null }>}
 */
export async function getSpacesCatalogPage({
  search = "",
  city = "",
  center = "",
  type = "",
  mine = "",
  cartIds = [],
  page = 1,
  pageSize = 20,
  token = null,
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (pageSize && pageSize !== 20) params.set("page_size", String(pageSize));
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  if (center.trim()) params.set("center", center.trim());
  if (type.trim()) params.set("type", type.trim());
  appendCatalogMineQuery(params, { mine, cartIds });
  const qs = `?${params.toString()}`;
  const paths = [`/api/spaces/${qs}`, `/api/catalog/spaces/${qs}`];
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return parsePaginatedResponse(data);
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Conteos por ciudad para pills (respeta la misma búsqueda que el listado).
 * @param {{ search?: string, center?: string, type?: string, mine?: string, cartIds?: number[] }} params
 * @returns {Promise<{ total: number, items: Array<{ city: string, count: number, label?: string }> }>}
 */
export async function getSpacesLocationFacets({
  search = "",
  center = "",
  type = "",
  mine = "",
  cartIds = [],
} = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (center.trim()) params.set("center", center.trim());
  if (type.trim()) params.set("type", type.trim());
  appendCatalogMineQuery(params, { mine, cartIds });
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const paths = [
    `/api/spaces/location-facets/${suffix}`,
    `/api/catalog/spaces/location-facets/${suffix}`,
  ];
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
  };
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Conteos por centro comercial para pills en portada (slug + nombre).
 * @param {{ search?: string, city?: string, type?: string, mine?: string, cartIds?: number[] }} params
 * @returns {Promise<{ total: number, items: Array<{ slug: string, name: string, count: number }> }>}
 */
export async function getSpacesCenterFacets({
  search = "",
  city = "",
  type = "",
  mine = "",
  cartIds = [],
} = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  if (type.trim()) params.set("type", type.trim());
  appendCatalogMineQuery(params, { mine, cartIds });
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const paths = [
    `/api/spaces/center-facets/${suffix}`,
    `/api/catalog/spaces/center-facets/${suffix}`,
  ];
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
  };
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Conteos por tipo de toma para filtros en portada.
 * @param {{ search?: string, city?: string, center?: string, mine?: string, cartIds?: number[] }} params
 * @returns {Promise<{ total: number, items: Array<{ type: string, label: string, count: number }> }>}
 */
export async function getSpacesTypeFacets({
  search = "",
  city = "",
  center = "",
  mine = "",
  cartIds = [],
} = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  if (center.trim()) params.set("center", center.trim());
  appendCatalogMineQuery(params, { mine, cartIds });
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const paths = [
    `/api/spaces/type-facets${suffix}`,
    `/api/catalog/spaces/type-facets${suffix}`,
  ];
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
  };
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/**
 * Conteos para filtros de cuenta (favoritos, activos, carrito, reservas).
 * @param {{ search?: string, city?: string, center?: string, type?: string, cartIds?: number[], token?: string | null }} params
 * @returns {Promise<{ items: Array<{ scope: string, label: string, count: number }> }>}
 */
export async function getSpacesClientScopeFacets({
  search = "",
  city = "",
  center = "",
  type = "",
  cartIds = [],
  token = null,
} = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (city.trim()) params.set("city", city.trim());
  if (center.trim()) params.set("center", center.trim());
  if (type.trim()) params.set("type", type.trim());
  if (Array.isArray(cartIds) && cartIds.length) {
    params.set("cart_ids", cartIds.map(String).join(","));
  }
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  const paths = [
    `/api/spaces/client-scope-facets${suffix}`,
    `/api/catalog/spaces/client-scope-facets${suffix}`,
  ];
  const headers = {
    "Content-Type": "application/json",
    ...workspaceSlugRequestHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let last = null;
  for (const path of paths) {
    try {
      const res = await fetch(apiUrl(path), { headers, cache: "no-store" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw last ?? new Error("No hubo respuesta del servicio");
}

/** Detalle público por slug del centro comercial (URL amigable). */
export async function getCenterBySlug(slug) {
  const s = String(slug || "").trim();
  if (!s) throw new Error("Slug de centro vacío");
  const path = `/api/centers/${encodeURIComponent(s)}/`;
  const pathCatalog = `/api/catalog/centers/${encodeURIComponent(s)}/`;
  const headers = await workspaceSlugHeadersForFetch();
  return fetchJsonFirst([path, pathCatalog], { headers });
}

/** Mensaje amigable cuando el backend devuelve detalle técnico de JWT (p. ej. tras access expirado). */
function humanizeJwtAuthDetail(detail, status) {
  if (status !== 401) return null;
  const raw =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map(String).join(" ")
        : "";
  if (
    /not valid for any token type|token not valid|given token not valid|token is invalid|expired|signature has expired/i.test(
      raw,
    )
  ) {
    return "Tu sesión expiró o no es válida. Inicia sesión de nuevo.";
  }
  return null;
}

export function errorMessageFromParsed({ data, text, status }) {
  if (typeof data === "object" && data !== null) {
    const d = /** @type {Record<string, unknown>} */ (data).detail;
    const jwtMsg = humanizeJwtAuthDetail(d, status);
    if (jwtMsg) return jwtMsg;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d) && d.length)
      return d.map(String).filter(Boolean).join(" ");
    return JSON.stringify(data);
  }
  if (typeof data === "string" && data.trim()) {
    const jwtMsg = humanizeJwtAuthDetail(data, status);
    if (jwtMsg) return jwtMsg;
    return data.trim();
  }
  return text || `HTTP ${status}`;
}

/**
 * Mensaje legible desde cuerpo 400 de `/api/auth/validate-password/` u otros con clave `password`.
 * @param {unknown} data
 */
export function formatPasswordPolicyErrorBody(data) {
  if (data == null || typeof data !== "object") {
    return "La contraseña no cumple las reglas de seguridad.";
  }
  const p = /** @type {Record<string, unknown>} */ (data).password;
  if (Array.isArray(p)) {
    const s = p.map(String).filter(Boolean).join(" ");
    return s || "La contraseña no cumple las reglas de seguridad.";
  }
  if (typeof p === "string" && p.trim()) return p.trim();
  return "La contraseña no cumple las reglas de seguridad.";
}

/** Comprueba la contraseña con las mismas reglas que el backend (checkout / registro). */
export async function postValidatePassword(password) {
  const res = await fetch(apiUrl("/api/auth/validate-password/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(formatPasswordPolicyErrorBody(parsed.data));
  return parsed.data;
}

/**
 * Comprueba si el correo puede usarse al crear cuenta en checkout invitado (paso datos).
 * @param {string} email
 * @returns {Promise<{ available: boolean, detail?: string, code?: string }>}
 */
/**
 * Comprueba si el correo ya está asociado a un cliente del tenant (y si tiene cuenta marketplace).
 * @param {string} email
 * @returns {Promise<{ client_exists: boolean, has_marketplace_account: boolean }>}
 */
export async function postGuestCheckoutClientEmailCheck(email) {
  const res = await fetch(apiUrl("/api/checkout/guest/check-client-email/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return /** @type {{ client_exists: boolean, has_marketplace_account: boolean }} */ (
    parsed.data
  );
}

/**
 * Valida correo y razón social del checkout invitado (al pulsar Continuar en datos).
 * @param {{ email: string, company_name: string }} body
 * @returns {Promise<{ email: { client_exists: boolean, has_marketplace_account: boolean }, company: { client_exists: boolean, has_marketplace_account: boolean }, same_client: boolean }>}
 */
export async function postGuestCheckoutValidateDatos(body) {
  const res = await fetch(apiUrl("/api/checkout/guest/validate-datos/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return /** @type {{ email: { client_exists: boolean, has_marketplace_account: boolean }, company: { client_exists: boolean, has_marketplace_account: boolean }, same_client: boolean }} */ (
    parsed.data
  );
}

export async function postGuestCheckoutEmailAvailable(email) {
  const res = await fetch(apiUrl("/api/checkout/guest/check-email/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return /** @type {{ available: boolean, detail?: string, code?: string }} */ (
    parsed.data
  );
}

/**
 * Checkout sin sesión: empresa + orden enviada; opcional crear usuario marketplace.
 * Con comprobante: multipart (`payload` JSON + `payment_receipt`). Sin archivo: JSON.
 * @param {Record<string, unknown>} body
 * @param {{ receiptFile?: File | null }} [options]
 */
export async function postGuestCheckout(body, options = {}) {
  const receiptFile = options.receiptFile;
  const slugHeaders = workspaceSlugRequestHeaders();
  const isMultipart = Boolean(receiptFile);
  const headers = { ...slugHeaders };
  let fetchBody;
  if (isMultipart) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(body));
    fd.append("payment_receipt", receiptFile);
    fetchBody = fd;
  } else {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }
  const res = await fetch(apiUrl("/api/checkout/guest/"), {
    method: "POST",
    headers,
    body: fetchBody,
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

/** Activa cuenta con enlace del correo (tras aprobar orden). */
export async function postActivateClientAccount({ token, password }) {
  const res = await fetch(apiUrl("/api/auth/activate-client/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify({ token, password }),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

/** Datos del correo para el formulario de definir contraseña (enlace del administrador). */
export async function getPasswordSetupIntent(token) {
  const q = new URLSearchParams();
  q.set("token", String(token || "").trim());
  const res = await fetch(apiUrl(`/api/auth/password-setup-intent/?${q}`), {
    headers: { ...workspaceSlugRequestHeaders() },
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return /** @type {{ email: string }} */ (parsed.data);
}

/** Primera contraseña para usuario creado sin clave (token firmado). */
export async function postSetInitialPassword({
  token,
  password,
  password_confirm,
}) {
  const res = await fetch(apiUrl("/api/auth/set-initial-password/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
    },
    body: JSON.stringify({ token, password, password_confirm }),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

export async function postJson(path, body, options = {}) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}
