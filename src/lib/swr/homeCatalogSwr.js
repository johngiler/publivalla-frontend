/**
 * Claves y fetchers SWR del catálogo público de tomas (portada).
 * Permite revalidar desde el panel admin tras crear/editar/eliminar tomas.
 */

import {
  getSpacesCatalogPage,
  getSpacesCenterFacets,
  getSpacesLocationFacets,
  getSpacesTypeFacets,
} from "@/services/api";

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
 * @param {{ search?: string, city?: string, center?: string, type?: string, page?: number }} p
 * @returns {readonly [string, string, string, string, string, number]}
 */
export function buildHomeCatalogPageKey({
  search = "",
  city = "",
  center = "",
  type = "",
  page = 1,
} = {}) {
  const pg = Number(page);
  return [
    HOME_CATALOG_PAGE_SWR_TAG,
    String(search),
    String(city),
    String(center),
    String(type),
    Number.isFinite(pg) && pg > 0 ? pg : 1,
  ];
}

/**
 * @param {{ search?: string, center?: string, type?: string }} p
 * @returns {readonly [string, string, string, string]}
 */
export function buildHomeCatalogFacetsKey({
  search = "",
  center = "",
  type = "",
} = {}) {
  return [HOME_CATALOG_FACETS_SWR_TAG, String(search), String(center), String(type)];
}

/**
 * @param {{ search?: string, city?: string, type?: string }} p
 * @returns {readonly [string, string, string, string]}
 */
export function buildHomeCatalogCenterFacetsKey({
  search = "",
  city = "",
  type = "",
} = {}) {
  return [HOME_CATALOG_CENTER_FACETS_SWR_TAG, String(search), String(city), String(type)];
}

/**
 * @param {{ search?: string, city?: string, center?: string }} p
 * @returns {readonly [string, string, string, string]}
 */
export function buildHomeCatalogTypeFacetsKey({
  search = "",
  city = "",
  center = "",
} = {}) {
  return [HOME_CATALOG_TYPE_FACETS_SWR_TAG, String(search), String(city), String(center)];
}

/** @param {readonly unknown[]} key */
export async function homeCatalogPageFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_PAGE_SWR_TAG) {
    throw new Error("homeCatalogPageFetcher: clave inválida");
  }
  const [, search, city, center, type, page] = key;
  return getSpacesCatalogPage({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    center: /** @type {string} */ (center),
    type: /** @type {string} */ (type),
    page: /** @type {number} */ (page),
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_FACETS_SWR_TAG) {
    throw new Error("homeCatalogFacetsFetcher: clave inválida");
  }
  const [, search, center, type] = key;
  return getSpacesLocationFacets({
    search: /** @type {string} */ (search),
    center: /** @type {string} */ (center),
    type: /** @type {string} */ (type),
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogCenterFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_CENTER_FACETS_SWR_TAG) {
    throw new Error("homeCatalogCenterFacetsFetcher: clave inválida");
  }
  const [, search, city, type] = key;
  return getSpacesCenterFacets({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    type: /** @type {string} */ (type),
  });
}

/** @param {readonly unknown[]} key */
export async function homeCatalogTypeFacetsFetcher(key) {
  if (!Array.isArray(key) || key[0] !== HOME_CATALOG_TYPE_FACETS_SWR_TAG) {
    throw new Error("homeCatalogTypeFacetsFetcher: clave inválida");
  }
  const [, search, city, center] = key;
  return getSpacesTypeFacets({
    search: /** @type {string} */ (search),
    city: /** @type {string} */ (city),
    center: /** @type {string} */ (center),
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
        key[0] === HOME_CATALOG_TYPE_FACETS_SWR_TAG),
    undefined,
    { revalidate: true },
  );
}
