import { storageKeySuffix } from "@/lib/tenant";

const LEGACY_ACCESS = "publivalla_access";
const LEGACY_REFRESH = "publivalla_refresh";

function keys() {
  const s = storageKeySuffix();
  return {
    access: `mp_access_${s}`,
    refresh: `mp_refresh_${s}`,
    me: `mp_me_${s}`,
  };
}

/** Perfil reciente para pintar el header al recargar sin esperar a `/me`. */
export function getCachedMe() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(keys().me);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedMe(me) {
  if (typeof window === "undefined") return;
  try {
    if (me && typeof me === "object") {
      sessionStorage.setItem(keys().me, JSON.stringify(me));
    } else {
      sessionStorage.removeItem(keys().me);
    }
  } catch {
    /* ignore */
  }
}

export function clearCachedMe() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(keys().me);
  } catch {
    /* ignore */
  }
}

/** Migra tokens antiguos (una sola vez por carga). */
export function clearLegacyAuthKeys() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_ACCESS);
    localStorage.removeItem(LEGACY_REFRESH);
  } catch {
    /* ignore */
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(keys().access);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(keys().refresh);
}

export function setTokens(access, refresh) {
  if (typeof window === "undefined") return;
  const k = keys();
  if (access) localStorage.setItem(k.access, access);
  else localStorage.removeItem(k.access);
  if (refresh) localStorage.setItem(k.refresh, refresh);
  else localStorage.removeItem(k.refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  const k = keys();
  localStorage.removeItem(k.access);
  localStorage.removeItem(k.refresh);
  clearCachedMe();
}
