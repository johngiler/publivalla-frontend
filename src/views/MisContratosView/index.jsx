"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import {
  AdminFilterClearButton,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
  shouldShowAdminListFilters,
} from "@/components/admin/AdminListFilters";
import { orderStatusPillClassName } from "@/components/admin/adminConstants";
import { MarketplaceLineSpaceHeading } from "@/components/catalog/MarketplaceLineSpaceHeading";
import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { MisContratosSkeleton } from "@/components/orders/MisContratosSkeleton";
import { useAuth } from "@/context/AuthContext";
import {
  marketplaceLineFieldLabelClass,
  marketplaceLinePriceClass,
  marketplaceOrderRefLinkClass,
} from "@/lib/marketplaceLineTypography";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { orderUsesSplitPayment } from "@/lib/orderPaymentPlan";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { mediaUrlForUiWithWebp, primaryAdSpaceMediaRawFromOrderLike } from "@/lib/mediaUrls";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { contractsPath } from "@/services/clientAccountApi";
import {
  squareListImagePreviewButtonRingClass,
  squareMarketplaceLinePreviewFrameClass,
  squareMarketplaceLinePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authJsonFetcher } from "@/lib/swr/fetchers";
/** Mismo contrato que `AdminSelect` / resto del admin: `{ v, l }`, no `value`/`label`. */
const PHASE_OPTIONS = [
  { v: "all", l: "Todos" },
  { v: "open", l: "Vigentes" },
  { v: "running", l: "En curso" },
  { v: "upcoming", l: "Próximos" },
  { v: "ended", l: "Finalizados" },
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
  if (kind === "upcoming") return "Próximo";
  if (kind === "ended") return "Finalizado";
  return kind;
}

function kindPillClass(kind) {
  if (kind === "running") return "border-emerald-200/90 bg-emerald-50 text-emerald-900";
  if (kind === "upcoming") return "border-sky-200/90 bg-sky-50 text-sky-900";
  if (kind === "ended") return "border-zinc-200/90 bg-zinc-100 text-zinc-700";
  return "border-zinc-200/90 bg-zinc-50 text-zinc-800";
}

