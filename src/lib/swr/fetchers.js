import { workspaceSlugRequestHeaders } from "@/lib/tenant";
import { authFetch } from "@/services/authApi";
import { apiUrl, parseJsonText } from "@/services/api";

/** Clave SWR para el workspace público del tenant (solo cabecera `X-Workspace-Slug`). */
export const WORKSPACE_CURRENT_SWR_KEY = "/api/workspace/current/";

/**
 * Respuesta normalizada del workspace (sin lanzar en 404).
 * @param {string} url
 */
export async function workspaceCurrentFetcher(url) {
  const res = await fetch(apiUrl(url), {
    headers: { ...workspaceSlugRequestHeaders() },
  });
  const text = await res.text();
  const data = parseJsonText(text);
  if (res.status === 404) {
    return { workspaceStatus: "missing", workspace: null, workspaceFetchError: null };
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && !Array.isArray(data) && data.detail != null
        ? String(data.detail)
        : `Error ${res.status}`;
    throw new Error(detail);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Respuesta inválida del servidor.");
  }
  return { workspaceStatus: "ready", workspace: data, workspaceFetchError: null };
}

/**
 * GET JSON con JWT + cabeceras de workspace (listados y detalles autenticados).
 * La clave debe ser la ruta relativa al API, p. ej. `/api/orders/?page=1`.
 * @param {string} path
 */
export async function authJsonFetcher(path) {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("authJsonFetcher: la clave debe ser una ruta que empiece con /");
  }
  return authFetch(path);
}

/** Usuario autenticado (`/api/auth/me/`). */
export const AUTH_ME_SWR_KEY = "/api/auth/me/";

/** Ficha de empresa del cliente en sesión (`/api/me/company/`; 204 → `null`). */
export const MY_COMPANY_SWR_KEY = "/api/me/company/";
export const MY_COMPANY_MEMBERS_SWR_KEY = "/api/me/company/members/";

/** Centros admin: todas las páginas (selectores y filtros). */
export const ADMIN_CENTERS_ALL_SWR_KEY = ["GET", "admin", "centers", "all-pages"];

export async function adminCentersAllPagesFetcher() {
  const { authFetchAllPages } = await import("@/services/authApi");
  return authFetchAllPages("/api/admin/centers/?page_size=100");
}

/** Tomas admin: todas las páginas (selectores en bloqueos). */
export const ADMIN_SPACES_ALL_SWR_KEY = ["GET", "admin", "spaces", "all-pages"];

export async function adminSpacesAllPagesFetcher() {
  const { authFetchAllPages } = await import("@/services/authApi");
  return authFetchAllPages("/api/admin/spaces/?page_size=100");
}

/** Clientes (API autenticado): todas las páginas (selectores en usuarios). */
export const ADMIN_CLIENTS_ALL_SWR_KEY = ["GET", "clients", "all-pages"];

export async function adminClientsAllPagesFetcher() {
  const { authFetchAllPages } = await import("@/services/authApi");
  return authFetchAllPages("/api/clients/?page_size=100");
}
