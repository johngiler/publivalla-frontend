"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import {
  AdminFilterClearButton,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
  shouldShowAdminListFilters,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { ORDER_STATUS } from "@/components/admin/adminConstants";
import {
  orderDisplayStatusLabel,
  orderDisplayStatusPillClassName,
} from "@/lib/orderHoldDisplay";
import { CatalogSpaceLink } from "@/components/catalog/CatalogSpaceLink";
import {
  MarketplaceLineSpaceHeading,
  lineSpaceCode,
  lineSpaceId,
  lineSpaceTitle,
  lineShoppingCenterSubtitle,
} from "@/components/catalog/MarketplaceLineSpaceHeading";
import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import { MisPedidosSkeleton } from "@/components/orders/MisPedidosSkeleton";
import { OrderClientWorkflowPanel } from "@/components/orders/OrderClientWorkflowPanel";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import {
  formatUsdInteger,
  formatUsdMoney,
  IVA_RATE,
  totalWithIva,
} from "@/lib/marketplacePricing";
import { orderListReference } from "@/lib/orderDisplay";
import {
  orderCatalogSubtotal,
  orderDiscountTotal,
  orderHasDiscount,
  orderLineDiscountAmount,
  orderLineHasDiscount,
  orderLineOriginalSubtotal,
} from "@/lib/orderLinePricing";
import {
  marketplaceLineFieldLabelClass,
  marketplaceLinePriceClass,
  marketplaceOrderRefClass,
} from "@/lib/marketplaceLineTypography";
import {
  squareListImagePreviewButtonRingClass,
  squareMarketplaceLinePreviewFrameClass,
  squareMarketplaceLinePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ordersListPath } from "@/lib/adminListQuery";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import {
  mediaUrlForUiWithWebp,
  primaryAdSpaceMediaRawFromOrderLike,
} from "@/lib/mediaUrls";
import { parsePaginatedResponse } from "@/services/api";
import { mediaAbsoluteUrl } from "@/services/authApi";
import {
  formatDateTimeFull,
  formatHumanDateTime,
} from "@/lib/humanDateTime";

/** Fecha de contrato en formato corto (evita desfase UTC con `YYYY-MM-DD`). */
function formatContractDay(value) {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, d] = s.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("es-VE", {
      dateStyle: "medium",
    });
  }
  try {
    return new Date(s).toLocaleDateString("es-VE", { dateStyle: "medium" });
  } catch {
    return s;
  }
}

function formatContractRange(start, end) {
  const a = formatContractDay(start);
  const b = formatContractDay(end);
  if (a === "—" && b === "—") return "—";
  return `${a} → ${b}`;
}

const IVA_PERCENT_LABEL = `${Math.round(IVA_RATE * 100)} %`;

/** Acento visual según el estado destino del evento */
function timelineTone(toStatus) {
  const s = String(toStatus || "");
  if (s === "draft")
    return {
      dot: "bg-zinc-400",
      ring: "ring-zinc-100",
      bar: "from-zinc-200 to-zinc-300",
      card: "border-zinc-100 bg-zinc-50/90",
    };
  if (s === "submitted")
    return {
      dot: "bg-sky-500",
      ring: "ring-sky-100",
      bar: "from-sky-200 to-sky-300",
      card: "border-sky-100 bg-sky-50/60",
    };
  if (s === "cancelled" || s === "expired")
    return {
      dot: "bg-rose-500",
      ring: "ring-rose-100",
      bar: "from-rose-200 to-rose-300",
      card: "border-rose-100 bg-rose-50/50",
    };
  if (s === "installation" || s === "active")
    return {
      dot: "bg-emerald-500",
      ring: "ring-emerald-100",
      bar: "from-emerald-200 to-emerald-300",
      card: "border-emerald-100 bg-emerald-50/50",
    };
  return {
    dot: "bg-[color:var(--mp-primary)]",
    ring: "ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)]",
    bar: "from-[color-mix(in_srgb,var(--mp-primary)_28%,#e5e7eb)] to-[color-mix(in_srgb,var(--mp-secondary)_35%,var(--mp-primary))]",
    card: "border-[color-mix(in_srgb,var(--mp-primary)_22%,#e5e7eb)] bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--mp-primary)_8%,#fff)]",
  };
}

