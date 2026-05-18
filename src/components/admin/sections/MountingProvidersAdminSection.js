"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailSection,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  adminField,
  adminLabel,
  adminPanelCard,
  adminPrimaryBtn,
  adminSecondaryBtn,
  adminSectionHeaderIconWrap,
} from "@/components/admin/adminFormStyles";
import { IconAdminHardHat } from "@/components/admin/adminIcons";
import { MountingProvidersSectionSkeleton } from "@/components/admin/skeletons/MountingProvidersSectionSkeleton";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { mountingProvidersListPath } from "@/lib/adminListQuery";
import {
  ADMIN_CENTERS_ALL_SWR_KEY,
  adminCentersAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch } from "@/services/authApi";
import {
  AdminFilterClearButton,
  AdminFilterResultHint,
  AdminFilterSearchInput,
  AdminFilterSelect,
  AdminFiltersRow,
  FilterClearAction,
  shouldShowAdminListFilters,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

const ACTIVE_FILTER_OPTIONS = [
  { v: "all", l: "Activos e inactivos" },
  { v: "1", l: "Solo activos" },
  { v: "0", l: "Solo inactivos" },
];

function activePillClass(active) {
  return active
    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

export function MountingProvidersAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const filtersActive =
    debouncedSearch.trim() !== "" || filterCenter !== "all" || filterActive !== "all";
  const [expandedId, setExpandedId] = useState(null);
  /** Centro elegido en el modal (edición o alta con un solo centro). */
  const [modalShoppingCenterId, setModalShoppingCenterId] = useState("");
  /** Alta: varios centros (misma ficha de proveedor en cada CC). */
  const [modalShoppingCenterIds, setModalShoppingCenterIds] = useState([]);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [modal, setModal] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [rif, setRif] = useState("");
  const [notes, setNotes] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const centersAllKey = authReady && accessToken ? ADMIN_CENTERS_ALL_SWR_KEY : null;
  const {
    data: centersData,
    error: centersSwrError,
    isLoading: centersLoading,
  } = useSWR(centersAllKey, adminCentersAllPagesFetcher);

  const centers = useMemo(
    () => (Array.isArray(centersData) ? centersData : []),
    [centersData],
  );

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

  const centerOptionsForCreate = useMemo(
    () => [
      { v: "", l: "Selecciona un centro comercial" },
      ...centers.map((c) => ({
        v: c.id,
        l: [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`,
      })),
    ],
    [centers],
  );

  const centerOptionsForEdit = useMemo(
    () =>
      centers.map((c) => ({
        v: c.id,
        l: [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`,
      })),
    [centers],
  );

  const centerOptionsForCreateMulti = useMemo(
    () =>
      centers.map((c) => ({
        v: c.id,
        l: [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`,
      })),
    [centers],
  );

  const centerLabelById = useCallback(
    (id) => {
      const c = centers.find((x) => String(x.id) === String(id));
      if (!c) return id != null && id !== "" ? `Centro #${id}` : "—";
      return [c.name, c.city].filter(Boolean).join(" · ") || `Centro #${c.id}`;
    },
    [centers],
  );

  const centersLabelForRow = useCallback(
    (row) => {
      const names = Array.isArray(row?.shopping_center_names)
        ? row.shopping_center_names.filter(Boolean)
        : [];
      if (names.length > 0) return names.join(", ");
      const ids = Array.isArray(row?.shopping_center_ids)
        ? row.shopping_center_ids
        : row?.shopping_center != null
          ? [row.shopping_center]
          : [];
      if (ids.length === 0) return "—";
      return ids.map((id) => centerLabelById(id)).join(", ");
    },
    [centerLabelById],
  );

  const listKey =
    authReady && accessToken
      ? mountingProvidersListPath(
          page,
          debouncedSearch,
          filterCenter !== "all" ? filterCenter : "",
          filterActive,
        )
      : null;
  const {
    data: listData,
    error: listSwrError,
    isLoading: listLoading,
    mutate: mutateProviders,
  } = useSWR(listKey, authJsonFetcher, { keepPreviousData: true });

  const rows = useMemo(
    () => (listData ? parsePaginatedResponse(listData).results : []),
    [listData],
  );
  const totalCount = useMemo(
    () => (listData ? parsePaginatedResponse(listData).count : 0),
    [listData],
  );

  const reloadProviders = useCallback(async () => {
    await mutateProviders();
    await globalMutate(ADMIN_CENTERS_ALL_SWR_KEY);
    await revalidateHomeCatalog(globalMutate);
  }, [mutateProviders]);

  useEffect(() => {
    setPageErr(
      centersSwrError
        ? centersSwrError instanceof Error
          ? centersSwrError.message
          : String(centersSwrError)
        : listSwrError
          ? listSwrError instanceof Error
            ? listSwrError.message
            : String(listSwrError)
          : "",
    );
  }, [centersSwrError, listSwrError]);

  useEffect(() => {
    setExpandedId(null);
  }, [page, debouncedSearch, filterCenter, filterActive]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterCenter("all");
    setFilterActive("all");
    setPage(1);
  }, []);

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  function openCreate() {
    setEditRow(null);
    setModalShoppingCenterId("");
    setModalShoppingCenterIds([]);
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setRif("");
    setNotes("");
    setSortOrder("0");
    setIsActive(true);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  function openEdit(row) {
    setEditRow(row);
    const ids = Array.isArray(row?.shopping_center_ids)
      ? row.shopping_center_ids.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0)
      : row?.shopping_center != null
        ? [Number(row.shopping_center)].filter((n) => Number.isFinite(n) && n > 0)
        : [];
    setModalShoppingCenterIds(ids);
    setModalShoppingCenterId(ids[0] != null ? String(ids[0]) : "");
    setCompanyName(String(row.company_name || ""));
    setContactName(String(row.contact_name || ""));
    setPhone(String(row.phone || ""));
    setEmail(String(row.email || ""));
    setRif(String(row.rif || ""));
    setNotes(String(row.notes || ""));
    setSortOrder(String(row.sort_order ?? 0));
    setIsActive(row.is_active !== false);
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  async function saveProvider() {
    const name = companyName.trim();
    if (!name) {
      setModalErr("Revisa los campos marcados.");
      setFieldErrors({ company_name: "Campo obligatorio." });
      return;
    }
    if (editRow) {
      const editIds = modalShoppingCenterIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (editIds.length === 0) {
        setModalErr("Revisa los campos marcados.");
        setFieldErrors({ shopping_center_ids: "Selecciona al menos un centro comercial." });
        return;
      }
    } else {
      const ids = modalShoppingCenterIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) {
        setModalErr("Revisa los campos marcados.");
        setFieldErrors({ shopping_center_ids: "Selecciona al menos un centro comercial." });
        return;
      }
    }
    setModalErr("");
    setMsg("");
    setFieldErrors({});
    const so = Number.parseInt(String(sortOrder).trim(), 10);
    const payload = {
      company_name: name,
      contact_name: contactName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      rif: rif.trim(),
      notes: notes.trim(),
      sort_order: Number.isFinite(so) && so >= 0 ? so : 0,
      is_active: Boolean(isActive),
    };
    try {
      if (editRow) {
        const editIds = Array.from(
          new Set(
            modalShoppingCenterIds
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n) && n > 0),
          ),
        );
        await authFetch(`/api/admin/mounting-providers/${editRow.id}/`, {
          method: "PATCH",
          body: {
            ...payload,
            shopping_center_ids: editIds,
          },
        });
        setMsg("Proveedor actualizado.");
      } else {
        const ids = Array.from(
          new Set(
            modalShoppingCenterIds
              .map((n) => Number(n))
              .filter((n) => Number.isFinite(n) && n > 0),
          ),
        );
        await authFetch("/api/admin/mounting-providers/", {
          method: "POST",
          body: {
            ...payload,
            shopping_center_ids: ids,
          },
        });
        setMsg(
          ids.length > 1
            ? `Proveedor registrado en ${ids.length} centros comerciales.`
            : "Proveedor creado.",
        );
      }
      setModal(null);
      setEditRow(null);
      setModalShoppingCenterId("");
      setModalShoppingCenterIds([]);
      await reloadProviders();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  async function executeDelete(id) {
    setPageErr("");
    setMsg("");
    try {
      await authFetch(`/api/admin/mounting-providers/${id}/`, { method: "DELETE" });
      setMsg("Proveedor eliminado.");
      if (expandedId === id) setExpandedId(null);
      await reloadProviders();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setDeleteTargetId(null);
    }
  }

  const ready =
    !(authReady && accessToken) ||
    (!centersLoading && (centersData !== undefined || centersSwrError !== undefined));

  const showListSkeleton =
    Boolean(listKey) && listLoading && !listSwrError && listData == null;

  if (!ready) {
    return (
      <div className={adminPanelCard}>
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`hidden shrink-0 animate-pulse sm:block sm:size-14 ${ROUNDED_CONTROL} bg-zinc-200/80`}
            aria-hidden
          />
          <div className="space-y-2">
            <div className={`h-7 w-56 animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`} />
            <div className={`h-4 w-72 max-w-full animate-pulse ${ROUNDED_CONTROL} bg-zinc-200/80`} />
          </div>
        </div>
        <MountingProvidersSectionSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className={adminPanelCard}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconAdminHardHat className="!h-8 !w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Proveedores de montaje</h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {centers.length === 0
                  ? "Empresas autorizadas por centro; se muestran en el detalle de cada toma del catálogo."
                  : `${totalCount} proveedor${totalCount === 1 ? "" : "es"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={centers.length === 0}
            onClick={() => openCreate()}
            className={`${adminPrimaryBtn} px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Añadir proveedor
          </button>
        </div>

        {msg ? (
          <p className={`mb-4 ${ROUNDED_CONTROL} bg-emerald-50 px-3 py-2 text-sm text-emerald-900`}>{msg}</p>
        ) : null}
        {pageErr ? (
          <p className={`mb-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}>{pageErr}</p>
        ) : null}

        {centers.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIconBuilding />}
            title="No hay centros comerciales"
            description="Crea un centro en la sección Centros comerciales antes de registrar proveedores de montaje."
          />
        ) : !shouldShowAdminListFilters(totalCount, filtersActive) ? (
          showListSkeleton ? (
            <div className={`mt-6 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4`} aria-busy="true">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={<EmptyStateIconBuilding />}
                title="Sin proveedores"
                description="Usa «Añadir proveedor» y elige el centro comercial en el formulario."
              />
            </div>
          )
        ) : (
          <>
            <AdminFiltersRow>
              <AdminFilterSearchInput
                id="mounting-providers-filter-search"
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Empresa, contacto, RIF, correo o teléfono…"
              />
              <AdminFilterSelect
                id="mounting-providers-filter-center"
                label="Centro"
                value={filterCenter}
                onChange={(v) => {
                  setFilterCenter(v);
                  setPage(1);
                }}
                options={centerFilterOptions}
              />
              <AdminFilterSelect
                id="mounting-providers-filter-active"
                label="Estado registro"
                value={filterActive}
                onChange={(v) => {
                  setFilterActive(v);
                  setPage(1);
                }}
                options={ACTIVE_FILTER_OPTIONS}
              />
              <AdminFilterClearButton show={filtersActive} onClick={clearFilters} />
            </AdminFiltersRow>

            <AdminFilterResultHint shown={rows.length} total={totalCount} noun="proveedores" />

            {rows.length === 0 && filtersActive && !showListSkeleton ? (
              <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ningún proveedor coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction onClick={clearFilters} />
                </div>
              </div>
            ) : null}

            {showListSkeleton ? (
              <MountingProvidersSectionSkeleton />
            ) : rows.length > 0 ? (
          <div className={`mt-6 overflow-x-auto ${ROUNDED_CONTROL} border border-zinc-200`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="w-10 px-2 py-3" aria-hidden />
                  <th className="min-w-[8rem] px-3 py-2">Centro</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Contacto</th>
                  <th className="px-3 py-2">Teléfono</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = expandedId === row.id;
                  const panelId = `mounting-provider-${row.id}`;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-t border-zinc-100">
                        <td className="px-2 py-2 align-middle">
                          <AdminAccordionToggle
                            expanded={open}
                            onToggle={() => setExpandedId(open ? null : row.id)}
                            rowId={row.id}
                            controlsId={panelId}
                          />
                        </td>
                        <td className="max-w-[10rem] px-3 py-2 align-middle text-xs text-zinc-700 sm:text-sm">
                          <span className="line-clamp-2 leading-snug">{centersLabelForRow(row)}</span>
                        </td>
                        <td className="max-w-[12rem] px-3 py-2 align-middle font-semibold text-zinc-900">
                          <span className="line-clamp-2">{row.company_name || "—"}</span>
                        </td>
                        <td className="max-w-[10rem] px-3 py-2 align-middle text-zinc-700">
                          <span className="line-clamp-2">{row.contact_name?.trim() || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 align-middle text-zinc-600">
                          {row.phone?.trim() || "—"}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${activePillClass(
                              row.is_active !== false,
                            )}`}
                          >
                            {row.is_active !== false ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 align-middle text-right">
                          <AdminRowActions
                            onView={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                            onEdit={() => openEdit(row)}
                            onDelete={() => setDeleteTargetId(row.id)}
                            viewLabel="Ver detalle del proveedor"
                          />
                        </td>
                      </tr>
                      {open ? (
                        <AdminAccordionRowPanel colSpan={7} panelId={panelId} fullWidthContent>
                          <AdminAccordionDetailHeader
                            titleLabel="Proveedor"
                            titleLine={String(row.company_name || "").trim() || "Proveedor"}
                            hint="Datos completos y notas internas"
                          />
                          <div className="mt-4">
                            <AdminDetailSection panelId={panelId} sectionId="detail" title="Detalle">
                              <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                                <AdminDetailField label="Centros comerciales">
                                  {centersLabelForRow(row)}
                                </AdminDetailField>
                                <AdminDetailField label="Correo">
                                  {row.email?.trim() ? (
                                    <a
                                      href={`mailto:${encodeURIComponent(row.email.trim())}`}
                                      className="break-all font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                    >
                                      {row.email.trim()}
                                    </a>
                                  ) : (
                                    adminDetailEmpty("")
                                  )}
                                </AdminDetailField>
                                <AdminDetailField label="RIF">
                                  {row.rif?.trim() ? (
                                    <span className="font-mono text-zinc-800">{row.rif.trim()}</span>
                                  ) : (
                                    adminDetailEmpty("")
                                  )}
                                </AdminDetailField>
                                <AdminDetailField label="Orden de listado">
                                  {row.sort_order != null ? String(row.sort_order) : "0"}
                                </AdminDetailField>
                                <AdminDetailField label="Alta">
                                  {row.created_at
                                    ? new Date(row.created_at).toLocaleString("es-VE")
                                    : adminDetailEmpty("")}
                                </AdminDetailField>
                                <div className="sm:col-span-2">
                                  <AdminDetailField label="Notas">
                                    {row.notes?.trim() ? (
                                      <span className="whitespace-pre-wrap text-zinc-800">{row.notes.trim()}</span>
                                    ) : (
                                      adminDetailEmpty("")
                                    )}
                                  </AdminDetailField>
                                </div>
                              </AdminDetailInset>
                            </AdminDetailSection>
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

            <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} pageSize={50} />
          </>
        )}
      </div>

      <AdminModal
        open={modal === "edit"}
        onClose={() => {
          setModal(null);
          setEditRow(null);
          setModalShoppingCenterId("");
          setModalShoppingCenterIds([]);
        }}
        title={editRow ? "Editar proveedor de montaje" : "Nuevo proveedor de montaje"}
        subtitle="Elige uno o más centros comerciales del mismo marketplace y completa los datos del proveedor autorizado para montaje."
        wide
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={`${adminSecondaryBtn} px-4 py-2 text-sm font-semibold`}
              onClick={() => {
                setModal(null);
                setEditRow(null);
                setModalShoppingCenterId("");
                setModalShoppingCenterIds([]);
              }}
            >
              Cancelar
            </button>
            <button type="button" className={`${adminPrimaryBtn} px-4 py-2 text-sm font-semibold`} onClick={() => saveProvider()}>
              Guardar
            </button>
          </div>
        }
      >
        {modalErr ? <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert> : null}
        <div className="space-y-4">
          <div>
            <p className={adminLabel}>
              Centros comerciales <span className="text-red-600">*</span>
            </p>
            <div className="mt-2 max-w-xl">
              <AdminSelect
                id="mp-shopping-centers"
                inputId="mp-shopping-centers-input"
                options={centerOptionsForCreateMulti}
                value={modalShoppingCenterIds}
                onChange={(arr) => {
                  const next = Array.isArray(arr)
                    ? arr.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
                    : [];
                  setModalShoppingCenterIds(next);
                }}
                placeholder="Selecciona uno o más centros…"
                aria-label="Centros comerciales del proveedor de montaje"
                inModal
                isMulti
                isClearable
              />
            </div>
          </div>
          <div>
            <label className={adminLabel} htmlFor="mp-company">
              Nombre de la empresa <span className="text-red-600">*</span>
            </label>
            <input
              id="mp-company"
              className={fieldClass("company_name")}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
            />
            {fieldErrors?.company_name ? (
              <p className="mt-1 text-xs text-rose-700">{fieldErrors.company_name}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabel} htmlFor="mp-contact">
                Persona de contacto
              </label>
              <input
                id="mp-contact"
                className={adminField}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="mp-phone">
                Teléfono
              </label>
              <input id="mp-phone" className={adminField} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="mp-email">
                Correo
              </label>
              <input
                id="mp-email"
                className={adminField}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="mp-rif">
                RIF
              </label>
              <input id="mp-rif" className={adminField} value={rif} onChange={(e) => setRif(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabel} htmlFor="mp-sort">
                Orden en listado
              </label>
              <input
                id="mp-sort"
                className={adminField}
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <p className="mt-1 text-xs text-zinc-500">Número menor = aparece antes en el sitio público.</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-[color:var(--mp-primary)]"
                />
                Activo en catálogo
              </label>
            </div>
          </div>
          <div>
            <label className={adminLabel} htmlFor="mp-notes">
              Notas
            </label>
            <textarea
              id="mp-notes"
              rows={4}
              className={adminField}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        title="Eliminar proveedor"
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTargetId == null) return;
          await executeDelete(deleteTargetId);
        }}
      >
        <p>
          ¿Eliminar este proveedor de montaje? Dejará de mostrarse en las tomas de este centro. Esta acción no se puede
          deshacer.
        </p>
      </AdminConfirmDialog>
    </>
  );
}
