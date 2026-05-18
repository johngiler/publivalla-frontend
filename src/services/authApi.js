import {
  apiUrl,
  drfNextToRelativePath,
  errorMessageFromParsed,
  parseFetchResponse,
  parsePaginatedResponse,
} from "@/services/api";
import { workspaceSlugRequestHeaders } from "@/lib/tenant";
import { emitAuthTokensChanged } from "@/lib/authStorageSync";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/authStorage";
import { decodeJwtPayload } from "@/lib/jwtDecode";

/** Simple JWT (es) suele decir “cuenta activa” también cuando la clave es incorrecta. */
function humanizeLoginError(detail) {
  const raw = Array.isArray(detail) ? detail.map(String).join(" ") : String(detail ?? "");
  if (
    raw.includes("cuenta activa") ||
    /no active account found with the given credentials/i.test(raw)
  ) {
    return "Usuario o contraseña incorrectos.";
  }
  if (raw.includes("Sesión no válida") && raw.includes("Inicia sesión")) {
    return "Sesión no válida. Inicia sesión de nuevo.";
  }
  return raw || "Credenciales inválidas";
}

async function fetchWithAuth(path, { method = "GET", body, token, _retry401 = false } = {}) {
  const t = token ?? getAccessToken();
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...workspaceSlugRequestHeaders(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (parsed.status === 401 && !_retry401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return fetchWithAuth(path, { method, body, _retry401: true });
    }
  }
  return parsed;
}

export async function loginRequest(username, password) {
  const url = apiUrl("/api/auth/token/");
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...workspaceSlugRequestHeaders(),
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Comprueba tu conexión a internet e inténtalo de nuevo. Si el problema continúa, contacta al administrador del sistema.",
    );
  }
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) {
    const { data } = parsed;
    const msg =
      typeof data === "object" && data?.detail != null
        ? humanizeLoginError(data.detail)
        : typeof data === "string"
          ? humanizeLoginError(data)
          : "Credenciales inválidas";
    throw new Error(msg);
  }
  setTokens(parsed.data.access, parsed.data.refresh);
  emitAuthTokensChanged();
  return parsed.data;
}

let refreshInFlight = null;

