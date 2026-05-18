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
  adminField,
  adminLabel,
  adminPanelCard,
  adminPrimaryBtn,
  adminSecondaryBtn,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import {
  AVAILABILITY_BLOCK_TYPE_FILTER_OPTIONS,
  AVAILABILITY_BLOCK_TYPES,
  availabilityBlockTypeLabel,
  availabilityBlockTypePillClassName,
} from "@/components/admin/adminConstants";
import { IconAdminCalendarBlock } from "@/components/admin/adminIcons";
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
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch } from "@/services/authApi";

const ACTIVE_FILTER_OPTIONS = [
  { v: "all", l: "Activos e inactivos" },
  { v: "1", l: "Solo activos" },
  { v: "0", l: "Solo inactivos" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return String(iso);
    return new Date(y, m - 1, d).toLocaleDateString("es-VE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
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
  const [filterActive, setFilterActive] = useState("1");
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [blockType, setBlockType] = useState("blocked");
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

  const reload = useCallback(async () => {
    await mutateBlocks();
    await revalidateHomeCatalog(globalMutate);
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
    setStartDate("");
    setEndDate("");
    setBlockType("blocked");
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
    setBlockType(row.type || "blocked");
    setNote(row.note || "");
    setIsActive(row.is_active !== false);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  async function saveBlock() {
    setModalErr("");
    setFieldErrors({});
    const payload = {
      ad_space: Number(adSpaceId),
      start_date: startDate,
      end_date: endDate,
      type: blockType,
      note: note.trim(),
      is_active: isActive,
    };
    try {
      if (editRow?.id) {
        await authFetch(`/api/admin/availability-blocks/${editRow.id}/`, {
          method: "PATCH",
          body: payload,
        });
        setMsg("Bloqueo actualizado.");
      } else {
        await authFetch("/api/admin/availability-blocks/", {
          method: "POST",
          body: payload,
        });
        setMsg("Bloqueo creado.");
      }
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
    return (
      <section className="space-y-6">
        <BloqueosDisponibilidadSectionSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={adminSectionHeaderIconWrap}>
            <IconAdminCalendarBlock className="h-7 w-7 text-zinc-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Bloqueos de disponibilidad</h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">
              Reserva fechas en una toma para mantenimiento, acuerdos internos u otros motivos. El catálogo
              y el carrito respetan estos rangos igual que un pedido en curso.
            </p>
          </div>
        </div>
        <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
          Nuevo bloqueo
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
            label="Tipo"
            value={filterType}
            onChange={(v) => {
              setFilterType(v);
              setPage(1);
            }}
            options={AVAILABILITY_BLOCK_TYPE_FILTER_OPTIONS}
          />
          <AdminFilterSelect
            label="Estado registro"
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
              setFilterType("all");
              setFilterActive("1");
              setPage(1);
            }}
          />
        </AdminFiltersRow>

        {listLoading && !listData ? (
          <BloqueosDisponibilidadSectionSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIconBuilding />}
            title="Sin bloqueos"
            description="Crea un bloqueo para marcar fechas no disponibles en el catálogo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="w-10 px-2 py-3" scope="col" aria-label="Detalle" />
                  <th className="px-3 py-2">Toma</th>
                  <th className="hidden px-3 py-2 md:table-cell">Centro</th>
                  <th className="px-3 py-2">Inicio</th>
                  <th className="px-3 py-2">Fin</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Activo</th>
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = expandedId === row.id;
                  const typeLbl = availabilityBlockTypeLabel(row.type, row.type_label);
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
                          <span className="block truncate font-medium text-zinc-900" title={row.ad_space_title}>
                            {row.ad_space_code || "—"}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">{row.ad_space_title}</span>
                        </td>
                        <td className="hidden max-w-[10rem] truncate px-3 py-2 text-zinc-700 md:table-cell">
                          {row.shopping_center_name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-800">
                          {formatDate(row.start_date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-800">
                          {formatDate(row.end_date)}
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
                        <AdminAccordionRowPanel colSpan={8} panelId={`bloqueo-detail-${row.id}`}>
                          <AdminAccordionDetailHeader
                            titleLabel="Bloqueo"
                            titleLine={[row.ad_space_code, row.ad_space_title].filter(Boolean).join(" — ") || "Toma"}
                          />
                          <AdminDetailInset className="mt-4 grid gap-4 sm:grid-cols-2">
                            <AdminDetailField label="Centro">{row.shopping_center_name || adminDetailEmpty("")}</AdminDetailField>
                            <AdminDetailField label="Tipo">{typeLbl}</AdminDetailField>
                            <AdminDetailField label="Inicio">{formatDate(row.start_date)}</AdminDetailField>
                            <AdminDetailField label="Fin">{formatDate(row.end_date)}</AdminDetailField>
                            <AdminDetailField label="Activo">{row.is_active ? "Sí" : "No"}</AdminDetailField>
                            <div className="sm:col-span-2">
                              <AdminDetailField label="Nota interna">
                                {row.note?.trim() ? row.note : adminDetailEmpty("")}
                              </AdminDetailField>
                            </div>
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

        <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} pageSize={50} />
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
                Toma
              </label>
              <AdminSelect
                inputId="bloqueo-toma"
                value={adSpaceId}
                onChange={setAdSpaceId}
                options={modalSpaceOptions}
                isDisabled={!modalCenterId}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={adminLabel} htmlFor="bloqueo-inicio">
                  Fecha inicio
                </label>
                <input
                  id="bloqueo-inicio"
                  type="date"
                  className={fieldClass("start_date")}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="bloqueo-fin">
                  Fecha fin
                </label>
                <input
                  id="bloqueo-fin"
                  type="date"
                  className={fieldClass("end_date")}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={adminLabel} htmlFor="bloqueo-tipo">
                Tipo
              </label>
              <AdminSelect
                inputId="bloqueo-tipo"
                value={blockType}
                onChange={setBlockType}
                options={AVAILABILITY_BLOCK_TYPES.map((t) => ({ v: t.v, l: t.l }))}
              />
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
              Bloqueo activo (afecta catálogo y reservas)
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
    </section>
  );
}
