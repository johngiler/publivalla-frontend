"use client";

import useSWR from "swr";

import { useAuth } from "@/context/AuthContext";
import { getAccessToken } from "@/lib/authStorage";
import { getSpace } from "@/services/api";

/**
 * Enriquece la toma con `client_months_*_by_year` cuando el visitante es cliente
 * autenticado (el detalle SSR no envía JWT).
 * @param {Record<string, unknown> | null | undefined} space
 */
export function useCatalogSpaceWithClientMonths(space) {
  const { authReady, isClient } = useAuth();
  const id = space?.id;
  const hasMonths =
    space?.client_months_reserved_by_year != null ||
    space?.client_months_active_by_year != null;
  const shouldFetch = Boolean(authReady && isClient && id && !hasMonths);

  const { data } = useSWR(
    shouldFetch ? ["catalog-space-client-months", id] : null,
    async () => {
      const token = getAccessToken();
      if (!token || id == null) return space;
      return getSpace(id, { token });
    },
    { dedupingInterval: 15_000, revalidateOnFocus: false },
  );

  return data ?? space;
}
