"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailSection,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminCopyIconButton } from "@/components/admin/AdminCopyIconButton";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import {
  adminPanelCard,
  adminPrimaryBtn,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import {
  AdminFilterClearButton,
  AdminFiltersRow,
  AdminFilterSearchInput,
  AdminFilterSelect,
  FilterClearAction,
} from "@/components/admin/AdminListFilters";
import { AdminListQuerySync } from "@/components/admin/AdminListQuerySync";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  clientStatusLabel,
  clientStatusPillClassName,
  ORDER_STATUS_FILTER_OPTIONS,
  orderStatusLabel,
} from "@/components/admin/adminConstants";
import {
  orderDisplayStatusLabel,
  orderDisplayStatusPillClassName,
} from "@/lib/orderHoldDisplay";
import {
  IconAdminAlertSoft,
  IconAdminArrowDownTray,
  IconAdminChevronDown,
  IconAdminClipboard,
} from "@/components/admin/adminIcons";
import { PedidoAdminOrderLinesList } from "@/components/admin/PedidoAdminOrderLinesList";
import { PedidoDocumentosNegociacionAdmin } from "@/components/admin/PedidoDocumentosNegociacionAdmin";
import { PedidosSectionSkeleton } from "@/components/admin/skeletons/PedidosSectionSkeleton";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { useAuth } from "@/context/AuthContext";
import {
  EmptyState,
  EmptyStateIconClipboard,
} from "@/components/ui/EmptyState";
import {
  AdminDashboardFilterLink,
  dashboardClientesSearchHref,
} from "@/lib/adminDashboardLinks";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { ordersExportReportPath, ordersListPath } from "@/lib/adminListQuery";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { adminOrderLineCoverLightboxItems } from "@/lib/imageLightboxItems";
import {
  buildOrderAdminStatusSelectOptions,
  formatOrderAdminTransitionButtonLabel,
  getOrderAdminQuickNext,
  orderAdminShowRejectPedidoActivoButton,
} from "@/lib/orderAdminWorkflow";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch, authFetchBlob } from "@/services/authApi";
import {
  formatDateTimeFull,
  formatHumanDateTime,
} from "@/lib/humanDateTime";

