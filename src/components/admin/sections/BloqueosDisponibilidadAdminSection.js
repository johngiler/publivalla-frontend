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
import { AdminCreatePlusIcon } from "@/components/admin/AdminCreatePlusIcon";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  AdminFilterClearButton,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
  FilterClearAction,
  shouldShowAdminListFilters,
} from "@/components/admin/AdminListFilters";
import {
  adminField,
  adminLabel,
  adminCreateBtnLabel,
  adminPanelCard,
  adminPrimaryBtn,
  adminSecondaryBtn,
  adminSectionHeaderIconWrap,
  adminTableCard,
} from "@/components/admin/adminFormStyles";
import {
  AVAILABILITY_BLOCK_TYPE_FILTER_OPTIONS,
  availabilityBlockTypeLabel,
  availabilityBlockTypePillClassName,
} from "@/components/admin/adminConstants";
import { AdminAvailabilityBlockMonthPicker } from "@/components/admin/AdminAvailabilityBlockMonthPicker";
import { AdminBlockViewAvailabilityCalendar } from "@/components/admin/AdminBlockViewAvailabilityCalendar";
import { IconAdminCalendarBlock } from "@/components/admin/adminIcons";
import {
  AdminDashboardFilterLink,
  dashboardCentrosSearchHref,
} from "@/lib/adminDashboardLinks";
import { CatalogSpaceLink } from "@/components/catalog/CatalogSpaceLink";
import { BloqueosDisponibilidadSectionSkeleton } from "@/components/admin/skeletons/BloqueosDisponibilidadSectionSkeleton";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { availabilityBlocksListPath } from "@/lib/adminListQuery";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  ADMIN_CENTERS_ALL_SWR_KEY,
  ADMIN_SPACES_ALL_SWR_KEY,
  adminCentersAllPagesFetcher,
  adminSpacesAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { formatAvailabilityBlockPeriod } from "@/lib/spaceCalendar";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch } from "@/services/authApi";

const ACTIVE_FILTER_OPTIONS = [
  { v: "all", l: "Vigentes y caducados" },
  { v: "1", l: "Solo vigentes" },
  { v: "0", l: "Solo caducados" },
];

function blockMonthPickFromRow(row) {
  const start = row?.start_date ? String(row.start_date).slice(0, 10) : "";
  const end = row?.end_date ? String(row.end_date).slice(0, 10) : "";
  if (!start || !end) return null;
  return {
    start_date: start,
    end_date: end,
    rental_segments: [{ start_date: start, end_date: end }],
  };
}

function blockEditingPickFromRow(row) {
  const start = row?.start_date ? String(row.start_date).slice(0, 10) : "";
  const end = row?.end_date ? String(row.end_date).slice(0, 10) : "";
  if (!start || !end) return null;
  return { start_date: start, end_date: end };
}

function centerCentrosFilterHref(row) {
  const name = String(row?.shopping_center_name ?? "").trim();
  const slug = String(row?.shopping_center_slug ?? "").trim();
  const q = slug || name;
  return q ? dashboardCentrosSearchHref(q) : null;
}

