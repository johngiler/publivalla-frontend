"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import { HomeSpacesCatalogSkeleton } from "@/components/home/HomeSpacesCatalogSkeleton";
import { SpaceCardWithCart } from "@/components/space/SpaceCardWithCart";
import {
  EmptyState,
  EmptyStateIconSearchOff,
} from "@/components/ui/EmptyState";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { FilterClearAction } from "@/components/admin/AdminListFilters";
import { IconAdminChevronDown } from "@/components/admin/adminIcons";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  buildHomeCatalogCenterFacetsKey,
  buildHomeCatalogClientScopeFacetsKey,
  buildHomeCatalogFacetsKey,
  buildHomeCatalogPageKey,
  buildHomeCatalogTypeFacetsKey,
  homeCatalogCenterFacetsFetcher,
  homeCatalogClientScopeFacetsFetcher,
  homeCatalogFacetsFetcher,
  homeCatalogPageFetcher,
  homeCatalogTypeFacetsFetcher,
  homeCatalogSwrOptions,
} from "@/lib/swr/homeCatalogSwr";

const MINE_SCOPES = new Set(["favorites", "active", "cart", "reserved"]);

function heroAvailabilityLine(totalSpaces, locationCount, omitLocations) {
  const esp =
    totalSpaces === 1
      ? "1 espacio disponible"
      : `${totalSpaces} espacios disponibles`;
  if (omitLocations) return esp;
  const ubi =
    locationCount === 1 ? "1 ubicación" : `${locationCount} ubicaciones`;
  return `${esp} en ${ubi}`;
}

const chipBase =
  "mp-ring-brand inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ease-out focus-visible:outline-none active:scale-[0.97] sm:min-h-0 sm:py-1.5";

const chipOff =
  "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50";

const chipOn =
  "border-zinc-800 bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700/50 hover:border-zinc-700 hover:bg-zinc-700";

const filtersToggleBtn =
  "mp-ring-brand inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)] min-h-12 sm:min-h-11";

function facetLabel(item) {
  if (item && typeof item.label === "string" && item.label.trim() !== "")
    return item.label;
  if (item && typeof item.city === "string") return item.city;
  return "";
}