/** Monto en USD con dos decimales (sin símbolo). */
function formatUsdAmount(value) {
  if (value == null || value === "") return "—";
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clientDisplayName(o) {
  return (o.client_detail?.company_name || o.client_company_name || "").trim();
}

/** Solo borrador puede borrarse (misma regla que el API). */
function orderIsDeletable(o) {
  return o?.status === "draft";
}

function PedidoEstadoActualCell({ order }) {
  const statusLabel = orderDisplayStatusLabel(order);
  return (
    <span
      className={`inline-flex max-w-[11rem] items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-tight ${orderDisplayStatusPillClassName(order)}`}
      title={statusLabel}
    >
      <span className="truncate">{statusLabel}</span>
    </span>
  );
}

/**
 * Botones de la columna «Siguiente estado»: mismo estilo que el chevron (borde, radio, sombra),
 * con texto del estado o solo icono en el chevron.
 */
const pedidoEstadoCompactBtnBase =
  "inline-flex shrink-0 items-center justify-center rounded-[10px] border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]";

const pedidoEstadoCompactBtnText = `${pedidoEstadoCompactBtnBase} min-h-8 max-w-[12rem] px-2.5 py-1.5 text-left text-[11px] font-semibold leading-snug`;

const pedidoEstadoCompactBtnIcon = `${pedidoEstadoCompactBtnBase} size-8 text-zinc-600`;

const PEDIDO_ESTADO_PANEL_W = 216;

function PedidoSiguienteEstadoCell({ order, orderRef, onStatusChangeRequest }) {
  const [opcionesOpen, setOpcionesOpen] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const wrapRef = useRef(null);
  const panelAnchorRef = useRef(null);
  const options = buildOrderAdminStatusSelectOptions(order);
  const quick = getOrderAdminQuickNext(order);
  const hasSelectableAlternative = options.some(
    (opt) => !opt.disabled && String(opt.v) !== String(order.status),
  );
  const showNextBtn = Boolean(quick && !quick.blockedReason);
  const showBlocked = Boolean(quick?.blockedReason);
  const showRejectActivo = orderAdminShowRejectPedidoActivoButton(order);

  useLayoutEffect(() => {
    if (!opcionesOpen) {
      setPanelPos(null);
      return undefined;
    }
    const el = panelAnchorRef.current;
    if (!el || typeof window === "undefined") {
      return undefined;
    }
    const sync = () => {
      const r = el.getBoundingClientRect();
      const width = Math.min(320, Math.max(PEDIDO_ESTADO_PANEL_W, Math.floor(window.innerWidth - 16)));
      let left = r.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = r.bottom + 6;
      setPanelPos({ top, left, width });
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [opcionesOpen]);

  useEffect(() => {
    if (!opcionesOpen) return undefined;
    const onDocDown = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (typeof t.closest === "function") {
        if (t.closest("[class*='admin-rs__menu']")) return;
        if (t.closest("[data-pedido-estado-panel]")) return;
      }
      setOpcionesOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [opcionesOpen]);

  const emptyEstado =
    !showNextBtn &&
    !showRejectActivo &&
    !hasSelectableAlternative &&
    !showBlocked;

  if (emptyEstado) {
    return (
      <div ref={wrapRef} className="min-w-0">
        <span className="text-xs text-zinc-400">—</span>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 max-w-full overflow-visible">
      <div className="inline-flex max-w-full min-w-0 flex-nowrap items-center justify-start gap-1.5">
        {showBlocked ? (
          <div
            className="flex max-w-[6.75rem] shrink-0 items-start gap-1 sm:max-w-[7.25rem]"
            title={quick.blockedReason}
          >
            <IconAdminAlertSoft
              className="mt-0.5 shrink-0 !h-4 !w-4 text-amber-600"
              aria-hidden
            />
            <p className="line-clamp-2 max-w-[5.25rem] min-w-0 break-words text-left text-[10px] font-medium leading-snug text-amber-950/90 sm:max-w-[5.75rem]">
              {quick.blockedReason}
            </p>
          </div>
        ) : null}
        {showNextBtn ? (
          <button
            type="button"
            className={`${pedidoEstadoCompactBtnText} max-w-[9rem] shrink-0 line-clamp-2 sm:max-w-[11rem]`}
            title={formatOrderAdminTransitionButtonLabel(quick.status)}
            aria-label={formatOrderAdminTransitionButtonLabel(quick.status)}
            onClick={() => onStatusChangeRequest(order, quick.status)}
          >
            {formatOrderAdminTransitionButtonLabel(quick.status)}
          </button>
        ) : null}
        {showRejectActivo ? (
          <button
            type="button"
            className={`${pedidoEstadoCompactBtnText} max-w-[8rem] shrink-0 line-clamp-2 sm:max-w-[9rem]`}
            title={`${formatOrderAdminTransitionButtonLabel("cancelled")} Se pedirá confirmación.`}
            aria-label={`${formatOrderAdminTransitionButtonLabel("cancelled")} Se pedirá confirmación.`}
            onClick={() => onStatusChangeRequest(order, "cancelled")}
          >
            {formatOrderAdminTransitionButtonLabel("cancelled")}
          </button>
        ) : null}
        {hasSelectableAlternative ? (
          <span ref={panelAnchorRef} className="inline-flex shrink-0">
            <button
              type="button"
              className={pedidoEstadoCompactBtnIcon}
              aria-expanded={opcionesOpen}
              aria-haspopup="listbox"
              aria-label="Más opciones de estado"
              onClick={() => setOpcionesOpen((v) => !v)}
            >
              <IconAdminChevronDown className="!h-[1.125rem] !w-[1.125rem]" />
            </button>
            {opcionesOpen && panelPos && typeof document !== "undefined"
              ? createPortal(
                  <div
                    data-pedido-estado-panel
                    className="fixed rounded-xl border border-zinc-200 bg-white p-2 shadow-lg"
                    style={{
                      top: panelPos.top,
                      left: panelPos.left,
                      width: panelPos.width,
                      zIndex: 5500,
                    }}
                  >
                    <AdminSelect
                      id={`pedido-status-${order.id}`}
                      inputId={`pedido-status-input-${order.id}`}
                      options={options}
                      value={order.status}
                      defaultMenuIsOpen
                      onChange={(v) => {
                        if (v != null && v !== "") {
                          onStatusChangeRequest(order, String(v));
                          setOpcionesOpen(false);
                        }
                      }}
                      compact
                      aria-label={`Cambiar estado del pedido ${orderRef || order.id}`}
                    />
                  </div>,
                  document.body,
                )
              : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PedidosAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  /** Pedido cuyo pase a «rechazada» está pendiente de confirmación en modal. */
  const [rejectTarget, setRejectTarget] = useState(null);
  const [lineCoverLightbox, setLineCoverLightbox] = useState({
    open: false,
    items: [],
    initialIndex: 0,
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const [filterOrderStatus, setFilterOrderStatus] = useState("all");
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);

  const filtersActive = filterQ.trim() !== "" || filterOrderStatus !== "all";

  const listKey =
    authReady && accessToken
      ? ordersListPath(page, debouncedFilterQ, filterOrderStatus)
      : null;
  const {
    data,
    error: swrError,
    isLoading,
    mutate: mutateOrders,
  } = useSWR(listKey, authJsonFetcher, {
    keepPreviousData: true,
  });

  const orders = useMemo(
    () => (data ? parsePaginatedResponse(data).results : []),
    [data],
  );
  const totalCount = useMemo(
    () => (data ? parsePaginatedResponse(data).count : 0),
    [data],
  );

  useEffect(() => {
    setErr(
      swrError
        ? swrError instanceof Error
          ? swrError.message
          : String(swrError)
        : "",
    );
  }, [swrError]);

  const reloadOrders = useCallback(() => mutateOrders(), [mutateOrders]);

  const downloadOrdersReport = useCallback(async () => {
    setErr("");
    setMsg("");
    setReportLoading(true);
    try {
      const path = ordersExportReportPath(debouncedFilterQ, filterOrderStatus);
      const blob = await authFetchBlob(path, { token: accessToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reporte_pedidos.xlsx";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Reporte descargado.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo generar el reporte.");
    } finally {
      setReportLoading(false);
    }
  }, [accessToken, debouncedFilterQ, filterOrderStatus]);

  const ready =
    !(authReady && accessToken) ||
    (!isLoading && (data !== undefined || swrError !== undefined));

  useEffect(() => {
    setPage(1);
  }, [debouncedFilterQ, filterOrderStatus]);

  const patchOrderStatus = useCallback(
    async (orderId, status) => {
      setErr("");
      setMsg("");
      try {
        await authFetch(`/api/orders/${orderId}/`, {
          method: "PATCH",
          body: { status },
        });
        setMsg("Estado del pedido actualizado.");
        await reloadOrders();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Error");
      }
    },
    [reloadOrders],
  );

  const requestOrderStatusChange = useCallback(
    (order, status) => {
      if (String(status) === "cancelled") {
        setRejectTarget({ order });
        return;
      }
      void patchOrderStatus(order.id, status);
    },
    [patchOrderStatus],
  );

  async function executeDeleteOrder(orderId) {
    setErr("");
    setMsg("");
    try {
      await authFetch(`/api/orders/${orderId}/`, { method: "DELETE" });
      setMsg("Pedido eliminado.");
      if (expandedId === orderId) setExpandedId(null);
      await reloadOrders();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleteTargetId(null);
    }
  }

  useEffect(() => {
    setExpandedId(null);
  }, [filterQ, filterOrderStatus, page]);

  if (!ready) {
    return (
      <div className={adminPanelCard}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`hidden shrink-0 animate-pulse sm:block sm:size-14 ${ROUNDED_CONTROL} bg-zinc-200/80`}
              aria-hidden
            />
            <div className="space-y-2">
              <div
                className={`h-7 w-40 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`}
              />
              <div
                className={`h-4 w-56 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`}
              />
            </div>
          </div>
          <div
            className={`h-10 w-36 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`}
          />
        </div>
        <PedidosSectionSkeleton />
      </div>
    );
  }

  return (
    <>
      <AdminListQuerySync onQuery={setFilterQ} />
      <div className={adminPanelCard}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconAdminClipboard className="!h-8 !w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pedidos</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {totalCount} pedido{totalCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`${adminPrimaryBtn} inline-flex items-center justify-center gap-2`}
            disabled={reportLoading}
            onClick={() => downloadOrdersReport()}
          >
            <IconAdminArrowDownTray className="!h-[1.125rem] !w-[1.125rem]" />
            {reportLoading ? "Generando…" : "Generar reporte"}
          </button>
        </div>

        {msg ? (
          <p
            className={`mb-4 ${ROUNDED_CONTROL} bg-emerald-50 px-3 py-2 text-sm text-emerald-900`}
          >
            {msg}
          </p>
        ) : null}
        {err ? (
          <p
            className={`mb-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
          >
            {err}
          </p>
        ) : null}

        {totalCount === 0 && !filtersActive ? (
          <EmptyState
            icon={<EmptyStateIconClipboard />}
            title="No hay pedidos"
            description="Cuando lleguen solicitudes de reserva desde el sitio, aparecerán aquí. Puedes generar un reporte Excel con «Generar reporte»."
          />
        ) : (
          <>
            <AdminFiltersRow>
              <AdminFilterSearchInput
                id="pedidos-filter-q"
                value={filterQ}
                onChange={setFilterQ}
                placeholder="Empresa, número o referencia (#…-ORDER-…)"
              />
              <AdminFilterSelect
                id="pedidos-filter-status"
                label="Estado del pedido"
                value={filterOrderStatus}
                onChange={setFilterOrderStatus}
                options={ORDER_STATUS_FILTER_OPTIONS}
              />
              <AdminFilterClearButton
                show={filtersActive}
                onClick={() => {
                  setFilterQ("");
                  setFilterOrderStatus("all");
                  setPage(1);
                }}
              />
            </AdminFiltersRow>

            {orders.length === 0 && filtersActive ? (
              <div className="mt-4 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ningún pedido coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction
                    onClick={() => {
                      setFilterQ("");
                      setFilterOrderStatus("all");
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {orders.length > 0 ? (
              <div
                className={`${ROUNDED_CONTROL} min-w-0 border border-zinc-200 max-sm:overflow-x-auto max-sm:overscroll-x-contain max-sm:[-webkit-overflow-scrolling:touch]`}
              >
                <table className="w-full min-w-0 text-left text-sm max-sm:min-w-[34rem]">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="w-10 px-2 py-3" aria-hidden />
                      <th className="max-sm:whitespace-nowrap px-3 py-2">Pedido</th>
                      <th className="max-sm:whitespace-nowrap px-3 py-2">Alta</th>
                      <th className="px-3 py-2">Empresa</th>
                      <th className="px-3 py-2">Estado actual</th>
                      <th className="min-w-[12rem] max-sm:whitespace-nowrap px-3 py-2">
                        Siguiente estado
                      </th>
                      <th className="max-sm:whitespace-nowrap px-3 py-2">Total USD</th>
                      <th className="max-sm:whitespace-nowrap px-2 py-2 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const open = expandedId === o.id;
                      const panelId = `pedido-extra-${o.id}`;
                      const clientQ = clientDisplayName(o);
                      const orderRef =
                        typeof o.code === "string" && o.code.trim()
                          ? o.code.trim()
                          : "";
                      return (
                        <Fragment key={o.id}>
                          <tr className="border-t border-zinc-100">
                            <td className="px-2 py-2 align-middle">
                              <AdminAccordionToggle
                                expanded={open}
                                onToggle={() =>
                                  setExpandedId(open ? null : o.id)
                                }
                                rowId={o.id}
                                controlsId={panelId}
                              />
                            </td>
                            <td className="max-w-none px-3 py-2 align-middle max-sm:whitespace-nowrap sm:max-w-[13rem]">
                              <div className="flex items-center gap-1">
                                <span
                                  className="min-w-0 flex-1 font-mono text-sm font-semibold leading-snug text-zinc-800 max-sm:whitespace-nowrap sm:break-all"
                                  title={orderRef || `#${o.id}`}
                                >
                                  {orderRef || "—"}
                                </span>
                                <AdminCopyIconButton
                                  value={orderRef}
                                  ariaLabel="Copiar referencia del pedido"
                                />
                              </div>
                            </td>
                            <td className="max-sm:whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                              <time
                                dateTime={o.created_at}
                                title={formatDateTimeFull(o.created_at)}
                                className="whitespace-nowrap text-sm tabular-nums text-zinc-700"
                              >
                                {formatHumanDateTime(o.created_at)}
                              </time>
                            </td>
                            <td className="max-w-[12rem] px-3 py-2 align-middle sm:max-w-[14rem]">
                              {clientQ ? (
                                <AdminDashboardFilterLink
                                  href={dashboardClientesSearchHref(clientQ)}
                                  className="line-clamp-2 block max-w-full"
                                  title={clientQ}
                                >
                                  {clientQ}
                                </AdminDashboardFilterLink>
                              ) : (
                                <span className="line-clamp-2 text-zinc-500">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <PedidoEstadoActualCell order={o} />
                            </td>
                            <td className="max-w-[18rem] min-w-0 px-3 py-2 align-middle">
                              <PedidoSiguienteEstadoCell
                                order={o}
                                orderRef={orderRef}
                                onStatusChangeRequest={requestOrderStatusChange}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-semibold tabular-nums text-zinc-900">
                                ${formatUsdAmount(o.total_amount)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 align-middle text-right">
                              <AdminRowActions
                                showEdit={false}
                                viewLabel="Ver detalle del pedido"
                                deleteLabel="Eliminar pedido"
                                showDelete={orderIsDeletable(o)}
                                deleteDisabledTitle="Solo se pueden eliminar pedidos en borrador."
                                onView={() =>
                                  setExpandedId((id) =>
                                    id === o.id ? null : o.id,
                                  )
                                }
                                onDelete={() => setDeleteTargetId(o.id)}
                              />
                            </td>
                          </tr>
                          {open ? (
                            <AdminAccordionRowPanel
                              colSpan={8}
                              panelId={panelId}
                              fullWidthContent
                            >
                              <AdminAccordionDetailHeader
                                badgeText={
                                  o.created_at
                                    ? formatHumanDateTime(o.created_at)
                                    : ""
                                }
                                titleLabel="Pedido"
                                titleLine={
                                  clientDisplayName(o) ||
                                  "Sin nombre de empresa"
                                }
                              />

                              <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-4 lg:mt-5 lg:grid-cols-2 lg:items-start lg:gap-6 xl:gap-7">
                                <div className="min-w-0">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="client"
                                    title="Empresa"
                                  >
                                    <AdminDetailInset className="w-full min-w-0">
                                      {o.client_detail ? (
                                        <div className="grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4">
                                          <AdminDetailField label="Empresa">
                                            {o.client_detail.company_name?.trim() ? (
                                              <AdminDashboardFilterLink
                                                href={dashboardClientesSearchHref(
                                                  o.client_detail.company_name.trim(),
                                                )}
                                              >
                                                {o.client_detail.company_name.trim()}
                                              </AdminDashboardFilterLink>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Teléfono">
                                            {o.client_detail.phone?.trim() ? (
                                              <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
                                                <span>
                                                  {o.client_detail.phone.trim()}
                                                </span>
                                                <AdminCopyIconButton
                                                  value={o.client_detail.phone.trim()}
                                                  ariaLabel="Copiar teléfono"
                                                />
                                              </span>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="RIF">
                                            {o.client_detail.rif?.trim() ? (
                                              <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 font-mono text-zinc-800">
                                                <span>
                                                  {o.client_detail.rif.trim()}
                                                </span>
                                                <AdminCopyIconButton
                                                  value={o.client_detail.rif.trim()}
                                                  ariaLabel="Copiar RIF"
                                                />
                                              </span>
                                            ) : (
                                              <span className="font-mono text-zinc-800">
                                                {adminDetailEmpty("")}
                                              </span>
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Dirección">
                                            {o.client_detail.address ||
                                              adminDetailEmpty("")}
                                          </AdminDetailField>
                                          <AdminDetailField label="Representante legal">
                                            {o.client_detail.representative_name?.trim() ? (
                                              <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
                                                <span>
                                                  {o.client_detail.representative_name.trim()}
                                                </span>
                                                <AdminCopyIconButton
                                                  value={o.client_detail.representative_name.trim()}
                                                  ariaLabel="Copiar representante legal"
                                                />
                                              </span>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Cédula del representante">
                                            {o.client_detail.representative_id_number?.trim() ? (
                                              <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 font-mono text-sm">
                                                <span>
                                                  {o.client_detail.representative_id_number.trim()}
                                                </span>
                                                <AdminCopyIconButton
                                                  value={o.client_detail.representative_id_number.trim()}
                                                  ariaLabel="Copiar cédula del representante"
                                                />
                                              </span>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Persona de contacto">
                                            {o.client_detail.contact_name?.trim() ? (
                                              <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
                                                <span>
                                                  {o.client_detail.contact_name.trim()}
                                                </span>
                                                <AdminCopyIconButton
                                                  value={o.client_detail.contact_name.trim()}
                                                  ariaLabel="Copiar contacto"
                                                />
                                              </span>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Ciudad">
                                            {o.client_detail.city ||
                                              adminDetailEmpty("")}
                                          </AdminDetailField>
                                          <AdminDetailField label="Correo">
                                            {o.client_detail.email ? (
                                              <a
                                                href={`mailto:${encodeURIComponent(o.client_detail.email)}`}
                                                className="break-all font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                              >
                                                {o.client_detail.email}
                                              </a>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                          <AdminDetailField label="Estado de la ficha (empresa)">
                                            {o.client_detail.status ? (
                                              <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${clientStatusPillClassName(o.client_detail.status)}`}
                                              >
                                                {clientStatusLabel(
                                                  o.client_detail.status,
                                                  o.client_detail.status_label,
                                                )}
                                              </span>
                                            ) : (
                                              adminDetailEmpty("")
                                            )}
                                          </AdminDetailField>
                                        </div>
                                      ) : (
                                        <div className="grid w-full grid-cols-1 sm:grid-cols-2">
                                          <div className="sm:col-span-2">
                                            <AdminDetailField label="Empresa">
                                              {o.client_company_name?.trim() ? (
                                                <AdminDashboardFilterLink
                                                  href={dashboardClientesSearchHref(
                                                    o.client_company_name.trim(),
                                                  )}
                                                >
                                                  {o.client_company_name.trim()}
                                                </AdminDashboardFilterLink>
                                              ) : (
                                                adminDetailEmpty("")
                                              )}
                                            </AdminDetailField>
                                          </div>
                                        </div>
                                      )}
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="min-w-0">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="meta"
                                    title="Datos del pedido"
                                  >
                                    <AdminDetailInset>
                                      <AdminDetailField label="Total (USD)">
                                        <span className="text-lg font-bold tabular-nums text-zinc-900">
                                          ${formatUsdAmount(o.total_amount)}
                                        </span>
                                      </AdminDetailField>
                                      <AdminDetailField label="Creada">
                                        {o.created_at ? (
                                          <time
                                            dateTime={o.created_at}
                                            title={formatDateTimeFull(o.created_at)}
                                          >
                                            {formatHumanDateTime(o.created_at)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Enviada">
                                        {o.submitted_at ? (
                                          <time
                                            dateTime={o.submitted_at}
                                            title={formatDateTimeFull(o.submitted_at)}
                                          >
                                            {formatHumanDateTime(o.submitted_at)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Reserva hasta">
                                        {o.hold_expires_at ? (
                                          <time
                                            dateTime={o.hold_expires_at}
                                            title={formatDateTimeFull(o.hold_expires_at)}
                                          >
                                            {formatHumanDateTime(o.hold_expires_at)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Método de pago">
                                        {typeof o.payment_method_label ===
                                          "string" &&
                                        o.payment_method_label.trim() !== "" ? (
                                          <span className="font-medium text-zinc-900">
                                            {o.payment_method_label}
                                          </span>
                                        ) : (
                                          adminDetailEmpty("Sin indicar")
                                        )}
                                      </AdminDetailField>
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="min-w-0 lg:col-span-2">
                                  <PedidoDocumentosNegociacionAdmin
                                    order={o}
                                    panelId={panelId}
                                    accessToken={accessToken}
                                    onSaved={reloadOrders}
                                  />
                                </div>

                                <div className="min-w-0 lg:col-span-2">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="lines"
                                    title="Líneas reservadas y artes adjuntos"
                                  >
                                    <AdminDetailInset className="space-y-2">
                                      <PedidoAdminOrderLinesList
                                        order={o}
                                        accessToken={accessToken}
                                        onOpenLineCover={(payload) =>
                                          setLineCoverLightbox({
                                            open: true,
                                            ...payload,
                                          })
                                        }
                                      />
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>
                              </div>
                            </AdminAccordionRowPanel>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
            <AdminListPagination
              page={page}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}

        <ImageLightbox
          open={lineCoverLightbox.open}
          onClose={() => setLineCoverLightbox((s) => ({ ...s, open: false }))}
          items={lineCoverLightbox.items}
          initialIndex={lineCoverLightbox.initialIndex}
          showDownload={false}
          showThumbnails={lineCoverLightbox.items.length > 1}
          ariaLabel="Imágenes del espacio publicitario en esta línea"
        />

        <AdminConfirmDialog
          open={deleteTargetId != null}
          onClose={() => setDeleteTargetId(null)}
          title="Eliminar pedido"
          confirmLabel="Eliminar"
          onConfirm={async () => {
            if (deleteTargetId == null) return;
            await executeDeleteOrder(deleteTargetId);
          }}
        >
          <p>
            ¿Eliminar el pedido #{deleteTargetId}? Se borrarán también sus
            líneas e historial de estados. Esta acción no se puede deshacer.
          </p>
        </AdminConfirmDialog>

        <AdminConfirmDialog
          open={rejectTarget != null}
          onClose={() => setRejectTarget(null)}
          title="¿Rechazar este pedido?"
          confirmLabel="Sí, rechazar pedido"
          cancelLabel="No, volver"
          onConfirm={async () => {
            if (rejectTarget == null) return;
            await patchOrderStatus(rejectTarget.order.id, "cancelled");
          }}
        >
          {rejectTarget ? (
            <div className="space-y-2">
              <p>
                El pedido pasará a estado <strong>Rechazada</strong>. Deja de
                contar como contrato activo en el flujo comercial; confirma solo
                si es la decisión correcta.
              </p>
              <p className="text-xs text-zinc-600">
                <span className="font-semibold text-zinc-800">Referencia:</span>{" "}
                {typeof rejectTarget.order.code === "string" &&
                rejectTarget.order.code.trim()
                  ? rejectTarget.order.code.trim()
                  : `#${rejectTarget.order.id}`}
                <br />
                <span className="font-semibold text-zinc-800">
                  Empresa:
                </span>{" "}
                {clientDisplayName(rejectTarget.order) || "—"}
                <br />
                <span className="font-semibold text-zinc-800">
                  Estado actual:
                </span>{" "}
                {orderStatusLabel(
                  rejectTarget.order.status,
                  rejectTarget.order.status_label,
                )}
              </p>
            </div>
          ) : null}
        </AdminConfirmDialog>
      </div>
    </>
  );
}
