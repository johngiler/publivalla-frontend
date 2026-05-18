"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  AdminFilterClearButton,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
} from "@/components/admin/AdminListFilters";
import {
  AUCTION_STATUS_FILTER_OPTIONS,
  auctionStatusLabel,
  auctionStatusPillClassName,
} from "@/components/admin/adminConstants";
import { IconAdminGavel } from "@/components/admin/adminIcons";
import {
  adminField,
  adminLabel,
  adminPanelCard,
  adminPrimaryBtn,
  adminSecondaryBtn,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import { PujasSectionSkeleton } from "@/components/admin/skeletons/PujasSectionSkeleton";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { auctionsListPath } from "@/lib/adminListQuery";
import {
  datetimeLocalValueToIso,
  formatAuctionDate,
  formatAuctionDateTime,
  formatUsd,
  isoToDatetimeLocalValue,
} from "@/lib/auctionDisplay";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  ADMIN_CENTERS_ALL_SWR_KEY,
  ADMIN_SPACES_ALL_SWR_KEY,
  adminCentersAllPagesFetcher,
  adminSpacesAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch } from "@/services/authApi";

const ACTIVE_FILTER_OPTIONS = [
  { v: "all", l: "Activas e inactivas" },
  { v: "1", l: "Solo activas" },
  { v: "0", l: "Solo inactivas" },
];

