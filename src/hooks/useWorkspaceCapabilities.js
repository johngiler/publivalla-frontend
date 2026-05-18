"use client";

import useSWR from "swr";

import { useAuth } from "@/context/AuthContext";
import { authJsonFetcher } from "@/lib/swr/fetchers";

/**
 * Normaliza flags devueltos por GET /api/me/workspace/ (por defecto permisivos si faltan).
 * @param {Record<string, unknown> | null | undefined} data
 */
export function normalizeWorkspaceCapabilities(data) {
  if (!data || typeof data !== "object") {
    return {
      can_create_shopping_centers: true,
      can_create_ad_spaces: true,
      can_create_marketplace_admin_users: true,
    };
  }
  return {
    can_create_shopping_centers: data.can_create_shopping_centers !== false,
    can_create_ad_spaces: data.can_create_ad_spaces !== false,
    can_create_marketplace_admin_users: data.can_create_marketplace_admin_users !== false,
  };
}

/** Datos de permisos de creación del workspace del admin autenticado. */
export function useWorkspaceCapabilities() {
  const { authReady, accessToken, isAdmin } = useAuth();
  const key = authReady && accessToken && isAdmin ? "/api/me/workspace/" : null;
  const { data, error, isLoading } = useSWR(key, authJsonFetcher);
  const caps = normalizeWorkspaceCapabilities(data);
  return {
    loading: Boolean(key) && isLoading && data === undefined && error === undefined,
    caps,
    swrError: error,
  };
}