export function HomeSpacesCatalogClient() {
  const { authReady, isClient } = useAuth();
  const { displayName } = useWorkspace();
  const catalogAuthScope = authReady && isClient ? "client" : "guest";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const centerSlug = useMemo(
    () => (searchParams.get("center") || "").trim(),
    [searchParams],
  );
  const selectedMine = useMemo(() => {
    const m = (searchParams.get("mine") || "").trim().toLowerCase();
    return MINE_SCOPES.has(m) ? m : "";
  }, [searchParams]);
  const { items: cartItems } = useCart();
  const cartAdSpaceIds = useMemo(
    () =>
      cartItems
        .map((i) => Number(i.id))
        .filter((n) => Number.isFinite(n) && n > 0),
    [cartItems],
  );
  const filterUid = useId();
  const filtersPanelId = `${filterUid}-filters-panel`;

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 400);

  const pageKey = useMemo(
    () => [
      ...      buildHomeCatalogPageKey({
        search: debouncedQuery,
        city: selectedCity,
        center: centerSlug,
        type: selectedType,
        mine: selectedMine,
        cartIds: cartAdSpaceIds,
        page,
      }),
      catalogAuthScope,
    ],
    [
      debouncedQuery,
      selectedCity,
      centerSlug,
      selectedType,
      selectedMine,
      cartAdSpaceIds,
      page,
      catalogAuthScope,
    ],
  );
  const facetsKey = useMemo(
    () =>
      buildHomeCatalogFacetsKey({
        search: debouncedQuery,
        center: centerSlug,
        type: selectedType,
        mine: selectedMine,
        cartIds: cartAdSpaceIds,
      }),
    [debouncedQuery, centerSlug, selectedType, selectedMine, cartAdSpaceIds],
  );
  const centerFacetsKey = useMemo(
    () =>
      buildHomeCatalogCenterFacetsKey({
        search: debouncedQuery,
        city: selectedCity,
        type: selectedType,
        mine: selectedMine,
        cartIds: cartAdSpaceIds,
      }),
    [debouncedQuery, selectedCity, selectedType, selectedMine, cartAdSpaceIds],
  );
  const typeFacetsKey = useMemo(
    () =>
      buildHomeCatalogTypeFacetsKey({
        search: debouncedQuery,
        city: selectedCity,
        center: centerSlug,
        mine: selectedMine,
        cartIds: cartAdSpaceIds,
      }),
    [debouncedQuery, selectedCity, centerSlug, selectedMine, cartAdSpaceIds],
  );
  const clientScopeFacetsKey = useMemo(
    () =>
      isClient
        ? [
            ...buildHomeCatalogClientScopeFacetsKey({
              search: debouncedQuery,
              city: selectedCity,
              center: centerSlug,
              type: selectedType,
              cartIds: cartAdSpaceIds,
            }),
            catalogAuthScope,
          ]
        : null,
    [
      isClient,
      debouncedQuery,
      selectedCity,
      centerSlug,
      selectedType,
      cartAdSpaceIds,
      catalogAuthScope,
    ],
  );

  const {
    data: pageData,
    error: loadError,
    isLoading: pageLoading,
  } = useSWR(pageKey, homeCatalogPageFetcher, homeCatalogSwrOptions);

  const { data: facetsData, error: facetsError } = useSWR(
    facetsKey,
    homeCatalogFacetsFetcher,
    homeCatalogSwrOptions,
  );

  const { data: centerFacetsData, error: centerFacetsError } = useSWR(
    centerFacetsKey,
    homeCatalogCenterFacetsFetcher,
    homeCatalogSwrOptions,
  );

  const { data: typeFacetsData, error: typeFacetsError } = useSWR(
    typeFacetsKey,
    homeCatalogTypeFacetsFetcher,
    homeCatalogSwrOptions,
  );

  const { data: clientScopeFacetsData } = useSWR(
    clientScopeFacetsKey,
    homeCatalogClientScopeFacetsFetcher,
    homeCatalogSwrOptions,
  );

  const clientScopeFacets = useMemo(() => {
    const items = Array.isArray(clientScopeFacetsData?.items)
      ? clientScopeFacetsData.items
      : [];
    return items.filter(
      (row) =>
        row &&
        typeof row.scope === "string" &&
        MINE_SCOPES.has(row.scope.trim().toLowerCase()),
    );
  }, [clientScopeFacetsData]);

  const spaces = useMemo(
    () => (Array.isArray(pageData?.results) ? pageData.results : []),
    [pageData],
  );
  const totalCount = typeof pageData?.count === "number" ? pageData.count : 0;
  const facets = useMemo(() => {
    if (!facetsData || typeof facetsData !== "object")
      return { total: 0, items: [] };
    const total = typeof facetsData.total === "number" ? facetsData.total : 0;
    const items = Array.isArray(facetsData.items) ? facetsData.items : [];
    return { total, items };
  }, [facetsData]);

  const centerFacets = useMemo(() => {
    if (!centerFacetsData || typeof centerFacetsData !== "object")
      return { total: 0, items: [] };
    const total =
      typeof centerFacetsData.total === "number" ? centerFacetsData.total : 0;
    const items = Array.isArray(centerFacetsData.items)
      ? centerFacetsData.items
      : [];
    return { total, items };
  }, [centerFacetsData]);

  const typeFacets = useMemo(() => {
    if (!typeFacetsData || typeof typeFacetsData !== "object")
      return { total: 0, items: [] };
    const total =
      typeof typeFacetsData.total === "number" ? typeFacetsData.total : 0;
    const items = Array.isArray(typeFacetsData.items) ? typeFacetsData.items : [];
    return { total, items };
  }, [typeFacetsData]);

  const filtersActive = useMemo(
    () =>
      selectedCity.trim() !== "" ||
      query.trim() !== "" ||
      centerSlug !== "" ||
      selectedType.trim() !== "" ||
      selectedMine !== "",
    [selectedCity, query, centerSlug, selectedType, selectedMine],
  );

  const dataReady = pageData !== undefined || loadError != null;
  const showPageSkeleton = pageLoading && !pageData && loadError == null;

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, selectedCity, centerSlug, selectedType, selectedMine]);

  useEffect(() => {
    if (!authReady) return;
    const m = (searchParams.get("mine") || "").trim().toLowerCase();
    if (m && MINE_SCOPES.has(m) && !isClient) {
      const qs = searchParams.toString();
      const next = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [authReady, isClient, searchParams, pathname, router]);

  useEffect(() => {
    if (selectedMine) setFiltersPanelOpen(true);
  }, [selectedMine]);

  function setMineInUrl(nextMine) {
    const p = new URLSearchParams(searchParams.toString());
    const scope = (nextMine || "").trim().toLowerCase();
    if (scope && MINE_SCOPES.has(scope)) p.set("mine", scope);
    else p.delete("mine");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setSelectedCity("");
    setSelectedType("");
    setQuery("");
    setPage(1);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("center");
    p.delete("mine");
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const totalForPills = useMemo(() => {
    if (facets.total > 0 || facets.items.length > 0) return facets.total;
    if (loadError || !dataReady) return 0;
    if (selectedCity === "") return totalCount;
    return facets.total;
  }, [
    facets.total,
    facets.items.length,
    loadError,
    dataReady,
    selectedCity,
    totalCount,
  ]);

  const locationCount = facets.items.length;
  const heroOmitLocations =
    Boolean(facetsError) && locationCount === 0 && totalForPills > 0;
  const heroSummary = useMemo(
    () => heroAvailabilityLine(totalForPills, locationCount, heroOmitLocations),
    [totalForPills, locationCount, heroOmitLocations],
  );

  const showFacetsWarning = facetsError != null && loadError == null;
  const showCenterFacetsWarning =
    centerFacetsError != null && loadError == null;
  const showTypeFacetsWarning = typeFacetsError != null && loadError == null;

  function setCenterInUrl(nextSlug) {
    const p = new URLSearchParams(searchParams.toString());
    const s = (nextSlug || "").trim();
    if (s) p.set("center", s);
    else p.delete("center");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (showPageSkeleton) {
    return <HomeSpacesCatalogSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section
        className="space-y-4 sm:space-y-5"
        aria-labelledby="home-catalog-heading"
      >
        <div className="-mx-4 rounded-2xl px-4 pb-3 pt-5 sm:-mx-6 sm:rounded-3xl sm:px-6 sm:pb-4 sm:pt-6 lg:-mx-8 lg:px-8">
          <header className="max-w-3xl space-y-4">
            <div className="inline-flex w-max max-w-full flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-zinc-200/90 bg-white/80 px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.04] backdrop-blur-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Reserva de medios
              </span>
              <span
                className="hidden h-3 w-px shrink-0 bg-zinc-200 sm:block"
                aria-hidden
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
                {displayName}
              </span>
            </div>
            <h1
              id="home-catalog-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl sm:leading-[1.12]"
            >
              Espacios publicitarios
            </h1>
            <p className="text-[15px] leading-relaxed text-zinc-600 sm:text-base">
              {heroSummary}
            </p>
          </header>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <label htmlFor="space-search" className="sr-only">
            Buscar espacio o ubicación
          </label>
          <div className="flex items-stretch gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                aria-hidden
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </span>
              <input
                id="space-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, código o ubicación…"
                className="mp-form-field-accent min-h-12 w-full rounded-full border border-zinc-200 bg-white py-3 pl-11 pr-4 text-base text-zinc-900 placeholder:text-zinc-400 transition-[border-color,box-shadow] duration-200 ease-out focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)] sm:min-h-11 sm:text-sm"
                enterKeyHint="search"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              className={filtersToggleBtn}
              aria-expanded={filtersPanelOpen}
              aria-controls={filtersPanelId}
              onClick={() => setFiltersPanelOpen((v) => !v)}
            >
              <span className="whitespace-nowrap">Filtros</span>
              {filtersActive ? (
                <span
                  className="size-2 shrink-0 rounded-full bg-[color:var(--mp-primary)]"
                  aria-hidden
                />
              ) : null}
              <IconAdminChevronDown
                className={`h-[1.125rem] w-[1.125rem] shrink-0 text-zinc-600 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  filtersPanelOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
              filtersPanelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                id={filtersPanelId}
                className={`rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 shadow-sm ring-1 ring-zinc-950/[0.03] transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none sm:p-5 ${
                  filtersPanelOpen
                    ? "opacity-100 translate-y-0"
                    : "pointer-events-none opacity-0 -translate-y-1"
                }`}
                aria-hidden={!filtersPanelOpen}
                aria-label="Filtros por lo mío, ciudad, centro comercial y tipo de espacio publicitario"
              >
                {filtersActive ? (
                  <div className="mb-3 flex justify-end">
                    <FilterClearAction
                      onClick={clearFilters}
                      className="shrink-0 justify-center"
                    />
                  </div>
                ) : null}

                <div className="space-y-4">
                  {isClient ? (
                    <div>
                      <p
                        className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500"
                        id="home-filter-mine-label"
                      >
                        Lo mío
                      </p>
                      <div
                        className="mp-hide-scrollbar -mx-1 w-full overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] sm:-mx-0 sm:overflow-visible sm:px-0"
                        role="toolbar"
                        aria-labelledby="home-filter-mine-label"
                      >
                        <div className="flex w-max max-w-none flex-nowrap items-center gap-2 sm:w-full sm:flex-wrap">
                          {clientScopeFacets.map((item) => {
                            const scope =
                              typeof item.scope === "string"
                                ? item.scope.trim().toLowerCase()
                                : "";
                            const label =
                              typeof item.label === "string" && item.label.trim()
                                ? item.label.trim()
                                : scope;
                            const count =
                              typeof item.count === "number" ? item.count : 0;
                            const active = selectedMine === scope;
                            return (
                              <button
                                key={scope}
                                type="button"
                                title={`${label} · ${count} espacios`}
                                onClick={() =>
                                  setMineInUrl(active ? "" : scope)
                                }
                                className={`${chipBase} ${active ? chipOn : chipOff}`}
                              >
                                <span className="max-w-[11rem] truncate">
                                  {label}
                                </span>
                                <span
                                  className={
                                    active
                                      ? "tabular-nums text-zinc-200"
                                      : "tabular-nums font-medium text-zinc-400"
                                  }
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <p
                      className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500"
                      id="home-filter-city-label"
                    >
                      Ciudad
                    </p>
                    <div
                      className="mp-hide-scrollbar -mx-1 w-full overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] sm:-mx-0 sm:overflow-visible sm:px-0"
                      role="toolbar"
                      aria-labelledby="home-filter-city-label"
                    >
                      <div className="flex w-max max-w-none flex-nowrap items-center gap-2 sm:w-full sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedCity("")}
                          title={`Todas las ciudades · ${totalForPills} espacios`}
                          className={`${chipBase} ${selectedCity === "" ? chipOn : chipOff}`}
                        >
                          <span>Todas</span>
                          <span
                            className={
                              selectedCity === ""
                                ? "tabular-nums text-zinc-200"
                                : "tabular-nums font-medium text-zinc-400"
                            }
                          >
                            {totalForPills}
                          </span>
                        </button>
                        {facets.items.map((item) => {
                          const key =
                            typeof item.city === "string"
                              ? item.city
                              : String(item.city);
                          const label = facetLabel(item);
                          const active = selectedCity === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              title={`${label} · ${item.count} espacios`}
                              onClick={() => setSelectedCity(active ? "" : key)}
                              className={`${chipBase} ${active ? chipOn : chipOff}`}
                            >
                              <span className="max-w-[10rem] truncate">
                                {label}
                              </span>
                              <span
                                className={
                                  active
                                    ? "tabular-nums text-zinc-200"
                                    : "tabular-nums font-medium text-zinc-400"
                                }
                              >
                                {item.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p
                      className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500"
                      id="home-filter-center-label"
                    >
                      Centro comercial
                    </p>
                    <div
                      className="mp-hide-scrollbar -mx-1 w-full overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] sm:-mx-0 sm:overflow-visible sm:px-0"
                      role="toolbar"
                      aria-labelledby="home-filter-center-label"
                    >
                      <div className="flex w-max max-w-none flex-nowrap items-center gap-2 sm:w-full sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => setCenterInUrl("")}
                          title={`Todos los centros · ${centerFacets.total > 0 ? centerFacets.total : totalForPills} espacios`}
                          className={`${chipBase} ${centerSlug === "" ? chipOn : chipOff}`}
                        >
                          <span>Todos</span>
                          <span
                            className={
                              centerSlug === ""
                                ? "tabular-nums text-zinc-200"
                                : "tabular-nums font-medium text-zinc-400"
                            }
                          >
                            {centerFacets.total > 0
                              ? centerFacets.total
                              : totalForPills}
                          </span>
                        </button>
                        {centerFacets.items.map((item) => {
                          const slug =
                            typeof item.slug === "string"
                              ? item.slug.trim()
                              : "";
                          const label =
                            typeof item.name === "string" && item.name.trim()
                              ? item.name.trim()
                              : slug;
                          if (!slug) return null;
                          const active =
                            centerSlug.toLowerCase() === slug.toLowerCase();
                          return (
                            <button
                              key={slug}
                              type="button"
                              title={`${label} · ${item.count} espacios`}
                              onClick={() => setCenterInUrl(active ? "" : slug)}
                              className={`${chipBase} ${active ? chipOn : chipOff}`}
                            >
                              <span className="max-w-[12rem] truncate">
                                {label}
                              </span>
                              <span
                                className={
                                  active
                                    ? "tabular-nums text-zinc-200"
                                    : "tabular-nums font-medium text-zinc-400"
                                }
                              >
                                {item.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p
                      className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500"
                      id="home-filter-type-label"
                    >
                      Tipo de espacio publicitario
                    </p>
                    <div
                      className="mp-hide-scrollbar -mx-1 w-full overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] sm:-mx-0 sm:overflow-visible sm:px-0"
                      role="toolbar"
                      aria-labelledby="home-filter-type-label"
                    >
                      <div className="flex w-max max-w-none flex-nowrap items-center gap-2 sm:w-full sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedType("")}
                          title={`Todos los tipos · ${typeFacets.total > 0 ? typeFacets.total : totalForPills} espacios`}
                          className={`${chipBase} ${selectedType === "" ? chipOn : chipOff}`}
                        >
                          <span>Todos</span>
                          <span
                            className={
                              selectedType === ""
                                ? "tabular-nums text-zinc-200"
                                : "tabular-nums font-medium text-zinc-400"
                            }
                          >
                            {typeFacets.total > 0 ? typeFacets.total : totalForPills}
                          </span>
                        </button>
                        {typeFacets.items.map((item) => {
                          const typeKey =
                            typeof item.type === "string" ? item.type.trim() : "";
                          const label =
                            typeof item.label === "string" && item.label.trim()
                              ? item.label.trim()
                              : typeKey;
                          if (!typeKey) return null;
                          const active = selectedType === typeKey;
                          return (
                            <button
                              key={typeKey}
                              type="button"
                              title={`${label} · ${item.count} espacios`}
                              onClick={() => setSelectedType(active ? "" : typeKey)}
                              className={`${chipBase} ${active ? chipOn : chipOff}`}
                            >
                              <span className="max-w-[12rem] truncate">{label}</span>
                              <span
                                className={
                                  active
                                    ? "tabular-nums text-zinc-200"
                                    : "tabular-nums font-medium text-zinc-400"
                                }
                              >
                                {item.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showFacetsWarning ? (
            <p className="text-xs text-amber-800">
              No pudimos cargar los conteos por ciudad; igual puedes usar la
              lista y la búsqueda.
            </p>
          ) : null}
          {showCenterFacetsWarning ? (
            <p className="text-xs text-amber-800">
              No pudimos cargar los conteos por centro; el listado sigue
              disponible.
            </p>
          ) : null}
          {showTypeFacetsWarning ? (
            <p className="text-xs text-amber-800">
              No pudimos cargar los conteos por tipo; el listado sigue disponible.
            </p>
          ) : null}
        </div>
      </section>

      {loadError ? (
        <EmptyState
          icon={<EmptyStateIconSearchOff />}
          title="No pudimos cargar los espacios"
          description="Comprueba tu conexión e inténtalo de nuevo en unos minutos. Si el problema continúa, contacta a soporte."
        />
      ) : dataReady && totalCount === 0 && !filtersActive ? (
        <EmptyState
          icon={<EmptyStateIconSearchOff />}
          title="No hay espacios para mostrar"
          description="Todavía no hay tomas publicadas en el catálogo. Vuelve más tarde."
        />
      ) : dataReady && totalCount === 0 && filtersActive ? (
        <EmptyState
          icon={<EmptyStateIconSearchOff />}
          title="Nada coincide con tu búsqueda"
          description="Prueba otra búsqueda o abre Filtros para ajustar lo mío, ciudad, centro o tipo de espacio publicitario."
          action={
            <FilterClearAction
              onClick={clearFilters}
              className="mx-auto justify-center"
            />
          }
        />
      ) : (
        <div className="space-y-6">
          <ul className="grid list-none gap-[10px] p-0 sm:grid-cols-2 lg:grid-cols-4">
            {spaces.map((space, index) => (
              <li key={space.id} className="relative">
                <SpaceCardWithCart
                  space={space}
                  showFooterLink={false}
                  priority={index < 4}
                  showFavoriteButton
                />
              </li>
            ))}
          </ul>
          <AdminListPagination
            page={page}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
