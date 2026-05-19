/**
 * Claves y fetchers SWR del catálogo público de tomas (portada).
 * Permite revalidar desde el panel admin tras crear/editar/eliminar tomas.
 */

import {
  getSpacesCatalogPage,
  getSpacesCenterFacets,
  getSpacesClientScopeFacets,
  getSpacesLocationFacets,
  getSpacesTypeFacets,
} from "@/services/api";

export const HOME_CATALOG_CLIENT_SCOPE_FACETS_SWR_TAG =
  "home-catalog-client-scope-facets";

/** @param {number[]} cartIds */
export function cartIdsKeySegment(cartIds) {
  if (!Array.isArray(cartIds) || !cartIds.length) return "";
  return [...new Set(cartIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))]
    .sort((a, b) => a - b)
    .join(",");
}

export const HOME_CATALOG_PAGE_SWR_TAG = "home-catalog-page";
export const HOME_CATALOG_FACETS_SWR_TAG = "home-catalog-facets";
export const HOME_CATALOG_CENTER_FACETS_SWR_TAG = "home-catalog-center-facets";
export const HOME_CATALOG_TYPE_FACETS_SWR_TAG = "home-catalog-type-facets";

/**
 * Opciones del listado público del home.
 *
 * **No uses `revalidateOnMount: false` con SWR 2.x:** si está definido y es `false`, la primera
 * revalidación al montar **no se ejecuta** (`shouldDoInitialRevalidation` queda en false) y no hay
 * fetch hasta otro disparador (p. ej. foco de ventana). Eso dejaba el catálogo vacío hasta hacer focus.
 *
 * Para reducir refetch al volver a `/` con la misma clave (sin romper la primera carga), usa
 * `revalidateIfStale: false` en su lugar, no `revalidateOnMount: false`.
 */
