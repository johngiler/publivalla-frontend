"use client";

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailSection,
} from "@/components/admin/AdminAccordionDetail";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminCopyIconButton } from "@/components/admin/AdminCopyIconButton";
import {
  adminDashboardMainWidthClass,
  adminPanelCard,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import {
  AdminFilterClearButton,
  AdminFiltersRow,
  AdminFilterSearchInput,
  AdminFilterSelect,
  FilterClearAction,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { AdminListQuerySync } from "@/components/admin/AdminListQuerySync";
import { orderStatusPillClassName } from "@/components/admin/adminConstants";
import { IconAdminContract } from "@/components/admin/adminIcons";
import { ContratosSectionSkeleton } from "@/components/admin/skeletons/ContratosSectionSkeleton";
import { CatalogSpaceLink } from "@/components/catalog/CatalogSpaceLink";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { EmptyState, EmptyStateIconClipboard } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import {
  AdminDashboardFilterLink,
  dashboardClientesSearchHref,
  dashboardPedidosSearchHref,
} from "@/lib/adminDashboardLinks";
import { contractsListPath } from "@/lib/adminListQuery";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { mediaUrlForUiWithWebp, primaryAdSpaceMediaRawFromOrderLike } from "@/lib/mediaUrls";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  squareAdminTablePortadaFrameClass,
  squareAdminTablePortadaImgClass,
  squareListImagePreviewButtonRingClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";

const ORDER_STATUS_OPTIONS = [
  { v: "all", l: "Todos" },
  { v: "active", l: "Pedido activo" },
  { v: "expired", l: "Pedido vencido" },
];

const PHASE_OPTIONS = [
  { v: "all", l: "Todas las fases" },
  { v: "running", l: "En curso (periodo actual)" },
  { v: "upcoming", l: "Próximas (aún no inicia)" },
  { v: "ended", l: "Finalizadas" },
];

const ENDING_WITHIN_OPTIONS = [
  { v: "all", l: "Cualquier fin" },
  { v: "7", l: "Fin en ≤ 7 días" },
  { v: "30", l: "Fin en ≤ 30 días" },
  { v: "90", l: "Fin en ≤ 90 días" },
];

const ORDERING_OPTIONS = [
  { v: "-end_date", l: "Fin: más lejano primero" },
  { v: "end_date", l: "Fin: más próximo (por vencer)" },
  { v: "-start_date", l: "Inicio: más reciente" },
  { v: "start_date", l: "Inicio: más antiguo" },
  { v: "client", l: "Cliente (A→Z)" },
];

function formatContractDay(value) {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, d] = s.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("es-VE", { dateStyle: "medium" });
  }
  return s;
}

function kindLabel(kind) {
  if (kind === "running") return "En curso";
  if (kind === "upcoming") return "Próxima";
  if (kind === "ended") return "Finalizada";
  return kind;
}

function kindPillClass(kind) {
  if (kind === "running") return "border-emerald-200/90 bg-emerald-50 text-emerald-900";
  if (kind === "upcoming") return "border-sky-200/90 bg-sky-50 text-sky-900";
  if (kind === "ended") return "border-zinc-200/90 bg-zinc-100 text-zinc-700";
  return "border-zinc-200/90 bg-zinc-50 text-zinc-800";
}

function formatUsdMoney(value) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function contractLineLightboxItems(it) {
  const label =
    typeof it?.ad_space_title === "string" && it.ad_space_title.trim()
      ? it.ad_space_title.trim()
      : it?.ad_space_code
        ? String(it.ad_space_code)
        : "Toma";
  const out = [];
  if (Array.isArray(it?.ad_space_gallery_images) && it.ad_space_gallery_images.length > 0) {
    const seenSrc = new Set();
    let idx = 0;
    for (const u of it.ad_space_gallery_images) {
      if (typeof u !== "string" || !u.trim()) continue;
      const src = mediaUrlForUiWithWebp(u.trim());
      if (!src || seenSrc.has(src)) continue;
      seenSrc.add(src);
      idx += 1;
      out.push({
        src,
        alt: idx > 1 ? `Imagen ${idx} · ${label}` : `Portada · ${label}`,
        thumbnailSrc: src,
      });
    }
    if (out.length > 0) return out;
  }
  if (!it?.ad_space_cover_image) return out;
  const src = mediaUrlForUiWithWebp(it.ad_space_cover_image);
  if (!src) return out;
  out.push({
    src,
    alt: `Portada · ${label}`,
    thumbnailSrc: src,
  });
  return out;
}