export function PujasAdminSection() {
  const { authReady, accessToken } = useAuth();
  const { caps } = useWorkspaceCapabilities();
  const biddingOn = caps.marketplace_bidding_enabled;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterSpace, setFilterSpace] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterActive, setFilterActive] = useState("1");
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [awardRow, setAwardRow] = useState(null);
  const [awardBidId, setAwardBidId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [modalCenterId, setModalCenterId] = useState("");
  const [adSpaceId, setAdSpaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [minimumBid, setMinimumBid] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);

  const centersKey = authReady && accessToken ? ADMIN_CENTERS_ALL_SWR_KEY : null;
  const spacesKey = authReady && accessToken ? ADMIN_SPACES_ALL_SWR_KEY : null;
  const { data: centersData, error: centersErr } = useSWR(centersKey, adminCentersAllPagesFetcher);
  const { data: spacesData, error: spacesErr } = useSWR(spacesKey, adminSpacesAllPagesFetcher);

  const centers = useMemo(() => (Array.isArray(centersData) ? centersData : []), [centersData]);
  const spaces = useMemo(() => (Array.isArray(spacesData) ? spacesData : []), [spacesData]);

  const centerFilterOptions = useMemo(
    () => [
      { v: "all", l: "Todos los centros" },
      ...centers.map((c) => ({
        v: String(c.id),
        l: [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`,
      })),
    ],
    [centers],
  );

  const spacesForFilter = useMemo(() => {
    if (filterCenter === "all") return spaces;
    return spaces.filter((s) => String(s.shopping_center) === String(filterCenter));
  }, [spaces, filterCenter]);

  const spaceFilterOptions = useMemo(
    () => [
      { v: "all", l: "Todas las tomas" },
      ...spacesForFilter.map((s) => ({
        v: String(s.id),
        l: [s.code, s.title].filter(Boolean).join(" — ") || `Toma #${s.id}`,
      })),
    ],
    [spacesForFilter],
  );

  const spacesForModal = useMemo(() => {
    if (!modalCenterId) return [];
    return spaces.filter((s) => String(s.shopping_center) === String(modalCenterId));
  }, [spaces, modalCenterId]);

  const modalSpaceOptions = useMemo(
    () => [
      { v: "", l: "Selecciona la toma" },
      ...spacesForModal.map((s) => ({
        v: String(s.id),
        l: [s.code, s.title].filter(Boolean).join(" — ") || `Toma #${s.id}`,
      })),
    ],
    [spacesForModal],
  );

  const modalCenterOptions = useMemo(
    () => [
      { v: "", l: "Selecciona el centro" },
      ...centers.map((c) => ({
        v: String(c.id),
        l: [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`,
      })),
    ],
    [centers],
  );

  const listKey =
    authReady && accessToken && biddingOn
      ? auctionsListPath(
          page,
          debouncedSearch,
          filterCenter === "all" ? "" : filterCenter,
          filterSpace === "all" ? "" : filterSpace,
          filterStatus,
          filterActive,
        )
      : null;

  const {
    data: listData,
    error: listErr,
    isLoading: listLoading,
    mutate: mutateList,
  } = useSWR(listKey, authJsonFetcher, { keepPreviousData: true });

  const rows = useMemo(
    () => (listData ? parsePaginatedResponse(listData).results : []),
    [listData],
  );
  const totalCount = useMemo(
    () => (listData ? parsePaginatedResponse(listData).count : 0),
    [listData],
  );

  const reload = useCallback(async () => {
    await mutateList();
    await revalidateHomeCatalog(globalMutate);
  }, [mutateList]);

  useEffect(() => {
    setPageErr(
      centersErr
        ? centersErr instanceof Error
          ? centersErr.message
          : String(centersErr)
        : spacesErr
          ? spacesErr instanceof Error
            ? spacesErr.message
            : String(spacesErr)
          : listErr
            ? listErr instanceof Error
              ? listErr.message
              : String(listErr)
            : "",
    );
  }, [centersErr, spacesErr, listErr]);

  useEffect(() => {
    setExpandedId(null);
  }, [page, debouncedSearch, filterCenter, filterSpace, filterStatus, filterActive]);

  useEffect(() => {
    setFilterSpace("all");
  }, [filterCenter]);

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  function openCreate() {
    setEditRow(null);
    setModalCenterId(filterCenter !== "all" ? filterCenter : "");
    setAdSpaceId(filterSpace !== "all" ? filterSpace : "");
    setStartDate("");
    setEndDate("");
    setOpensAt(isoToDatetimeLocalValue(new Date().toISOString()));
    setClosesAt("");
    setMinimumBid("");
    setNote("");
    setIsActive(true);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  function openEdit(row) {
    setEditRow(row);
    setModalCenterId(row.shopping_center_id != null ? String(row.shopping_center_id) : "");
    setAdSpaceId(row.ad_space != null ? String(row.ad_space) : "");
    setStartDate(row.start_date ? String(row.start_date).slice(0, 10) : "");
    setEndDate(row.end_date ? String(row.end_date).slice(0, 10) : "");
    setOpensAt(isoToDatetimeLocalValue(row.opens_at));
    setClosesAt(isoToDatetimeLocalValue(row.closes_at));
    setMinimumBid(row.minimum_bid_usd != null ? String(row.minimum_bid_usd) : "");
    setNote(row.note || "");
    setIsActive(row.is_active !== false);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  async function saveAuction() {
    setModalErr("");
    setFieldErrors({});
    const payload = {
      ad_space: Number(adSpaceId),
      start_date: startDate,
      end_date: endDate,
      opens_at: datetimeLocalValueToIso(opensAt),
      closes_at: datetimeLocalValueToIso(closesAt),
      minimum_bid_usd: minimumBid,
      note: note.trim(),
      is_active: isActive,
    };
    try {
      if (editRow?.id) {
        await authFetch(`/api/admin/auctions/${editRow.id}/`, {
          method: "PATCH",
          body: payload,
        });
        setMsg("Puja actualizada.");
      } else {
        await authFetch("/api/admin/auctions/", { method: "POST", body: payload });
        setMsg("Puja creada en borrador.");
      }
      setModal(null);
      await reload();
    } catch (e) {
      const data = e?.data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setFieldErrors(data);
      }
      setModalErr(e instanceof Error ? e.message : "No se pudo guardar la puja.");
    }
  }

  async function runAction(path, successMessage) {
    setActionLoading(true);
    setPageErr("");
    try {
      await authFetch(path, { method: "POST", body: {} });
      setMsg(successMessage);
      await reload();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "No se pudo completar la acción.");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmAward() {
    if (!awardRow?.id) return;
    if (!awardBidId) {
      throw new Error("Selecciona la oferta ganadora.");
    }
    setPageErr("");
    await authFetch(`/api/admin/auctions/${awardRow.id}/award/`, {
      method: "POST",
      body: { bid_id: Number(awardBidId) },
    });
    setMsg("Puja adjudicada. Se creó el pedido con hold de 72 h.");
    setAwardRow(null);
    setAwardBidId("");
    await reload();
  }

  const awardBidOptions = useMemo(() => {
    const bids = Array.isArray(awardRow?.bids) ? awardRow.bids : [];
    return [
      { v: "", l: "Selecciona la oferta ganadora" },
      ...bids.map((b) => ({
        v: String(b.id),
        l: `${b.client_name || "Cliente"} — ${formatUsd(b.amount_usd)}`,
      })),
    ];
  }, [awardRow]);

  if (!biddingOn) {
    return (
      <section className="space-y-4">
        <p className={`${ROUNDED_CONTROL} border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-700`}>
          Las pujas no están habilitadas en este marketplace. Activa la opción en la configuración del workspace
          (administración de plataforma).
        </p>
      </section>
    );
  }

  const initialLoading = !centersData && !centersErr;

  if (initialLoading) {
    return (
      <section className="space-y-6">
        <PujasSectionSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={adminSectionHeaderIconWrap}>
            <IconAdminGavel className="h-7 w-7 text-zinc-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Pujas</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              Publica períodos en disputa por toma. Los clientes ofertan en el catálogo; al adjudicar se genera un
              pedido enviado con reserva de 72 h.
            </p>
          </div>
        </div>
        <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
          Nueva puja
        </button>
      </div>

      {msg ? (
        <AdminInlineAlert variant="success" onDismiss={() => setMsg("")}>
          {msg}
        </AdminInlineAlert>
      ) : null}
      {pageErr ? (
        <p className={`${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
          {pageErr}
        </p>
      ) : null}

      <div className={adminPanelCard}>
        <AdminFiltersRow>
          <AdminFilterSearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Buscar toma, centro o nota…"
          />
          <AdminFilterSelect
            label="Centro"
            value={filterCenter}
            onChange={(v) => {
              setFilterCenter(v);
              setPage(1);
            }}
            options={centerFilterOptions}
          />
          <AdminFilterSelect
            label="Toma"
            value={filterSpace}
            onChange={(v) => {
              setFilterSpace(v);
              setPage(1);
            }}
            options={spaceFilterOptions}
          />
          <AdminFilterSelect
            label="Estado"
            value={filterStatus}
            onChange={(v) => {
              setFilterStatus(v);
              setPage(1);
            }}
            options={AUCTION_STATUS_FILTER_OPTIONS}
          />
          <AdminFilterSelect
            label="Registro"
            value={filterActive}
            onChange={(v) => {
              setFilterActive(v);
              setPage(1);
            }}
            options={ACTIVE_FILTER_OPTIONS}
          />
          <AdminFilterClearButton
            onClick={() => {
              setSearch("");
              setFilterCenter("all");
              setFilterSpace("all");
              setFilterStatus("all");
              setFilterActive("1");
              setPage(1);
            }}
          />
        </AdminFiltersRow>

        {listLoading && !listData ? (
          <PujasSectionSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIconBuilding />}
            title="Sin pujas"
            description="Crea una puja en borrador, complétala y ábrela para recibir ofertas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="w-10 px-2 py-3" scope="col" aria-label="Detalle" />
                  <th className="px-3 py-2">Toma</th>
                  <th className="px-3 py-2">Período alquiler</th>
                  <th className="px-3 py-2">Cierre ofertas</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Oferta alta</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = expandedId === row.id;
                  const stLbl = auctionStatusLabel(row.status, row.status_label);
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-zinc-100 hover:bg-zinc-50/80">
                        <td className="px-2 py-2 align-middle">
                          <AdminAccordionToggle
                            expanded={open}
                            onToggle={() => setExpandedId(open ? null : row.id)}
                            rowId={row.id}
                            controlsId={`puja-detail-${row.id}`}
                          />
                        </td>
                        <td className="max-w-[14rem] px-3 py-2">
                          <span className="block truncate font-medium text-zinc-900">{row.ad_space_code}</span>
                          <span className="block truncate text-xs text-zinc-500">{row.ad_space_title}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-800">
                          {formatAuctionDate(row.start_date)} — {formatAuctionDate(row.end_date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-800">
                          {formatAuctionDateTime(row.closes_at)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${auctionStatusPillClassName(row.status)}`}
                          >
                            {stLbl}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatUsd(row.high_bid_usd)}</td>
                        <td className="px-2 py-2 text-right align-middle">
                          <AdminRowActions
                            onView={() => setExpandedId(open ? null : row.id)}
                            onEdit={() => openEdit(row)}
                            showEdit={row.status === "draft"}
                            showDelete={false}
                          />
                        </td>
                      </tr>
                      {open ? (
                        <AdminAccordionRowPanel colSpan={7} panelId={`puja-detail-${row.id}`}>
                          <AdminAccordionDetailHeader
                            titleLabel="Puja"
                            titleLine={[row.ad_space_code, row.ad_space_title].filter(Boolean).join(" — ")}
                          />
                          <AdminDetailInset className="mt-4 grid gap-4 sm:grid-cols-2">
                            <AdminDetailField label="Centro">{row.shopping_center_name || adminDetailEmpty("")}</AdminDetailField>
                            <AdminDetailField label="Mínimo inicial">{formatUsd(row.minimum_bid_usd)}</AdminDetailField>
                            <AdminDetailField label="Siguiente oferta mín.">
                              {formatUsd(row.minimum_next_bid_usd)}
                            </AdminDetailField>
                            <AdminDetailField label="Ofertas">{row.bid_count ?? 0}</AdminDetailField>
                            <AdminDetailField label="Apertura">{formatAuctionDateTime(row.opens_at)}</AdminDetailField>
                            <AdminDetailField label="Cierre">{formatAuctionDateTime(row.closes_at)}</AdminDetailField>
                            {row.order_id ? (
                              <AdminDetailField label="Pedido">#{row.order_id}</AdminDetailField>
                            ) : null}
                            <div className="flex flex-wrap gap-2 sm:col-span-2">
                              {row.status === "draft" ? (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  className={adminPrimaryBtn}
                                  onClick={() => void runAction(`/api/admin/auctions/${row.id}/open/`, "Puja abierta.")}
                                >
                                  Abrir puja
                                </button>
                              ) : null}
                              {row.status === "open" ? (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  className={adminSecondaryBtn}
                                  onClick={() => void runAction(`/api/admin/auctions/${row.id}/close/`, "Puja cerrada.")}
                                >
                                  Cerrar recepción
                                </button>
                              ) : null}
                              {(row.status === "open" || row.status === "closed") && (row.bid_count ?? 0) > 0 ? (
                                <button
                                  type="button"
                                  className={adminPrimaryBtn}
                                  onClick={() => {
                                    setAwardRow(row);
                                    setAwardBidId("");
                                  }}
                                >
                                  Adjudicar
                                </button>
                              ) : null}
                              {row.status !== "awarded" && row.status !== "cancelled" ? (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  className={adminSecondaryBtn}
                                  onClick={() => void runAction(`/api/admin/auctions/${row.id}/cancel/`, "Puja cancelada.")}
                                >
                                  Cancelar
                                </button>
                              ) : null}
                            </div>
                            {Array.isArray(row.bids) && row.bids.length > 0 ? (
                              <div className="sm:col-span-2">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                  Ofertas recibidas
                                </p>
                                <ul className="space-y-1 text-sm text-zinc-800">
                                  {row.bids.map((b) => (
                                    <li key={b.id}>
                                      {b.client_name} — {formatUsd(b.amount_usd)}{" "}
                                      <span className="text-zinc-500">({formatAuctionDateTime(b.created_at)})</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </AdminDetailInset>
                        </AdminAccordionRowPanel>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} />
      </div>

      <AdminModal
        open={modal === "edit"}
        title={editRow ? "Editar puja" : "Nueva puja"}
        onClose={() => setModal(null)}
      >
        {modalErr ? (
          <p className="mb-4 text-sm text-red-800" role="alert">
            {modalErr}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={adminLabel}>Centro</label>
            <AdminSelect
              value={modalCenterId}
              onChange={(v) => {
                setModalCenterId(v);
                setAdSpaceId("");
              }}
              options={modalCenterOptions}
              isDisabled={editRow && editRow.status !== "draft"}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel}>Toma</label>
            <AdminSelect
              value={adSpaceId}
              onChange={setAdSpaceId}
              options={modalSpaceOptions}
              isDisabled={!modalCenterId || (editRow && editRow.status !== "draft")}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="auction-start">
              Inicio alquiler
            </label>
            <input
              id="auction-start"
              type="date"
              className={fieldClass("start_date")}
              value={startDate}
              disabled={editRow && editRow.status !== "draft"}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="auction-end">
              Fin alquiler
            </label>
            <input
              id="auction-end"
              type="date"
              className={fieldClass("end_date")}
              value={endDate}
              disabled={editRow && editRow.status !== "draft"}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="auction-opens">
              Apertura ofertas
            </label>
            <input
              id="auction-opens"
              type="datetime-local"
              className={fieldClass("opens_at")}
              value={opensAt}
              disabled={editRow && editRow.status !== "draft"}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="auction-closes">
              Cierre ofertas
            </label>
            <input
              id="auction-closes"
              type="datetime-local"
              className={fieldClass("closes_at")}
              value={closesAt}
              disabled={editRow && editRow.status !== "draft"}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="auction-min">
              Oferta mínima (USD)
            </label>
            <input
              id="auction-min"
              type="number"
              step="0.01"
              className={fieldClass("minimum_bid_usd")}
              value={minimumBid}
              disabled={editRow && editRow.status !== "draft"}
              onChange={(e) => setMinimumBid(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel} htmlFor="auction-note">
              Nota interna
            </label>
            <textarea
              id="auction-note"
              rows={2}
              className={fieldClass("note")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={adminSecondaryBtn} onClick={() => setModal(null)}>
            Cancelar
          </button>
          <button type="button" className={adminPrimaryBtn} onClick={() => void saveAuction()}>
            Guardar
          </button>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(awardRow)}
        title="Adjudicar puja"
        confirmLabel="Adjudicar"
        onClose={() => {
          setAwardRow(null);
          setAwardBidId("");
        }}
        onConfirm={confirmAward}
      >
        <p>
          Se creará un pedido enviado para el cliente de la oferta elegida, con reserva de 72 h.
        </p>
        <div className="mt-4">
          <AdminSelect value={awardBidId} onChange={setAwardBidId} options={awardBidOptions} />
        </div>
      </AdminConfirmDialog>
    </section>
  );
}