export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    let res;
    try {
      res = await fetch(apiUrl("/api/auth/token/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceSlugRequestHeaders(),
        },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    } catch {
      clearTokens();
      emitAuthTokensChanged();
      return null;
    }
    const parsed = await parseFetchResponse(res);
    if (!parsed.ok || !parsed.data?.access) {
      clearTokens();
      emitAuthTokensChanged();
      return null;
    }
    setTokens(parsed.data.access, getRefreshToken());
    emitAuthTokensChanged();
    return parsed.data.access;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function logoutStorage() {
  clearTokens();
  emitAuthTokensChanged();
}

export async function fetchMe(accessToken) {
  const token = accessToken ?? getAccessToken();
  if (!token) return null;
  let res;
  try {
    res = await fetch(apiUrl("/api/auth/me/"), {
      headers: {
        Authorization: `Bearer ${token}`,
        ...workspaceSlugRequestHeaders(),
      },
      cache: "no-store",
    });
  } catch {
    // Red, CORS, API caído o URL mal configurada → no propagar TypeError ("Failed to fetch").
    return null;
  }
  // 403: cuenta no autorizada en el marketplace (p. ej. solo Django / plataforma).
  // No limpiar en 401 aquí: el refresh del access sigue en AuthContext.
  if (res.status === 403) {
    clearTokens();
    return null;
  }
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** `body` JSON serializable o `FormData` (foto de perfil, remove_cover). */
export async function patchMe(body, { token } = {}) {
  const t = token ?? getAccessToken();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(apiUrl("/api/auth/me/"), {
    method: "PATCH",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...workspaceSlugRequestHeaders(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: isForm ? body : JSON.stringify(body),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

export async function changeMePassword({ old_password, new_password }, { token } = {}) {
  const parsed = await fetchWithAuth("/api/auth/me/password/", {
    method: "POST",
    body: { old_password, new_password },
    token,
  });
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

/** null = sin ficha; objeto = empresa */
export async function fetchMyCompany(accessToken) {
  const token = accessToken ?? getAccessToken();
  if (!token) return undefined;
  let res;
  try {
    res = await fetch(apiUrl("/api/me/company/"), {
      headers: {
        Authorization: `Bearer ${token}`,
        ...workspaceSlugRequestHeaders(),
      },
      cache: "no-store",
    });
  } catch {
    return undefined;
  }
  if (res.status === 204) return null;
  if (!res.ok) return undefined;
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** JSON o `FormData` (logo/foto de empresa y `remove_company_cover`). */
export async function saveMyCompany(payload, { method = "POST", token } = {}) {
  const t = token ?? getAccessToken();
  const isForm = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await fetch(apiUrl("/api/me/company/"), {
    method,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...workspaceSlugRequestHeaders(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: isForm ? payload : JSON.stringify(payload),
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (!parsed.ok) throw new Error(errorMessageFromParsed(parsed));
  return parsed.data;
}

/** Workspace del owner (solo rol admin marketplace). */
export async function fetchMyWorkspace({ token } = {}) {
  const t = token ?? getAccessToken();
  if (!t) return null;
  const res = await fetch(apiUrl("/api/me/workspace/"), {
    headers: {
      Authorization: `Bearer ${t}`,
      ...workspaceSlugRequestHeaders(),
    },
    cache: "no-store",
  });
  if (res.status === 403) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = `Error ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object" && j.detail != null) detail = String(j.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function patchMyWorkspace(formData, { token } = {}) {
  return authFetchForm("/api/me/workspace/", { method: "PATCH", formData, token });
}

async function pollTransactionalSmtpTestResult(taskId, { token, intervalMs = 700, maxWaitMs = 45000 } = {}) {
  const deadline = Date.now() + maxWaitMs;
  const enc = encodeURIComponent(taskId);
  while (Date.now() < deadline) {
    const parsed = await fetchWithAuth(
      `/api/me/workspace/test-transactional-smtp/status/${enc}/`,
      { method: "GET", token },
    );
    if (!parsed.ok) {
      throw new Error(errorMessageFromParsed(parsed));
    }
    const d = parsed.data;
    if (d && d.ready) {
      return {
        ok: Boolean(d.ok),
        detail: typeof d.detail === "string" ? d.detail : "",
        technical: d.technical != null ? String(d.technical) : null,
      };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    "Tiempo de espera al obtener el resultado de la prueba SMTP. Comprueba que el worker de Celery esté en ejecución.",
  );
}

/**
 * Prueba conexión/autenticación SMTP del workspace (no guarda ni envía correo).
 * Con broker Celery: el POST devuelve 202 y se hace polling hasta tener { ok, detail, technical }.
 * @returns {Promise<{ ok: boolean, detail: string, technical?: string | null }>}
 */
export async function testMyWorkspaceTransactionalSmtp(body, { token } = {}) {
  const parsed = await fetchWithAuth("/api/me/workspace/test-transactional-smtp/", {
    method: "POST",
    body,
    token,
  });
  if (!parsed.ok) {
    throw new Error(errorMessageFromParsed(parsed));
  }
  const data = parsed.data;
  if (data && data.queued === true && typeof data.task_id === "string" && data.task_id.length > 0) {
    return pollTransactionalSmtpTestResult(data.task_id, { token });
  }
  return data;
}

export async function authFetch(path, { method = "GET", body, token } = {}) {
  const parsed = await fetchWithAuth(path, { method, body, token });
  if (!parsed.ok) {
    const err = new Error(errorMessageFromParsed(parsed));
    err.status = parsed.status;
    err.data = parsed.data;
    throw err;
  }
  return parsed.data;
}

/**
 * GET binario (p. ej. Excel). Reintenta con refresh del access en 401.
 * @param {string} path Ruta relativa al API.
 */
export async function authFetchBlob(path, { token, _retry401 = false } = {}) {
  const t = token ?? getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: "GET",
    headers: {
      ...workspaceSlugRequestHeaders(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    cache: "no-store",
  });
  if (res.status === 401 && !_retry401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return authFetchBlob(path, { token: newAccess, _retry401: true });
    }
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = `Error ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === "object" && j.detail != null) msg = String(j.detail);
    } catch {
      if (text && text.length) msg = text.slice(0, 240);
    }
    throw new Error(msg);
  }
  return res.blob();
}

/** GET paginado: concatena todas las páginas (listados admin). */
export async function authFetchAllPages(path, { token } = {}) {
  const all = [];
  let next = path;
  while (next) {
    const data = await authFetch(next, { token });
    const p = parsePaginatedResponse(data);
    all.push(...p.results);
    next = p.next ? drfNextToRelativePath(p.next) : null;
  }
  return all;
}

/** Multipart (crear/editar con archivo). No fijar Content-Type. */
export async function authFetchForm(path, { method = "POST", formData, token, _retry401 = false } = {}) {
  const t = token ?? getAccessToken();
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      ...workspaceSlugRequestHeaders(),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: formData,
    cache: "no-store",
  });
  const parsed = await parseFetchResponse(res);
  if (parsed.status === 401 && !_retry401 && getRefreshToken()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return authFetchForm(path, { method, formData, _retry401: true });
    }
  }
  if (!parsed.ok) {
    const err = new Error(errorMessageFromParsed(parsed));
    err.status = parsed.status;
    err.data = parsed.data;
    throw err;
  }
  return parsed.data;
}

export { mediaAbsoluteUrl } from "@/lib/mediaUrls";

export function roleFromToken(access) {
  const p = decodeJwtPayload(access);
  return p?.role ?? null;
}