function OrderStatusBadge({ order }) {
  const label = orderDisplayStatusLabel(order);
  const pill = orderDisplayStatusPillClassName(order);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold shadow-sm ${pill}`}
    >
      {label}
    </span>
  );
}

/** Número de fotos distintas de una línea (URLs únicas tras resolver media). */
function orderLineItemImageCount(it) {
  if (
    Array.isArray(it?.ad_space_gallery_images) &&
    it.ad_space_gallery_images.length > 0
  ) {
    const seen = new Set();
    for (const u of it.ad_space_gallery_images) {
      if (typeof u !== "string" || !u.trim()) continue;
      const s = mediaAbsoluteUrl(u.trim());
      if (s) seen.add(s);
    }
    if (seen.size > 0) return seen.size;
  }
  if (it?.ad_space_cover_image && mediaAbsoluteUrl(it.ad_space_cover_image))
    return 1;
  return 0;
}

/**
 * Entradas planas para el lightbox: todas las imágenes de cada línea en orden.
 * `lineId` identifica la línea del pedido (para abrir en la primera foto de esa toma).
 *
 * @param {{ items: unknown[] }} o
 */
function orderLineGalleryEntries(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const out = [];
  for (const it of items) {
    const label =
      typeof it?.ad_space_title === "string" && it.ad_space_title.trim()
        ? it.ad_space_title.trim()
        : it?.ad_space_code
          ? String(it.ad_space_code)
          : "Toma";

    if (
      Array.isArray(it?.ad_space_gallery_images) &&
      it.ad_space_gallery_images.length > 0
    ) {
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
          lineId: it.id,
        });
      }
      if (idx > 0) continue;
    }

    if (!it?.ad_space_cover_image) continue;
    const src = mediaUrlForUiWithWebp(it.ad_space_cover_image);
    if (!src) continue;
    out.push({
      src,
      alt: `Portada · ${label}`,
      thumbnailSrc: src,
      lineId: it.id,
    });
  }
  return out;
}

/** Ancho de cada columna toma en cabecera multi (debe coincidir con `w-[120px]`). */
const MIS_PEDIDOS_LINE_TILE_WIDTH_PX = 120;
/** `gap-3` entre columnas. */
const MIS_PEDIDOS_LINE_TILE_GAP_PX = 12;

function maxVisibleOrderLineTiles(containerWidthPx) {
  if (
    !Number.isFinite(containerWidthPx) ||
    containerWidthPx < MIS_PEDIDOS_LINE_TILE_WIDTH_PX
  ) {
    return 1;
  }
  const unit = MIS_PEDIDOS_LINE_TILE_WIDTH_PX + MIS_PEDIDOS_LINE_TILE_GAP_PX;
  return Math.max(
    1,
    Math.floor((containerWidthPx + MIS_PEDIDOS_LINE_TILE_GAP_PX) / unit),
  );
}

function useOrderLinesStripVisibleCount() {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sync = () => {
      setVisibleCount(maxVisibleOrderLineTiles(el.clientWidth));
    };

    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { containerRef, visibleCount };
}

/**
 * Cabecera de pedido con varias tomas: solo las que caben en el ancho; el resto en Detalle.
 *
 * @param {{
 *   order: Record<string, unknown>;
 *   items: Record<string, unknown>[];
 *   onShowDetail: () => void;
 *   onOpenLineGallery: (lineId: unknown) => void;
 * }} props
 */
function MisPedidosMultiLinesPreview({
  order,
  items,
  onShowDetail,
  onOpenLineGallery,
}) {
  const { containerRef, visibleCount } = useOrderLinesStripVisibleCount();
  const visibleItems = items.slice(0, visibleCount);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const orderId = order.id;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {items.length} tomas en este pedido{" "}
        <span className="font-normal normal-case text-zinc-400">
          (precio por toma sin IVA)
        </span>
      </p>
      <div ref={containerRef} className="mt-2 min-w-0">
        <ul className="flex flex-nowrap gap-3 overflow-hidden">
          {visibleItems.map((it) => {
            const thumbRaw = primaryAdSpaceMediaRawFromOrderLike(it);
            const epTitle = lineSpaceTitle(it);
            const epCode = lineSpaceCode(it);
            const centerLine = lineShoppingCenterSubtitle(it);
            const codeLabel = epCode.replace(/^#/, "") || "toma";
            const lineSub = Number(it.subtotal);
            const lineImgCount = orderLineItemImageCount(it);
            const thumbInner = thumbRaw ? (
              <RasterFromApiUrl
                url={thumbRaw}
                alt=""
                width={120}
                height={120}
                className={squareMarketplaceLinePreviewImgClass}
                {...catalogRasterImgAttrs}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[9px] font-medium text-zinc-400">
                —
              </span>
            );
            return (
              <li
                key={String(it.id)}
                className="flex w-[120px] shrink-0 flex-col list-none"
              >
                {thumbRaw && lineImgCount > 0 ? (
                  <button
                    type="button"
                    className={`${squareMarketplaceLinePreviewFrameClass} ${squareListImagePreviewButtonRingClass} cursor-zoom-in p-0`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLineGallery(it.id);
                    }}
                    aria-label={`Abrir galería de ${codeLabel}`}
                  >
                    {thumbInner}
                  </button>
                ) : (
                  <div
                    className={squareMarketplaceLinePreviewFrameClass}
                    aria-hidden={!thumbRaw}
                  >
                    {thumbInner}
                  </div>
                )}
                {epTitle ? (
                  <CatalogSpaceLink
                    spaceId={lineSpaceId(it)}
                    stopPropagation
                    className="mt-1 line-clamp-2 w-full text-left text-[10px] font-semibold leading-snug"
                  >
                    {epTitle}
                  </CatalogSpaceLink>
                ) : (
                  <p className="mt-1 w-full text-left text-[10px] font-semibold text-zinc-500">
                    —
                  </p>
                )}
                <p
                  className="mt-0.5 w-full truncate text-left font-mono text-[10px] font-semibold tabular-nums text-zinc-500"
                  title={epCode}
                >
                  {epCode}
                </p>
                {centerLine ? (
                  <p
                    className="mt-0.5 line-clamp-2 w-full text-left text-[10px] leading-snug text-zinc-500"
                    title={centerLine}
                  >
                    {centerLine}
                  </p>
                ) : null}
                <RentalMonthsByYearPills
                  groups={cartLineMonthsByYear(it)}
                  keyPrefix={`order-${orderId}-hdr-${it.id}`}
                  className="mt-1 w-full"
                  maxVisibleMonths={2}
                />
                <div className="mt-1 w-full text-left">
                  {orderLineHasDiscount(it) ? (
                    <>
                      <p className="text-[10px] text-zinc-400 line-through tabular-nums">
                        {formatUsdInteger(orderLineOriginalSubtotal(it))}
                      </p>
                      <p
                        className={`text-xs ${marketplaceLinePriceClass}`}
                        aria-label={`Importe acordado sin IVA para ${codeLabel}`}
                      >
                        {Number.isFinite(lineSub) ? formatUsdInteger(lineSub) : "—"}
                      </p>
                    </>
                  ) : (
                    <p
                      className={`text-xs ${marketplaceLinePriceClass}`}
                      aria-label={`Importe sin IVA para ${codeLabel}`}
                    >
                      {Number.isFinite(lineSub) ? formatUsdInteger(lineSub) : "—"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {hiddenCount > 0 ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="text-sm font-semibold mp-text-brand underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
            onClick={(e) => {
              e.stopPropagation();
              onShowDetail();
            }}
            aria-label={`Ver las otras ${hiddenCount} tomas en Detalle`}
          >
            Mostrar {hiddenCount} más
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ children, id }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500"
    >
      <span
        className="h-px w-6 bg-gradient-to-r from-[color-mix(in_srgb,var(--mp-primary)_60%,transparent)] to-transparent"
        aria-hidden
      />
      {children}
    </h2>
  );
}

/** Pestañas tipo barra (no chips): indicador inferior alineado con el borde del bloque. */
function orderDetailTabTriggerClass(isSelected) {
  return [
    "relative -mb-px inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 py-2.5 text-center text-xs font-medium transition-colors sm:px-4 sm:text-sm",
    "rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
    isSelected
      ? "z-[1] border-[color:var(--mp-primary)] font-semibold text-[color:var(--mp-primary)]"
      : "border-transparent text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-800",
  ].join(" ");
}

function OrderTimeline({ events }) {
  if (!events || !events.length) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-500">
        Aún no hay movimientos registrados para este pedido.
      </p>
    );
  }
  return (
    <ol className="relative space-y-0 ps-1">
      {events.map((ev, idx) => {
        const tone = timelineTone(ev.to_status);
        const isLast = idx === events.length - 1;
        return (
          <li key={ev.id} className="relative flex gap-0 pb-8 last:pb-0">
            {!isLast ? (
              <div
                className={`absolute start-[11px] top-6 bottom-0 w-px bg-gradient-to-b ${tone.bar} opacity-80`}
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] flex shrink-0 flex-col items-center pt-0.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${tone.dot} shadow-sm ring-2 ${tone.ring}`}
              >
                <span className="h-2 w-2 rounded-full bg-white/90" />
              </span>
            </div>
            <div
              className={`ms-4 min-w-0 flex-1 rounded-xl border ${tone.card} px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}
            >
              <p className="text-[15px] font-semibold leading-snug text-zinc-900">
                {ev.to_label || ev.to_status}
              </p>
              {ev.from_status ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  <span className="text-zinc-400">Desde</span>{" "}
                  <span className="font-medium text-zinc-600">
                    {ev.from_label || ev.from_status}
                  </span>
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-zinc-200/60 pt-2">
                <time
                  dateTime={ev.created_at}
                  title={formatDateTimeFull(ev.created_at)}
                  className="text-xs font-medium tabular-nums text-zinc-700"
                >
                  {formatHumanDateTime(ev.created_at)}
                </time>
              </div>
              {ev.actor_username ? (
                <p className="mt-1.5 text-xs text-zinc-500">
                  <span className="text-zinc-400">Usuario</span>{" "}
                  <span className="font-medium text-zinc-700">
                    {ev.actor_username}
                  </span>
                </p>
              ) : null}
              {ev.note ? (
                <p className="mt-2 rounded-md bg-white/60 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-600 ring-1 ring-zinc-100/80">
                  {ev.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Chevron({ expanded }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-zinc-50 text-zinc-500 shadow-sm transition-all duration-200 ease-out group-hover:border-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--mp-primary)_8%,#fafafa)] group-hover:text-[color:var(--mp-primary)] ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="translate-y-px"
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function MisPedidosView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authReady, me, isAdmin, isClient, accessToken } = useAuth();
  const [openId, setOpenId] = useState(null);
  /** Pestaña del panel expandido de un pedido: documentos | detalle | historial */
  const [orderDetailTab, setOrderDetailTab] = useState("documents");
  /** Al abrir detalle desde «Mostrar detalles», ir a la pestaña Detalle y no resetear a Documentos. */
  const orderDetailTabIntentRef = useRef(/** @type {"detail" | null} */ (null));
  const [err, setErr] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filterSearch, 400);

  const searchFromUrl = searchParams.get("search") ?? "";
  const excludeStatusFromUrl = searchParams.get("exclude_status") ?? "";
  useEffect(() => {
    setFilterSearch(searchFromUrl);
  }, [searchFromUrl]);
  const [lineLightbox, setLineLightbox] = useState({
    open: false,
    items:
      /** @type {Array<{ src: string; alt?: string; thumbnailSrc?: string }>} */ ([]),
    initialIndex: 0,
  });

  const openOrderLineGallery = useCallback((order, lineId) => {
    /** Solo imágenes de esta línea (igual que en panel Pedidos por toma). */
    const entries = orderLineGalleryEntries(order).filter(
      (x) => x.lineId === lineId,
    );
    if (!entries.length) return;
    const items = entries.map(({ lineId: _lid, ...rest }) => rest);
    setLineLightbox({
      open: true,
      items,
      initialIndex: 0,
    });
  }, []);

  const canFetchOrders = authReady && isClient && !!accessToken;
  const excludeStatusForApi =
    filterStatus !== "all" ? "" : excludeStatusFromUrl.trim();
  const listKey = canFetchOrders
    ? ordersListPath(page, debouncedSearch, filterStatus, excludeStatusForApi)
    : null;
  const {
    data,
    error: ordersError,
    isLoading: ordersLoading,
    mutate: mutateOrders,
  } = useSWR(listKey, authJsonFetcher, {
    keepPreviousData: true,
  });

  const mergeOrderIntoList = useCallback(
    (updated) => {
      if (!updated || updated.id == null) return;
      mutateOrders(
        (current) => {
          if (!current || typeof current !== "object") return current;
          const p = parsePaginatedResponse(current);
          const uid = Number(updated.id);
          let found = false;
          const results = p.results.map((r) => {
            if (Number.isFinite(uid) && Number(r?.id) === uid) {
              found = true;
              return { ...r, ...updated };
            }
            return r;
          });
          if (!found) return current;
          return { ...current, results: [...results], count: p.count };
        },
        { revalidate: true },
      );
    },
    [mutateOrders],
  );

  const { rows, totalCount } = useMemo(() => {
    if (!data) return { rows: [], totalCount: 0 };
    const p = parsePaginatedResponse(data);
    return { rows: p.results, totalCount: p.count };
  }, [data]);

  const summary = data?.summary;
  const orderCounts = summary?.order_counts;
  const closedNoActivate = orderCounts?.cancelled ?? 0;

  const misPedidosStatusOptions = useMemo(
    () => [
      { v: "all", l: "Todos los estados" },
      ...ORDER_STATUS.filter((x) => x.v !== "draft"),
    ],
    [],
  );

  const filtersActive =
    filterStatus !== "all" ||
    filterSearch.trim() !== "" ||
    excludeStatusFromUrl.trim() !== "";

  function clearFilters() {
    setFilterStatus("all");
    setFilterSearch("");
    setPage(1);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("search");
    next.delete("exclude_status");
    const q = next.toString();
    router.replace(q ? `/cuenta/pedidos?${q}` : "/cuenta/pedidos");
  }

  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch, excludeStatusFromUrl]);

  useEffect(() => {
    setOpenId(null);
  }, [listKey]);

  useEffect(() => {
    if (orderDetailTabIntentRef.current === "detail") {
      setOrderDetailTab("detail");
      orderDetailTabIntentRef.current = null;
      return;
    }
    if (openId != null) setOrderDetailTab("documents");
  }, [openId]);

  const focusOrderDetailTab = useCallback(
    (orderId) => {
      if (openId === orderId) {
        setOrderDetailTab("detail");
        return;
      }
      orderDetailTabIntentRef.current = "detail";
      setOpenId(orderId);
    },
    [openId],
  );

  useEffect(() => {
    setErr(
      ordersError
        ? ordersError instanceof Error
          ? ordersError.message
          : String(ordersError)
        : "",
    );
  }, [ordersError]);

  useEffect(() => {
    if (!authReady) return;
    if (!me) {
      router.replace("/login?next=/cuenta/pedidos");
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

  const loading = canFetchOrders && ordersLoading && !ordersError;

  if (!authReady || !me || isAdmin || !isClient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-zinc-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        Mis pedidos
      </h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-600">
        Solicitudes de reserva que ya enviaste y el estado de cada pedido.
      </p>

      {!err && ordersLoading && data == null ? (
        <div
          className="mt-8 grid gap-3 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Cargando resumen"
        >
          <div
            className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-4 shadow-sm`}
          >
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-full max-w-[14rem]" />
          </div>
          <div
            className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-zinc-50/70 p-4 shadow-sm`}
          >
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-2 h-7 w-10" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        </div>
      ) : null}
      {!err && data && summary ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div
            className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-4 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Pedidos
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
              {orderCounts?.total ?? "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Activos: {orderCounts?.active ?? 0} · Vencidos:{" "}
              {orderCounts?.expired ?? 0} · En trámite:{" "}
              {orderCounts?.pipeline ?? 0}
            </p>
          </div>
          <div
            className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-zinc-50/70 p-4 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Rechazados
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">
              {closedNoActivate}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Pedidos que el centro dejó de tramitar en este estado.
            </p>
          </div>
        </div>
      ) : null}

      {shouldShowAdminListFilters(totalCount, filtersActive) ? (
        <AdminFiltersRow className="!mb-2 mt-8">
          <AdminFilterSearchInput
            id="mis-pedidos-search"
            value={filterSearch}
            onChange={setFilterSearch}
            placeholder="Referencia de pedido, código o nombre del espacio…"
          />
          <AdminFilterSelect
            id="mis-pedidos-status"
            label="Estado"
            value={filterStatus}
            onChange={setFilterStatus}
            options={misPedidosStatusOptions}
          />
          <AdminFilterClearButton onClick={clearFilters} show={filtersActive} />
        </AdminFiltersRow>
      ) : null}

      {err ? (
        <p
          className={`mt-4 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
        >
          {err}
        </p>
      ) : null}

      {loading ? (
        <MisPedidosSkeleton />
      ) : rows.length === 0 ? (
        <div
          className={`mt-5 ${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50/80 px-5 py-8 text-center shadow-sm`}
        >
          <p className="text-sm text-zinc-600">
            {filtersActive
              ? "No hay pedidos que coincidan con los filtros."
              : "No tienes pedidos todavía."}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`${marketplacePrimaryBtn} mt-4 px-5 py-2.5 text-sm font-semibold`}
            >
              Limpiar filtros
            </button>
          ) : (
            <Link
              href="/"
              className={`${marketplacePrimaryBtn} mt-4 inline-flex px-5 py-2.5 text-sm font-semibold`}
            >
              Ver centros y catálogo
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-4">
            {rows.map((o) => {
              const expanded = openId === o.id;
              const timeline = Array.isArray(o.status_timeline)
                ? o.status_timeline
                : [];
              const panelId = `pedido-panel-${o.id}`;
              const items = Array.isArray(o.items) ? o.items : [];
              const first = items[0];
              const lineSub = first != null ? Number(first.subtotal) : NaN;
              const singleCode = first == null ? "" : lineSpaceCode(first);
              const singleCoverRaw = first
                ? primaryAdSpaceMediaRawFromOrderLike(first)
                : "";
              const singleCodeLabel = singleCode.replace(/^#/, "") || "toma";
              const lineDisplay = Number.isFinite(lineSub)
                ? lineSub
                : Number(o.total_amount);
              const totalIva = totalWithIva(Number(o.total_amount));
              const multi = items.length > 1;
              const orderRef =
                typeof o.code === "string" && o.code.trim() !== ""
                  ? o.code.trim()
                  : orderListReference(
                      o.id,
                      typeof o.workspace_slug === "string"
                        ? o.workspace_slug.trim()
                        : undefined,
                    );
              return (
                <li
                  key={o.id}
                  className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm transition hover:shadow-md`}
                >
                  <div className="px-4 py-5 sm:px-6">
                    <div className="group flex w-full items-start justify-between gap-4 text-left">
                      <div
                        className="min-w-0 flex-1 cursor-pointer space-y-4"
                        onClick={() => setOpenId(expanded ? null : o.id)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={marketplaceOrderRefClass}>
                            {orderRef}
                          </span>
                          <OrderStatusBadge order={o} />
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-3">
                          <div className="min-w-0 flex-1">
                            {!multi && first ? (
                              <div className="flex items-start gap-3">
                                <div
                                  className={
                                    squareMarketplaceLinePreviewFrameClass
                                  }
                                  aria-hidden={!singleCoverRaw}
                                >
                                  {singleCoverRaw ? (
                                    <RasterFromApiUrl
                                      url={singleCoverRaw}
                                      alt=""
                                      width={120}
                                      height={120}
                                      className={
                                        squareMarketplaceLinePreviewImgClass
                                      }
                                      {...catalogRasterImgAttrs}
                                    />
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-400">
                                      —
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <MarketplaceLineSpaceHeading
                                    item={first}
                                    stopPropagation
                                  />
                                  <RentalMonthsByYearPills
                                    groups={cartLineMonthsByYear(first)}
                                    keyPrefix={`order-${o.id}-line-${first.id}`}
                                    className="mt-2"
                                  />
                                </div>
                              </div>
                            ) : null}
                            {multi ? (
                              <MisPedidosMultiLinesPreview
                                order={o}
                                items={items}
                                onShowDetail={() => focusOrderDetailTab(o.id)}
                                onOpenLineGallery={(lineId) =>
                                  openOrderLineGallery(o, lineId)
                                }
                              />
                            ) : null}
                            {!multi && !first ? (
                              <p className="text-sm text-zinc-500">
                                Sin líneas en este pedido.
                              </p>
                            ) : null}
                          </div>
                          {!multi && first && orderLineHasDiscount(first) ? (
                            <div className="shrink-0 text-right">
                              <p className={marketplaceLineFieldLabelClass}>
                                Subtotal catálogo (sin IVA)
                              </p>
                              <p className="text-sm text-zinc-400 line-through tabular-nums">
                                {formatUsdInteger(orderLineOriginalSubtotal(first))}
                              </p>
                              <p className={`mt-1 ${marketplaceLineFieldLabelClass}`}>
                                Subtotal acordado (sin IVA)
                              </p>
                              <p
                                className={marketplaceLinePriceClass}
                                aria-label={`Importe acordado sin IVA para ${singleCodeLabel}`}
                              >
                                {formatUsdInteger(lineDisplay)}
                              </p>
                            </div>
                          ) : !multi ? (
                            <div className="shrink-0 text-right">
                              <p className={marketplaceLineFieldLabelClass}>
                                Subtotal (sin IVA)
                              </p>
                              <p
                                className={marketplaceLinePriceClass}
                                aria-label={`Importe sin IVA para ${singleCodeLabel}`}
                              >
                                {formatUsdInteger(lineDisplay)}
                              </p>
                            </div>
                          ) : orderHasDiscount(o) ? (
                            <div className="shrink-0 text-right">
                              <p className={marketplaceLineFieldLabelClass}>
                                Subtotal catálogo (sin IVA)
                              </p>
                              <p className="text-sm tabular-nums text-zinc-600">
                                {formatUsdMoney(orderCatalogSubtotal(o))}
                              </p>
                              <p className={`mt-1 ${marketplaceLineFieldLabelClass}`}>
                                Descuento
                              </p>
                              <p className="text-sm font-semibold text-emerald-800">
                                −{formatUsdMoney(orderDiscountTotal(o))}
                              </p>
                              <p className={`mt-1 ${marketplaceLineFieldLabelClass}`}>
                                Subtotal acordado (sin IVA)
                              </p>
                              <p className={marketplaceLinePriceClass}>
                                {formatUsdInteger(Number(o.total_amount))}
                              </p>
                            </div>
                          ) : (
                            <div className="shrink-0 text-right">
                              <p className={marketplaceLineFieldLabelClass}>
                                Subtotal pedido (sin IVA)
                              </p>
                              <p className={marketplaceLinePriceClass}>
                                {formatUsdInteger(Number(o.total_amount))}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-3">
                          <div className="min-w-0">
                            <p className={marketplaceLineFieldLabelClass}>
                              {o.submitted_at ? "Enviado el" : "Registrado el"}
                            </p>
                            <time
                              dateTime={o.submitted_at || o.created_at}
                              title={formatDateTimeFull(
                                o.submitted_at || o.created_at,
                              )}
                              className="text-sm font-semibold tabular-nums text-zinc-900"
                            >
                              {o.submitted_at || o.created_at
                                ? formatHumanDateTime(
                                    o.submitted_at || o.created_at,
                                  )
                                : "—"}
                            </time>
                          </div>
                          <div className="text-right">
                            <p className={marketplaceLineFieldLabelClass}>
                              Total con IVA ({IVA_PERCENT_LABEL})
                            </p>
                            <span className={marketplaceLinePriceClass}>
                              {formatUsdMoney(totalIva)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-0.5 inline-flex shrink-0 rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
                        onClick={() => setOpenId(expanded ? null : o.id)}
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        aria-label={
                          expanded ? "Contraer pedido" : "Expandir pedido"
                        }
                      >
                        <Chevron expanded={expanded} />
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div
                      id={panelId}
                      className="border-t border-zinc-100 bg-zinc-50/80 px-4 pb-5 pt-4 sm:px-5 sm:pb-6"
                    >
                      <div
                        role="tablist"
                        aria-label="Secciones del pedido"
                        className="flex flex-wrap gap-x-0.5 border-b border-zinc-200/90"
                      >
                        <button
                          type="button"
                          role="tab"
                          id={`${panelId}-tab-doc`}
                          aria-selected={orderDetailTab === "documents"}
                          aria-controls={`${panelId}-panel-doc`}
                          className={orderDetailTabTriggerClass(
                            orderDetailTab === "documents",
                          )}
                          onClick={() => setOrderDetailTab("documents")}
                        >
                          Documentos
                        </button>
                        <button
                          type="button"
                          role="tab"
                          id={`${panelId}-tab-detail`}
                          aria-selected={orderDetailTab === "detail"}
                          aria-controls={`${panelId}-panel-detail`}
                          className={orderDetailTabTriggerClass(
                            orderDetailTab === "detail",
                          )}
                          onClick={() => setOrderDetailTab("detail")}
                        >
                          Detalle
                        </button>
                        <button
                          type="button"
                          role="tab"
                          id={`${panelId}-tab-hist`}
                          aria-selected={orderDetailTab === "history"}
                          aria-controls={`${panelId}-panel-history`}
                          className={orderDetailTabTriggerClass(
                            orderDetailTab === "history",
                          )}
                          onClick={() => setOrderDetailTab("history")}
                        >
                          Historial
                        </button>
                      </div>

                      <div className="mt-4 min-w-0">
                        <div
                          role="tabpanel"
                          id={`${panelId}-panel-doc`}
                          aria-labelledby={`${panelId}-doc-heading`}
                          hidden={orderDetailTab !== "documents"}
                        >
                          <SectionTitle id={`${panelId}-doc-heading`}>
                            Documentos y siguientes pasos
                          </SectionTitle>
                          <div className="mt-3 min-w-0">
                            {accessToken ? (
                              <OrderClientWorkflowPanel
                                order={o}
                                accessToken={accessToken}
                                onOrderUpdated={mergeOrderIntoList}
                                sectionTitleId={`${panelId}-doc-heading`}
                              />
                            ) : (
                              <p
                                className={`mt-3 text-sm text-zinc-600 ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white px-4 py-3 shadow-sm`}
                              >
                                Inicia sesión de nuevo para ver y gestionar los
                                documentos de este pedido.
                              </p>
                            )}
                          </div>
                        </div>

                        <div
                          role="tabpanel"
                          id={`${panelId}-panel-detail`}
                          aria-labelledby={`${panelId}-lineas`}
                          hidden={orderDetailTab !== "detail"}
                        >
                          <SectionTitle id={`${panelId}-lineas`}>
                            Detalle por toma
                          </SectionTitle>
                          <div className="mt-3 rounded-xl border border-zinc-100 bg-white/90 p-4 shadow-sm">
                            <p className="text-xs leading-relaxed text-zinc-500">
                              Cada fila es una toma distinta: fechas del periodo
                              reservado e importe de esa línea{" "}
                              <span className="font-medium text-zinc-600">
                                sin IVA
                              </span>
                              . No todas las tomas comparten las mismas fechas
                              si reservaste periodos distintos.
                            </p>
                            <ul
                              className="mt-4 list-none space-y-4 p-0"
                              aria-labelledby={`${panelId}-lineas`}
                            >
                              {(o.items || []).map((it) => {
                                const lineCoverRaw =
                                  primaryAdSpaceMediaRawFromOrderLike(it);
                                const lineImgCount =
                                  orderLineItemImageCount(it);
                                const periodMonths = cartLineMonthsByYear(it);
                                const codeLabel =
                                  lineSpaceCode(it).replace(/^#/, "") || "toma";
                                return (
                                  <li
                                    key={it.id}
                                    className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
                                  >
                                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5">
                                      <div className="flex min-w-0 flex-1 gap-3">
                                        {lineCoverRaw ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openOrderLineGallery(o, it.id)
                                            }
                                            className={`${squareMarketplaceLinePreviewFrameClass} ${squareListImagePreviewButtonRingClass} shrink-0 p-0`}
                                            aria-label={
                                              lineImgCount > 1
                                                ? `Abrir galería de esta toma (${lineImgCount} imágenes)`
                                                : "Abrir imagen ampliada"
                                            }
                                          >
                                            <RasterFromApiUrl
                                              url={lineCoverRaw}
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
                                          <MarketplaceLineSpaceHeading
                                            item={it}
                                          />
                                          {periodMonths.length > 0 ? (
                                            <RentalMonthsByYearPills
                                              groups={periodMonths}
                                              keyPrefix={`detail-${o.id}-${it.id}`}
                                              className="mt-2"
                                            />
                                          ) : (
                                            <p className="mt-2 text-sm font-medium text-zinc-800">
                                              {formatContractRange(
                                                it.start_date,
                                                it.end_date,
                                              )}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-right sm:pt-0.5">
                                        <p
                                          className={
                                            marketplaceLineFieldLabelClass
                                          }
                                        >
                                          Subtotal (sin IVA)
                                        </p>
                                        {orderLineHasDiscount(it) ? (
                                          <>
                                            <p className="text-xs text-zinc-400 line-through tabular-nums">
                                              {formatUsdMoney(
                                                orderLineOriginalSubtotal(it),
                                              )}
                                            </p>
                                            <p
                                              className={marketplaceLinePriceClass}
                                              aria-label={`Importe acordado sin IVA para ${codeLabel}`}
                                            >
                                              {formatUsdMoney(Number(it.subtotal))}
                                            </p>
                                            <p className="mt-0.5 text-xs font-medium text-emerald-800">
                                              −
                                              {formatUsdMoney(
                                                orderLineDiscountAmount(it),
                                              )}
                                            </p>
                                          </>
                                        ) : (
                                          <p
                                            className={marketplaceLinePriceClass}
                                            aria-label={`Importe sin IVA para ${codeLabel}`}
                                          >
                                            {formatUsdMoney(Number(it.subtotal))}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>

                        <div
                          role="tabpanel"
                          id={`${panelId}-panel-history`}
                          aria-labelledby={`${panelId}-hist`}
                          hidden={orderDetailTab !== "history"}
                        >
                          <SectionTitle id={`${panelId}-hist`}>
                            Historial de estados
                          </SectionTitle>
                          <div className="mt-3 rounded-xl border border-zinc-100 bg-white/90 p-4 shadow-sm">
                            <div aria-labelledby={`${panelId}-hist`}>
                              <OrderTimeline events={timeline} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <AdminListPagination
            page={page}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      <ImageLightbox
        open={lineLightbox.open}
        onClose={() => setLineLightbox((s) => ({ ...s, open: false }))}
        items={lineLightbox.items}
        initialIndex={lineLightbox.initialIndex}
        showDownload={false}
        showThumbnails={lineLightbox.items.length > 1}
        ariaLabel="Imágenes de las tomas del pedido"
      />
    </div>
  );
}
