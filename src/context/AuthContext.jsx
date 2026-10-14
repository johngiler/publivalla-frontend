"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { AUTH_TOKENS_CHANGED_EVENT } from "@/lib/authStorageSync";
import {
  clearCachedMe,
  clearLegacyAuthKeys,
  getAccessToken,
  getCachedMe,
  setCachedMe,
} from "@/lib/authStorage";
import { useRouter } from "next/navigation";

import { invalidateAllSwrCache } from "@/lib/swr/invalidate";
import {
  fetchMe,
  fetchMyCompany,
  loginRequest,
  logoutStorage,
  refreshAccessToken,
} from "@/services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [accessToken, setAccessTokenState] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [me, setMe] = useState(null);
  /** `undefined` = aún no cargado; `null` = sin ficha (204); objeto = empresa */
  const [company, setCompany] = useState(undefined);

  useLayoutEffect(() => {
    clearLegacyAuthKeys();
    const token = getAccessToken();
    setAccessTokenState(token);
    // Perfil en caché: evita un header vacío bajo el loader; sessionLoading
    // sigue en true hasta confirmar con el API (el overlay cubre la recarga).
    if (token) {
      const cached = getCachedMe();
      if (cached) setMe(cached);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromStorage = () => setAccessTokenState(getAccessToken());
    window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, syncFromStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      const token = accessToken;
      if (!token) {
        setMe(null);
        setCompany(undefined);
        clearCachedMe();
        setSessionLoading(false);
        return;
      }

      // Solo bloquear la UI en la primera carga. Si ya hay sesión, revalidar en silencio
      // (p. ej. al volver a la pestaña o al renovar el token) para no ocultar Panel/campana.
      if (me == null) setSessionLoading(true);

      try {
        let t = token;
        let m = await fetchMe(t);
        if (!m) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            t = refreshed;
            if (!cancelled) setAccessTokenState(refreshed);
            m = await fetchMe(refreshed);
          }
        }

        if (cancelled) return;
        // Mantener el perfil previo si la revalidación falla de forma transitoria
        // y aún hay token; solo limpiar cuando el API confirma que no hay sesión.
        if (m) {
          setMe(m);
          setCachedMe(m);
          setAccessTokenState(getAccessToken());
          const c = await fetchMyCompany(getAccessToken());
          if (cancelled) return;
          setCompany(c === undefined ? null : c);
        } else if (!getAccessToken()) {
          setMe(null);
          setCompany(undefined);
          clearCachedMe();
        }
      } catch {
        if (!cancelled && !getAccessToken()) {
          setMe(null);
          setCompany(undefined);
          clearCachedMe();
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `me` a propósito fuera de deps: solo evita el spinner en revalidaciones.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidar solo por token/hidratación
  }, [hydrated, accessToken]);

  const login = useCallback(async (username, password) => {
    await loginRequest(username, password);
    setAccessTokenState(getAccessToken());
    void invalidateAllSwrCache();
  }, []);

  const logout = useCallback(() => {
    void invalidateAllSwrCache();
    logoutStorage();
    clearCachedMe();
    setAccessTokenState(null);
    setMe(null);
    setCompany(undefined);
    router.push("/");
    router.refresh();
  }, [router]);

  const refreshSession = useCallback(() => {
    setAccessTokenState(getAccessToken());
  }, []);

  const setCompanyData = useCallback((c) => {
    setCompany(c);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = getAccessToken();
    if (!t) {
      setMe(null);
      setCompany(undefined);
      clearCachedMe();
      return null;
    }
    const m = await fetchMe(t);
    setMe(m);
    if (m) setCachedMe(m);
    else clearCachedMe();
    setAccessTokenState(getAccessToken());
    if (m) {
      const c = await fetchMyCompany(getAccessToken());
      setCompany(c === undefined ? null : c);
    } else {
      setCompany(undefined);
    }
    return m;
  }, []);

  /**
   * Rol desde `/api/auth/me/` (fuente de verdad). Nivel 1 (solo Django) no obtiene `me` (403) y se limpia sesión.
   * Nivel 2: admin; nivel 3: client.
   */
  const role = me?.role ?? null;
  const isAdmin = role === "admin";
  const isClient = role === "client";
  const hasCompanyProfile =
    company !== undefined && company !== null && typeof company === "object";

  const authReady = hydrated && !sessionLoading;

  const value = useMemo(
    () => ({
      hydrated,
      authReady,
      sessionLoading,
      accessToken,
      me,
      company,
      role,
      isAdmin,
      isClient,
      hasCompanyProfile,
      login,
      logout,
      refreshSession,
      refreshUser,
      setCompanyData,
    }),
    [
      hydrated,
      authReady,
      sessionLoading,
      accessToken,
      me,
      company,
      role,
      isAdmin,
      isClient,
      hasCompanyProfile,
      login,
      logout,
      refreshSession,
      refreshUser,
      setCompanyData,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