function contractLineImageCount(it) {
  return contractLineLightboxItems(it).length;
}

function ContratosUrlPhaseSyncInner({ onPhase }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const ph = (searchParams.get("phase") || "").trim().toLowerCase();
    if (ph === "running" || ph === "upcoming" || ph === "ended" || ph === "all") {
      onPhase(ph);
    }
  }, [searchParams, onPhase]);
  return null;
}

/** Aplica `?phase=` de la URL (p. ej. enlace desde la tarjeta KPI del resumen). */
function ContratosUrlPhaseSync({ onPhase }) {
  return (
    <Suspense fallback={null}>
      <ContratosUrlPhaseSyncInner onPhase={onPhase} />
    </Suspense>
  );
}

function ContractTimelineBar({ row }) {
  const kind = row.contract_row_kind;
  const ratio = row.period_elapsed_ratio != null ? Number(row.period_elapsed_ratio) : 0;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const pct = Math.round(clamped * 100);

  if (kind === "upcoming") {
    return (
      <div className="min-w-[10rem] max-w-[18rem] space-y-1.5">
        <div className="flex justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          <span className="min-w-0 truncate">Periodo sin iniciar</span>
          {row.days_until_start != null ? (
            <span className="shrink-0 tabular-nums">En {row.days_until_start} d</span>
          ) : null}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-sky-100 ring-1 ring-sky-200/80">
          <div className="h-full w-[5%] rounded-full bg-sky-500/90" aria-hidden />
        </div>
      </div>
    );
  }

  if (kind === "ended") {
    return (
      <div className="min-w-[10rem] max-w-[18rem] space-y-1.5">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          <span>Periodo cerrado</span>
          <span className="tabular-nums">100%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 ring-1 ring-zinc-300/60">
          <div className="h-full w-full rounded-full bg-zinc-400/85" aria-hidden />
        </div>
      </div>
    );
  }

  const dr = row.days_remaining;
  return (
    <div className="min-w-[10rem] max-w-[18rem] space-y-1.5">
      <div className="flex justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-900/85">
        <span className="min-w-0 truncate">Avance del periodo</span>
        <span className="shrink-0 tabular-nums">
          {dr != null ? `${dr} d restantes` : `${pct}%`}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-emerald-100 ring-1 ring-emerald-200/70"
        title={`Aproximadamente ${pct}% del periodo transcurrido`}
      >
        <div
          className="h-full min-w-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ContratosAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterEnding, setFilterEnding] = useState("all");
  const [filterOrdering, setFilterOrdering] = useState("-end_date");
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const [galleryLightbox, setGalleryLightbox] = useState({
    open: false,
    items: [],
    initialIndex: 0,
  });
  const [err, setErr] = useState("");

  const listKey =
    authReady && accessToken
      ? contractsListPath(
          page,
          debouncedFilterQ,
          filterOrderStatus,
          filterPhase,
          filterEnding,
          filterOrdering,
          "",
        )
      : null;
  const { data, error: swrError, isLoading } = useSWR(listKey, authJsonFetcher, {
    keepPreviousData: true,
  });

  const rows = useMemo(() => (data ? parsePaginatedResponse(data).results : []), [data]);
  const totalCount = useMemo(() => (data ? parsePaginatedResponse(data).count : 0), [data]);
  const summary = data?.summary;

  useEffect(() => {
    setErr(swrError ? (swrError instanceof Error ? swrError.message : String(swrError)) : "");
  }, [swrError]);

  const filtersActive =
    debouncedFilterQ.trim() !== "" ||
    filterOrderStatus !== "all" ||
    filterPhase !== "all" ||
    filterEnding !== "all" ||
    filterOrdering !== "-end_date";

  useEffect(() => {
    setPage(1);
  }, [
    debouncedFilterQ,
    filterOrderStatus,
    filterPhase,
    filterEnding,
    filterOrdering,
  ]);

  useEffect(() => {
    setExpandedId(null);
  }, [listKey]);

  const openLineGallery = useCallback((it) => {
    const items = contractLineLightboxItems(it);
    if (!items.length) return;
    setGalleryLightbox({ open: true, items, initialIndex: 0 });
  }, []);

  /** No usar `isLoading` aquí: al cambiar la clave SWR la nueva entrada arranca sin caché y `isLoading` pasa a true, se muestra el skeleton y el input de búsqueda pierde el foco. Con `keepPreviousData`, `data` sigue definido salvo la primera carga. */
  const showBlockingSkeleton =
    Boolean(authReady && accessToken && listKey) &&
    data === undefined &&
    swrError === undefined &&
    isLoading;

  if (!authReady || !accessToken) {
    return (
      <div className={`${adminDashboardMainWidthClass} py-16 text-center text-sm text-zinc-500`}>
        Cargando…
      </div>
    );
  }

  if (showBlockingSkeleton) {
    return (
      <div className={adminPanelCard}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`hidden shrink-0 animate-pulse sm:block sm:size-14 ${ROUNDED_CONTROL} bg-zinc-200/80`}
              aria-hidden
            />
            <div className="space-y-2">
              <div className={`h-7 w-40 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`} />
              <div className={`h-4 w-56 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`} />
            </div>
          </div>
        </div>
        <ContratosSectionSkeleton />
      </div>
    );
  }

  return (
    <>
      <ContratosUrlPhaseSync onPhase={setFilterPhase} />
      <AdminListQuerySync onQuery={setFilterQ} />
      <div className={adminPanelCard}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconAdminContract className="!h-8 !w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Contratos</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {totalCount} línea{totalCount === 1 ? "" : "s"} · pedidos activos o vencidos
              </p>
            </div>
          </div>
        </div>

        {summary ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-gradient-to-br from-white to-zinc-50/90 p-4 shadow-sm`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Líneas totales</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{summary.lines_total ?? "—"}</p>
              <p className="mt-1 text-xs text-zinc-500">Workspace (sin filtros de tabla)</p>
            </div>
            <div
              className={`${ROUNDED_CONTROL} border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 p-4 shadow-sm`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/80">En curso ahora</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">{summary.running ?? "—"}</p>
              <p className="mt-1 text-xs text-emerald-900/70">Periodo vigente hoy</p>
            </div>
            <div
              className={`${ROUNDED_CONTROL} border border-amber-200/85 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/25 p-4 shadow-sm`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-950/85">Fin en 30 días</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
                {summary.ending_within_30_days ?? "—"}
              </p>
              <p className="mt-1 text-xs text-amber-900/75">Líneas activas por vencer</p>
            </div>
            <div
              className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-gradient-to-br from-zinc-50 to-zinc-100/50 p-4 shadow-sm`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-600">Finalizadas</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-800">{summary.ended ?? "—"}</p>
              <p className="mt-1 text-xs text-zinc-500">Cerradas o pedido vencido</p>
            </div>
          </div>
        ) : null}

        {err ? (
          <p className={`mb-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
            {err}
          </p>
        ) : null}

        {totalCount === 0 && !filtersActive ? (
          <EmptyState
            icon={<EmptyStateIconClipboard />}
            title="No hay contratos"
            description="Cuando existan pedidos activos o vencidos con líneas reservadas, aparecerán aquí con una vista de periodo y ocupación."
          />
        ) : (
          <>
            <AdminFiltersRow>
              <div className="w-full min-w-0 shrink-0 basis-full">
                <AdminFilterSearchInput
                  id="contratos-filter-q"
                  value={filterQ}
                  onChange={setFilterQ}
                  placeholder="Cliente, pedido, código de toma (ej. DEMO-T5A o DEMO - T5A)…"
                />
              </div>
              <AdminFilterSelect
                id="contratos-filter-order-status"
                label="Pedido"
                value={filterOrderStatus}
                onChange={setFilterOrderStatus}
                options={ORDER_STATUS_OPTIONS}
              />
              <AdminFilterSelect
                id="contratos-filter-phase"
                label="Fase del periodo"
                value={filterPhase}
                onChange={setFilterPhase}
                options={PHASE_OPTIONS}
              />
              <AdminFilterSelect
                id="contratos-filter-ending"
                label="Fin próximo"
                value={filterEnding}
                onChange={setFilterEnding}
                options={ENDING_WITHIN_OPTIONS}
              />
              <AdminFilterSelect
                id="contratos-filter-ordering"
                label="Ordenar"
                value={filterOrdering}
                onChange={setFilterOrdering}
                options={ORDERING_OPTIONS}
              />
              <AdminFilterClearButton
                show={filtersActive}
                onClick={() => {
                  setFilterQ("");
                  setFilterOrderStatus("all");
                  setFilterPhase("all");
                  setFilterEnding("all");
                  setFilterOrdering("-end_date");
                  setPage(1);
                }}
              />
            </AdminFiltersRow>

            <p className="mb-3 text-xs text-zinc-500">
              Las tarjetas de arriba son totales del workspace. La tabla aplica los filtros que selecciones.
            </p>

            {rows.length === 0 && filtersActive ? (
              <div className="mt-4 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ninguna línea coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction
                    onClick={() => {
                      setFilterQ("");
                      setFilterOrderStatus("all");
                      setFilterPhase("all");
                      setFilterEnding("all");
                      setFilterOrdering("-end_date");
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {rows.length > 0 ? (
              <div className={`min-w-0 overflow-x-auto ${ROUNDED_CONTROL} border border-zinc-200`}>
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr className="border-b border-zinc-200/80">
                      <th className="w-10 px-2 py-3" aria-hidden />
                      <th className="w-14 px-2 py-2">Foto</th>
                      <th className="min-w-[11rem] max-w-[18rem] px-3 py-2">Toma</th>
                      <th className="min-w-[9rem] max-w-[16rem] px-3 py-2">Cliente</th>
                      <th className="min-w-[14rem] px-3 py-2">Línea de tiempo / ocupación</th>
                      <th className="min-w-[8rem] px-3 py-2">Pedido</th>
                      <th className="min-w-[7rem] px-3 py-2 text-end">Estados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((it) => {
                      const open = expandedId === it.id;
                      const panelId = `contrato-extra-${it.id}`;
                      const coverRaw = primaryAdSpaceMediaRawFromOrderLike(it);
                      const nImg = contractLineImageCount(it);
                      const orderRef =
                        typeof it.order_code === "string" && it.order_code.trim()
                          ? it.order_code.trim()
                          : "";
                      const clientName = (it.client_company_name || "").trim();
                      return (
                        <Fragment key={`${it.order_id}-${it.id}`}>
                          <tr className="border-t border-zinc-100">
                            <td className="px-2 py-2 align-middle">
                              <AdminAccordionToggle
                                expanded={open}
                                onToggle={() => setExpandedId(open ? null : it.id)}
                                rowId={it.id}
                                controlsId={panelId}
                              />
                            </td>
                            <td className="px-2 py-2 align-middle">
                              {nImg > 0 && coverRaw ? (
                                <button
                                  type="button"
                                  onClick={() => openLineGallery(it)}
                                  className={`${squareAdminTablePortadaFrameClass} ${squareListImagePreviewButtonRingClass} p-0`}
                                  aria-label={
                                    nImg > 1
                                      ? `Abrir galería (${nImg} imágenes)`
                                      : "Abrir imagen ampliada"
                                  }
                                >
                                  <RasterFromApiUrl
                                    url={coverRaw}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className={`${squareAdminTablePortadaImgClass} transition duration-200 group-hover:scale-105`}
                                    {...catalogRasterImgAttrs}
                                  />
                                </button>
                              ) : (
                                <span className="inline-flex size-12 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-zinc-400">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="max-w-[14rem] px-3 py-2 align-middle">
                              <CatalogSpaceLink
                                spaceId={it.ad_space_id}
                                className="line-clamp-2 font-semibold text-zinc-900 no-underline hover:underline"
                              >
                                {it.ad_space_title || it.ad_space_code}
                              </CatalogSpaceLink>
                              <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{it.ad_space_code}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                                {it.shopping_center_name}
                                {it.shopping_center_city ? ` · ${it.shopping_center_city}` : ""}
                              </p>
                            </td>
                            <td className="max-w-[12rem] px-3 py-2 align-middle">
                              {clientName ? (
                                <AdminDashboardFilterLink
                                  href={dashboardClientesSearchHref(clientName)}
                                  className="line-clamp-2 block text-sm font-medium"
                                  title={clientName}
                                >
                                  {clientName}
                                </AdminDashboardFilterLink>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <ContractTimelineBar row={it} />
                              <p className="mt-2 text-[11px] tabular-nums text-zinc-600">
                                {formatContractDay(it.start_date)} → {formatContractDay(it.end_date)}
                              </p>
                            </td>
                            <td className="max-w-[10rem] px-3 py-2 align-middle">
                              <div className="flex items-center gap-1">
                                <AdminDashboardFilterLink
                                  href={dashboardPedidosSearchHref(
                                    orderRef ? orderRef.replace(/^#/, "") : String(it.order_id),
                                  )}
                                  className="min-w-0 flex-1 break-all font-mono text-xs font-semibold"
                                >
                                  {orderRef || `#${it.order_id}`}
                                </AdminDashboardFilterLink>
                                <AdminCopyIconButton
                                  value={orderRef || `#${it.order_id}`}
                                  ariaLabel="Copiar referencia del pedido"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 align-middle text-end">
                              <div className="flex flex-col items-end gap-1.5">
                                <span
                                  className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[10px] font-semibold ${kindPillClass(it.contract_row_kind)}`}
                                >
                                  {kindLabel(it.contract_row_kind)}
                                </span>
                                <span
                                  className={`inline-flex max-w-full rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold shadow-sm ${orderStatusPillClassName(it.order_status)}`}
                                >
                                  {it.order_status_label || it.order_status}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {open ? (
                            <AdminAccordionRowPanel colSpan={7} panelId={panelId}>
                              <AdminDetailInset className="space-y-4">
                                <AdminAccordionDetailHeader
                                  titleLabel="Línea de contrato"
                                  titleLine={`${it.ad_space_code} — ${it.ad_space_title || "Toma"}`}
                                  hint={clientName || undefined}
                                />
                                <AdminDetailSection panelId={panelId} sectionId="econom" title="Importes">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <AdminDetailField label="Subtotal línea (sin IVA)">
                                      {formatUsdMoney(Number(it.subtotal))}
                                    </AdminDetailField>
                                    <AdminDetailField label="Precio mensual (USD)">
                                      {formatUsdMoney(Number(it.monthly_price))}
                                    </AdminDetailField>
                                    <AdminDetailField label="Días del periodo (aprox.)">
                                      {it.period_days_total != null ? String(it.period_days_total) : "—"}
                                    </AdminDetailField>
                                    <AdminDetailField label="Días restantes (en curso)">
                                      {it.days_remaining != null ? String(it.days_remaining) : "—"}
                                    </AdminDetailField>
                                  </div>
                                </AdminDetailSection>
                              </AdminDetailInset>
                            </AdminAccordionRowPanel>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {totalCount > 0 ? (
              <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} />
            ) : null}
          </>
        )}
      </div>

      <ImageLightbox
        open={galleryLightbox.open}
        onClose={() => setGalleryLightbox((s) => ({ ...s, open: false }))}
        items={galleryLightbox.items}
        initialIndex={galleryLightbox.initialIndex}
        showDownload={false}
        showThumbnails={galleryLightbox.items.length > 1}
        ariaLabel="Imágenes de la toma"
      />
    </>
  );
}