/** Enlace a Mis pedidos con el mismo `search` que usa el listado (`/api/orders/?search=`). */
function pedidosHrefForOrder(orderCode, orderId) {
  const c =
    orderCode != null && String(orderCode).trim() !== ""
      ? String(orderCode).replace(/^#/, "").trim()
      : orderId != null
        ? String(orderId)
        : "";
  if (!c) return "/cuenta/pedidos";
  return `/cuenta/pedidos?search=${encodeURIComponent(c)}`;
}

/** Entradas del lightbox para una línea de contrato (misma lógica que pedidos: galería, luego portada). */
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

export default function MisContratosView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady, me, isAdmin, isClient, accessToken } = useAuth();
  const phaseFromUrl = (searchParams.get("phase") ?? "").trim();
  const searchFromUrl = searchParams.get("search") ?? "";
  const [phase, setPhase] = useState(() =>
    PHASE_OPTIONS.some((o) => o.v === phaseFromUrl) ? phaseFromUrl : "all",
  );
  const [filterSearch, setFilterSearch] = useState(() => searchFromUrl);
  const debouncedSearch = useDebouncedValue(filterSearch, 400);

  useEffect(() => {
    setFilterSearch(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    if (!phaseFromUrl || phaseFromUrl === "all") {
      setPhase("all");
      return;
    }
    if (PHASE_OPTIONS.some((o) => o.v === phaseFromUrl)) {
      setPhase(phaseFromUrl);
    }
  }, [phaseFromUrl]);
  const [contractGallery, setContractGallery] = useState({
    open: false,
    items: /** @type {Array<{ src: string; alt?: string; thumbnailSrc?: string }>} */ ([]),
    initialIndex: 0,
  });

  const openContractLineGallery = useCallback((it) => {
    const items = contractLineLightboxItems(it);
    if (!items.length) return;
    setContractGallery({ open: true, items, initialIndex: 0 });
  }, []);

  const phaseForApi = phaseFromUrl === "open" && phase !== "open" ? phase : phase;
  const canFetch = authReady && isClient && !!accessToken;
  const swrKey = canFetch ? contractsPath(phaseForApi) : null;
  const { data, error, isLoading } = useSWR(swrKey, authJsonFetcher);

  useEffect(() => {
    if (!authReady) return;
    if (!me) {
      router.replace("/login?next=/cuenta/contratos");
      return;
    }
    if (isAdmin) {
      router.replace("/dashboard");
      return;
    }
    if (!isClient) {
      router.replace("/cuenta");
      return;
    }
  }, [authReady, me, isAdmin, isClient, router]);

  const summary = data?.summary;
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const title = String(it.ad_space_title ?? "").toLowerCase();
      const code = String(it.ad_space_code ?? "").toLowerCase();
      return title.includes(q) || code.includes(q);
    });
  }, [items, debouncedSearch]);

  const filtersActive =
    phase !== "all" || filterSearch.trim() !== "" || phaseFromUrl !== "" || searchFromUrl !== "";

  function clearFilters() {
    setPhase("all");
    setFilterSearch("");
    const next = new URLSearchParams(searchParams.toString());
    next.delete("search");
    next.delete("phase");
    const q = next.toString();
    router.replace(q ? `/cuenta/contratos?${q}` : "/cuenta/contratos");
  }

  const errMsg = error instanceof Error ? error.message : error ? String(error) : "";

  if (!authReady || !me || isAdmin || !isClient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-zinc-500">
        Cargando…
      </div>
    );
  }

  const loading = canFetch && isLoading && !error;
  const totalNum = summary?.total_invested_subtotal != null ? Number(summary.total_invested_subtotal) : NaN;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Mis contratos
      </h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600">
        Tomas en operación ligadas a pedidos activos o vencidos.
      </p>

      {loading ? (
        <div className="mt-8">
          <MisContratosSkeleton />
        </div>
      ) : errMsg ? (
        <p className={`${ROUNDED_CONTROL} mt-8 bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
          {errMsg}
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div
              className={`${ROUNDED_CONTROL} border border-emerald-200/70 bg-gradient-to-br from-emerald-50/55 via-white to-teal-50/35 p-4 shadow-sm`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/75">
                Total invertido (sin IVA)
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                {Number.isFinite(totalNum) ? formatUsdMoney(totalNum) : "—"}
              </p>
            </div>
            <div
              className={`${ROUNDED_CONTROL} border border-sky-200/75 bg-gradient-to-br from-sky-50/50 via-white to-cyan-50/25 p-4 shadow-sm`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-900/80">
                Líneas de contrato
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
                {summary?.line_counts?.total ?? "—"}
              </p>
              <p className="mt-1 text-xs text-sky-900/65">
                En curso: {summary?.line_counts?.running ?? 0} · Próx.: {summary?.line_counts?.upcoming ?? 0} ·
                Fin.: {summary?.line_counts?.ended ?? 0}
              </p>
            </div>
            <div
              className={`${ROUNDED_CONTROL} border border-amber-300/70 bg-gradient-to-br from-amber-50/70 via-amber-50/40 to-orange-50/30 p-4 shadow-sm`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-950/85">
                Vencen en 30 días
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-amber-950">
                {summary?.ending_within_30_days ?? 0}
              </p>
              <p className="mt-1 text-xs text-amber-950/75">Contratos activos con fin próximo</p>
            </div>
          </div>

          {shouldShowAdminListFilters(items.length, filtersActive) ? (
            <AdminFiltersRow className="!mb-0 mt-8">
              <AdminFilterSearchInput
                id="mis-contratos-search"
                value={filterSearch}
                onChange={setFilterSearch}
                placeholder="Nombre de la toma o código (ej. DEMO-T9A)…"
              />
              <AdminFilterSelect
                id="mis-contratos-phase"
                label="Mostrar"
                value={phase}
                onChange={setPhase}
                options={PHASE_OPTIONS}
              />
              <AdminFilterClearButton onClick={clearFilters} show={filtersActive} />
            </AdminFiltersRow>
          ) : null}

          {(summary?.line_counts?.total ?? 0) === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center text-sm text-zinc-600">
              No hay contratos en esta vista. Cuando un pedido pase a{" "}
              <span className="font-medium text-zinc-800">activo</span> o quede{" "}
              <span className="font-medium text-zinc-800">vencido</span>, las tomas aparecerán aquí.
            </p>
          ) : filteredItems.length === 0 ? (
            <div
              className={`${ROUNDED_CONTROL} mt-8 border border-zinc-200 bg-zinc-50/80 px-5 py-8 text-center shadow-sm`}
            >
              <p className="text-sm text-zinc-600">No hay líneas que coincidan con la búsqueda o el filtro.</p>
              <button
                type="button"
                onClick={clearFilters}
                className={`${marketplacePrimaryBtn} mt-4 px-5 py-2.5 text-sm font-semibold`}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <ul className="mt-6 list-none space-y-4 p-0">
              {filteredItems.map((it) => {
                const coverRaw = primaryAdSpaceMediaRawFromOrderLike(it);
                const galleryCount = contractLineImageCount(it);
                const canOpenGallery = galleryCount > 0;
                const periodMonths = cartLineMonthsByYear(it);
                return (
                  <li
                    key={`${it.order_id}-${it.id}`}
                    className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
                  >
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5">
                      <div className="flex min-w-0 flex-1 gap-3">
                      {canOpenGallery ? (
                        <button
                          type="button"
                          onClick={() => openContractLineGallery(it)}
                          className={`${squareMarketplaceLinePreviewFrameClass} ${squareListImagePreviewButtonRingClass} shrink-0 cursor-zoom-in p-0`}
                          aria-label={
                            galleryCount > 1
                              ? `Abrir galería de esta toma (${galleryCount} imágenes)`
                              : "Abrir imagen ampliada"
                          }
                        >
                          <RasterFromApiUrl
                            url={coverRaw}
                            alt=""
                            width={120}
                            height={120}
                            className={`${squareMarketplaceLinePreviewImgClass} transition duration-200 group-hover:scale-105`}
                            {...catalogRasterImgAttrs}
                          />
                        </button>
                      ) : (
                        <div
                          className={`${squareMarketplaceLinePreviewFrameClass} shrink-0 bg-zinc-100`}
                          aria-hidden
                        >
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                            Sin imagen
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <MarketplaceLineSpaceHeading
                            item={{
                              ad_space: it.ad_space_id,
                              ad_space_title: it.ad_space_title,
                              ad_space_code: it.ad_space_code,
                              shopping_center_name: it.shopping_center_name,
                              shopping_center_city: it.shopping_center_city,
                            }}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kindPillClass(it.contract_row_kind)}`}
                            >
                              {kindLabel(it.contract_row_kind)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold shadow-sm ${orderStatusPillClassName(it.order_status)}`}
                            >
                              {it.order_status_label || it.order_status}
                            </span>
                            {orderUsesSplitPayment(it) ? (
                              <span className="inline-flex rounded-full border border-violet-200/90 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
                                Pago por partes
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {periodMonths.length > 0 ? (
                          <RentalMonthsByYearPills
                            groups={periodMonths}
                            keyPrefix={`contract-${it.order_id}-${it.id}`}
                            className="mt-2"
                          />
                        ) : (
                          <p className="mt-2 text-sm font-medium text-zinc-800">
                            {formatContractDay(it.start_date)} → {formatContractDay(it.end_date)}
                          </p>
                        )}
                        <div className="mt-3">
                          <p className={marketplaceLineFieldLabelClass}>Pedido</p>
                          <Link
                            href={pedidosHrefForOrder(it.order_code, it.order_id)}
                            className={`mt-0.5 inline-block ${marketplaceOrderRefLinkClass}`}
                          >
                            {it.order_code || `#${it.order_id}`}
                          </Link>
                        </div>
                      </div>
                      </div>
                      <div className="shrink-0 text-right sm:pt-0.5">
                      <p className={marketplaceLineFieldLabelClass}>Subtotal (sin IVA)</p>
                      <p className={marketplaceLinePriceClass}>
                        {formatUsdMoney(Number(it.subtotal))}
                      </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <ImageLightbox
        open={contractGallery.open}
        onClose={() => setContractGallery((s) => ({ ...s, open: false }))}
        items={contractGallery.items}
        initialIndex={contractGallery.initialIndex}
        showDownload={false}
        showThumbnails={contractGallery.items.length > 1}
        ariaLabel="Imágenes de la toma en contrato"
      />
    </div>
  );
}