export const homeCatalogSwrOptions = {
  keepPreviousData: true,
  dedupingInterval: 5_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

/**
 * @param {{ search?: string, city?: string, center?: string, type?: string, mine?: string, cartIds?: number[], page?: number }} p
 * @returns {readonly [string, string, string, string, string, string, string, number]}
 */
export function buildHomeCatalogPageKey({
  search = "",
  city = "",
  center = "",
  type = "",
  mine = "",
  cartIds = [],
  page = 1,
} = {}) {
  const pg = Number(page);
  return [
    HOME_CATALOG_PAGE_SWR_TAG,
    String(search),
    String(city),
    String(center),
    String(type),
    String(mine),
    cartIdsKeySegment(cartIds),
    Number.isFinite(pg) && pg > 0 ? pg : 1,
  ];
}

/**
 * @param {{ search?: string, center?: string, type?: string, mine?: string, cartIds?: number[] }} p
 * @returns {readonly [string, string, string, string, string, string]}
 */
export function buildHomeCatalogFacetsKey({
  search = "",
  center = "",
  type = "",
  mine = "",
  cartIds = [],
} = {}) {
  return [
    HOME_CATALOG_FACETS_SWR_TAG,
    String(search),
    String(center),
    String(type),
    String(mine),
    cartIdsKeySegment(cartIds),
  ];
}

/**
 * @param {{ search?: string, city?: string, type?: string, mine?: string, cartIds?: number[] }} p
 * @returns {readonly [string, string, string, string, string, string]}
 */
export function buildHomeCatalogCenterFacetsKey({
  search = "",
  city = "",
  type = "",
  mine = "",
  cartIds = [],
} = {}) {
  return [
    HOME_CATALOG_CENTER_FACETS_SWR_TAG,
    String(search),
    String(city),
    String(type),
    String(mine),
    cartIdsKeySegment(cartIds),
  ];
}

/**
 * @param {{ search?: string, city?: string, center?: string, mine?: string, cartIds?: number[] }} p
 * @returns {readonly [string, string, string, string, string, string]}
 */
export function buildHomeCatalogTypeFacetsKey({
  search = "",
  city = "",
  center = "",
  mine = "",
  cartIds = [],
} = {}) {
  return [
    HOME_CATALOG_TYPE_FACETS_SWR_TAG,
    String(search),
    String(city),
    String(center),
    String(mine),
    cartIdsKeySegment(cartIds),
  ];
}

/**
 * @param {{ search?: string, city?: string, center?: string, type?: string, cartIds?: number[] }} p
 * @returns {readonly [string, string, string, string, string, string]}
 */
export function buildHomeCatalogClientScopeFacetsKey({
  search = "",
  city = "",
  center = "",
  type = "",
  cartIds = [],
} = {}) {
  return [
    HOME_CATALOG_CLIENT_SCOPE_FACETS_SWR_TAG,
    String(search),
    String(city),
    String(center),
    String(type),
    cartIdsKeySegment(cartIds),
  ];
}

/** @param {readonly unknown[]} key */
export async function homeCatalogPageFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_PAGE_SWR_TAG) {
    throw new Error("homeCatalogPageFetcher: clave inválida");
  }
  const [, search, city, center, type, mine, cartIdsSeg, page, authScope] = key;
  const { getAccessToken } = await import("@/lib/authStorage");
  const token =
    authScope === "client" && typeof window !== "undefined"
      ? getAccessToken()
      : null;
  const cartIds = String(cartIdsSeg || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return getSpacesCatalogPage({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    center: /** @type {string} */ (center),
    type: /** @type {string} */ (type),
    mine: /** @type {string} */ (mine),
    cartIds,
    page: /** @type {number} */ (page),
    token,
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_FACETS_SWR_TAG) {
    throw new Error("homeCatalogFacetsFetcher: clave inválida");
  }
  const [, search, center, type, mine, cartIdsSeg] = key;
  const cartIds = String(cartIdsSeg || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return getSpacesLocationFacets({
    search: /** @type {string} */ (search),
    center: /** @type {string} */ (center),
    type: /** @type {string} */ (type),
    mine: /** @type {string} */ (mine),
    cartIds,
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogCenterFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_CENTER_FACETS_SWR_TAG) {
    throw new Error("homeCatalogCenterFacetsFetcher: clave inválida");
  }
  const [, search, city, type, mine, cartIdsSeg] = key;
  const cartIds = String(cartIdsSeg || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return getSpacesCenterFacets({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    type: /** @type {string} */ (type),
    mine: /** @type {string} */ (mine),
    cartIds,
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogTypeFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_TYPE_FACETS_SWR_TAG) {
    throw new Error("homeCatalogTypeFacetsFetcher: clave inválida");
  }
  const [, search, city, center, mine, cartIdsSeg] = key;
  const cartIds = String(cartIdsSeg || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return getSpacesTypeFacets({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    center: /** @type {string} */ (center),
    mine: /** @type {string} */ (mine),
    cartIds,
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogClientScopeFacetsFetcher(key) {
  if (
    !Array.isArray(key) ||
    key[0] !== HOME_CATALOG_CLIENT_SCOPE_FACETS_SWR_TAG
  ) {
    throw new Error("homeCatalogClientScopeFacetsFetcher: clave inválida");
  }
  const [, search, city, center, type, cartIdsSeg, authScope] = key;
  const { getAccessToken } = await import("@/lib/authStorage");
  const token =
    authScope === "client" && typeof window !== "undefined"
      ? getAccessToken()
      : null;
  const cartIds = String(cartIdsSeg || "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  return getSpacesClientScopeFacets({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    center: /** @type {string} */ (center),
    type: /** @type {string} */ (type),
    cartIds,
    token,
  });
}

/** Revalida listado y facets del home (pasa `mutate` de `useSWRConfig()`). */
export function revalidateHomeCatalog(mutate) {
  return mutate(
    (key) =>
      Array.isArray(key) &&
      (key[0] === HOME_CATALOG_PAGE_SWR_TAG ||
        key[0] === HOME_CATALOG_FACETS_SWR_TAG ||
        key[0] === HOME_CATALOG_CENTER_FACETS_SWR_TAG ||
        key[0] === HOME_CATALOG_TYPE_FACETS_SWR_TAG ||
        key[0] === HOME_CATALOG_CLIENT_SCOPE_FACETS_SWR_TAG),
    undefined,
    { revalidate: true },
  );
}