function activePillClass(active) {
  return active
    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

export function BloqueosDisponibilidadAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterSpace, setFilterSpace] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const filtersActive =
    debouncedSearch.trim() !== "" ||
    filterCenter !== "all" ||
    filterSpace !== "all" ||
    filterType !== "all" ||
    filterActive !== "all";
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [modal, setModal] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const [modalCenterId, setModalCenterId] = useState("");
  const [adSpaceId, setAdSpaceId] = useState("");
  const [monthSelection, setMonthSelection] = useState(null);
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
      { v: "all", l: "Todos los espacios publicitarios" },
      ...spacesForFilter.map((s) => ({
        v: String(s.id),
        l: [s.code, s.title].filter(Boolean).join(" — ") || `Espacio #${s.id}`,
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
      { v: "", l: "Selecciona el espacio publicitario" },
      ...spacesForModal.map((s) => ({
        v: String(s.id),
        l: [s.code, s.title].filter(Boolean).join(" — ") || `Espacio #${s.id}`,
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
    authReady && accessToken
      ? availabilityBlocksListPath(
          page,
          debouncedSearch,
          filterCenter === "all" ? "" : filterCenter,
          filterSpace === "all" ? "" : filterSpace,
          filterType,
          filterActive,
        )
      : null;

  const {
    data: listData,
    error: listErr,
    isLoading: listLoading,
    mutate: mutateBlocks,
  } = useSWR(listKey, authJsonFetcher, { keepPreviousData: true });

  const rows = useMemo(
    () => (listData ? parsePaginatedResponse(listData).results : []),
    [listData],
  );
  const totalCount = useMemo(
    () => (listData ? parsePaginatedResponse(listData).count : 0),
    [listData],
  );
  const showListSkeleton = listLoading && !listData;

  const reload = useCallback(async () => {
    await mutateBlocks();
    await revalidateHomeCatalog(globalMutate);
    await globalMutate(ADMIN_SPACES_ALL_SWR_KEY);
  }, [mutateBlocks]);

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
  }, [page, debouncedSearch, filterCenter, filterSpace, filterType, filterActive]);

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
    setMonthSelection(null);
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
    const start = row.start_date ? String(row.start_date).slice(0, 10) : "";
    const end = row.end_date ? String(row.end_date).slice(0, 10) : "";
    setMonthSelection(
      start && end ? { start_date: start, end_date: end, rental_segments: [{ start_date: start, end_date: end }] } : null,
    );
    setNote(row.note || "");
    setIsActive(row.is_active !== false);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  async function saveBlock() {
    setModalErr("");
    setFieldErrors({});
    const segments = monthSelection?.rental_segments ?? [];
    if (!segments.length) {
      setModalErr("Selecciona al menos un mes en el calendario.");
      return;
    }
    const base = {
      ad_space: Number(adSpaceId),
      note: note.trim(),
      is_active: isActive,
    };
    try {
      for (const seg of segments) {
        await authFetch("/api/admin/availability-blocks/", {
          method: "POST",
          body: {
            ...base,
            start_date: seg.start_date,
            end_date: seg.end_date,
          },
        });
      }
      if (editRow?.id) {
        await authFetch(`/api/admin/availability-blocks/${editRow.id}/`, {
          method: "DELETE",
        });
      }
      const n = segments.length;
      setMsg(
        editRow?.id
          ? n === 1
            ? "Bloqueo actualizado."
            : `Bloqueo actualizado (${n} tramos).`
          : n === 1
            ? "Bloqueo creado."
            : `${n} bloqueos creados.`,
      );
      setModal(null);
      await reload();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "No se pudo guardar el bloqueo.");
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    try {
      await authFetch(`/api/admin/availability-blocks/${deleteTargetId}/`, {
        method: "DELETE",
      });
      setMsg("Bloqueo eliminado.");
      setDeleteTargetId(null);
      await reload();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "No se pudo eliminar el bloqueo.");
      setDeleteTargetId(null);
    }
  }

  const initialLoading = !centersData && !centersErr;

  if (initialLoading) {
    return <BloqueosDisponibilidadSectionSkeleton />;
  }

  return (
    <>
      <div className={adminPanelCard}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconAdminCalendarBlock className="!h-8 !w-8" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bloqueos de disponibilidad</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {totalCount} bloqueo{totalCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
            <AdminCreatePlusIcon />
            <span className={adminCreateBtnLabel}>Nuevo bloqueo</span>
          </button>
        </div>

        {msg ? (
          <p className={`mt-4 ${ROUNDED_CONTROL} bg-emerald-50 px-3 py-2 text-sm text-emerald-900`}>
            {msg}
          </p>
        ) : null}
        {pageErr ? (
          <p
            className={`mt-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
            role="alert"
          >
            {pageErr}
          </p>
        ) : null}

        {!shouldShowAdminListFilters(totalCount, filtersActive) ? (
          showListSkeleton ? (
            <div className={`mt-6 ${adminTableCard}`} aria-busy="true">
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={<EmptyStateIconBuilding />}
                title="Sin bloqueos"
                description="Crea un bloqueo para marcar fechas no disponibles en el catálogo."
              />
            </div>
          )
        ) : (
          <>
            <AdminFiltersRow>
              <AdminFilterSearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Buscar espacio publicitario, centro o nota…"
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
                label="Espacio publicitario"
                value={filterSpace}
                onChange={(v) => {
                  setFilterSpace(v);
                  setPage(1);
                }}
                options={spaceFilterOptions}
              />
              <AdminFilterSelect
                label="Estado"
                value={filterType}
                onChange={(v) => {
                  setFilterType(v);
                  setPage(1);
                }}
                options={AVAILABILITY_BLOCK_TYPE_FILTER_OPTIONS}
              />
              <AdminFilterSelect
                label="Vigencia"
                value={filterActive}
                onChange={(v) => {
                  setFilterActive(v);
                  setPage(1);
                }}
                options={ACTIVE_FILTER_OPTIONS}
              />
              <AdminFilterClearButton
                show={filtersActive}
                onClick={() => {
                  setSearch("");
                  setFilterCenter("all");
                  setFilterSpace("all");
                  setFilterType("all");
                  setFilterActive("all");
                  setPage(1);
                }}
              />
            </AdminFiltersRow>

            {rows.length === 0 && filtersActive ? (
              <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ningún bloqueo coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction
                    onClick={() => {
                      setSearch("");
                      setFilterCenter("all");
                      setFilterSpace("all");
                      setFilterType("all");
                      setFilterActive("all");
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {listLoading && !listData ? (
              <div className={`mt-6 ${adminTableCard}`} aria-busy="true">
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4].map((k) => (
                    <div key={k} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                  ))}
                </div>
              </div>
            ) : rows.length > 0 ? (
              <div className={`mt-6 ${adminTableCard}`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/90">
                        <th className="w-10 px-2 py-3" scope="col" aria-label="Detalle" />
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Espacio publicitario
                        </th>
                        <th className="hidden px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:table-cell">
                          Centro
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Periodo
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Estado
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Vigente
                        </th>
                        <th className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Acciones
                        </th>
                      </tr>
                    </thead>
              <tbody>
                {rows.map((row) => {
                  const open = expandedId === row.id;
                  const typeLbl = availabilityBlockTypeLabel(row.type, row.type_label);
                  const centerName = String(row.shopping_center_name ?? "").trim();
                  const centerHref = centerCentrosFilterHref(row);
                  const epCode = String(row.ad_space_code ?? "").trim();
                  const epTitle = String(row.ad_space_title ?? "").trim();
                  const epLabel = [epCode, epTitle].filter(Boolean).join(" — ") || "Espacio publicitario";
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-zinc-100 hover:bg-zinc-50/80">
                        <td className="px-2 py-2 align-middle">
                          <AdminAccordionToggle
                            expanded={open}
                            onToggle={() => setExpandedId(open ? null : row.id)}
                            rowId={row.id}
                            controlsId={`bloqueo-detail-${row.id}`}
                          />
                        </td>
                        <td className="max-w-[14rem] px-3 py-2 align-middle">
                          <CatalogSpaceLink
                            spaceId={row.ad_space}
                            variant="mono"
                            className="block truncate font-semibold tracking-tight text-zinc-900"
                          >
                            {row.ad_space_code || "—"}
                          </CatalogSpaceLink>
                          <CatalogSpaceLink
                            spaceId={row.ad_space}
                            className="block truncate text-xs text-zinc-500"
                          >
                            {row.ad_space_title || "—"}
                          </CatalogSpaceLink>
                        </td>
                        <td className="hidden max-w-[10rem] truncate px-3 py-2 md:table-cell">
                          {centerHref ? (
                            <AdminDashboardFilterLink
                              href={centerHref}
                              className="block truncate"
                              title={centerName}
                            >
                              {centerName}
                            </AdminDashboardFilterLink>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-zinc-800">
                          {formatAvailabilityBlockPeriod(row.start_date, row.end_date)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${availabilityBlockTypePillClassName(row.type)}`}
                          >
                            {typeLbl}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${activePillClass(row.is_active)}`}
                          >
                            {row.is_active ? "Sí" : "No"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right align-middle">
                          <AdminRowActions
                            onView={() => setExpandedId(open ? null : row.id)}
                            onEdit={() => openEdit(row)}
                            onDelete={() => setDeleteTargetId(row.id)}
                          />
                        </td>
                      </tr>
                      {open ? (
                        <AdminAccordionRowPanel colSpan={7} panelId={`bloqueo-detail-${row.id}`}>
                          <AdminAccordionDetailHeader
                            titleLabel="Bloqueo"
                            titleLine={epLabel}
                          />
                          <AdminDetailInset className="mt-4 grid gap-4 sm:grid-cols-2">
                            <AdminDetailField label="Espacio publicitario">
                              {row.ad_space ? (
                                <CatalogSpaceLink spaceId={row.ad_space} className="line-clamp-2">
                                  {epLabel}
                                </CatalogSpaceLink>
                              ) : (
                                adminDetailEmpty("")
                              )}
                            </AdminDetailField>
                            <AdminDetailField label="Centro">
                              {centerHref ? (
                                <AdminDashboardFilterLink href={centerHref}>
                                  {centerName}
                                </AdminDashboardFilterLink>
                              ) : (
                                adminDetailEmpty("")
                              )}
                            </AdminDetailField>
                            <AdminDetailField label="Estado">{typeLbl}</AdminDetailField>
                            <AdminDetailField label="Periodo">
                              {formatAvailabilityBlockPeriod(row.start_date, row.end_date)}
                            </AdminDetailField>
                            <AdminDetailField label="Activo">{row.is_active ? "Sí" : "No"}</AdminDetailField>
                            <div className="sm:col-span-2">
                              <AdminDetailField label="Nota interna">
                                {row.note?.trim() ? row.note : adminDetailEmpty("")}
                              </AdminDetailField>
                            </div>
                          </AdminDetailInset>
                          <div className="mt-6 border-t border-zinc-200/90 pt-6">
                            <AdminBlockViewAvailabilityCalendar
                              panelId={`bloqueo-detail-${row.id}`}
                              adSpaceId={row.ad_space}
                              pickSync={blockMonthPickFromRow(row)}
                              editingPick={blockEditingPickFromRow(row)}
                              periodLabel={formatAvailabilityBlockPeriod(
                                row.start_date,
                                row.end_date,
                              )}
                            />
                          </div>
                        </AdminAccordionRowPanel>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} pageSize={50} />
          </>
        )}
      </div>

      <AdminModal
        open={modal === "edit"}
        title={editRow ? "Editar bloqueo" : "Nuevo bloqueo"}
        subtitle="Las fechas bloqueadas dejan de mostrarse como disponibles en el catálogo y no se pueden reservar."
        onClose={() => setModal(null)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={adminSecondaryBtn} onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="button" className={adminPrimaryBtn} onClick={saveBlock}>
              Guardar
            </button>
          </div>
        }
      >
          {modalErr ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {modalErr}
            </p>
          ) : null}
          <div className="space-y-4">
            <div>
              <label className={adminLabel} htmlFor="bloqueo-centro">
                Centro comercial
              </label>
              <AdminSelect
                inputId="bloqueo-centro"
                value={modalCenterId}
                onChange={(v) => {
                  setModalCenterId(v);
                  setAdSpaceId("");
                }}
                options={modalCenterOptions}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="bloqueo-toma">
                Espacio publicitario
              </label>
              <AdminSelect
                inputId="bloqueo-toma"
                value={adSpaceId}
                onChange={(v) => {
                  setAdSpaceId(v);
                  setMonthSelection(null);
                }}
                options={modalSpaceOptions}
                isDisabled={!modalCenterId}
              />
            </div>
            <div>
              <AdminAvailabilityBlockMonthPicker
                adSpaceId={adSpaceId}
                pickSync={monthSelection}
                editingPick={
                  editRow?.start_date && editRow?.end_date
                    ? {
                        start_date: String(editRow.start_date).slice(0, 10),
                        end_date: String(editRow.end_date).slice(0, 10),
                      }
                    : null
                }
                onSelectionChange={setMonthSelection}
              />
              {fieldErrors?.start_date || fieldErrors?.end_date ? (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {fieldErrors.start_date || fieldErrors.end_date}
                </p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="bloqueo-nota">
                Nota interna (opcional)
              </label>
              <textarea
                id="bloqueo-nota"
                rows={2}
                className={fieldClass("note")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mp-ring-brand size-4 rounded border-zinc-300"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Bloqueo vigente (ocupa fechas en calendario y reservas en ese rango)
            </label>
          </div>
      </AdminModal>

      <AdminConfirmDialog
        open={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        title="Eliminar bloqueo"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
      >
        <p>
          Se quitará este rango de fechas bloqueadas. El catálogo podrá mostrar esos meses como disponibles de nuevo.
        </p>
      </AdminConfirmDialog>
    </>
  );
}
