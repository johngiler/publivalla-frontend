"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailProse,
  AdminDetailSection,
  adminAdSpaceAccordionHeader,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminCreatePlusIcon } from "@/components/admin/AdminCreatePlusIcon";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { IconRowEdit } from "@/components/admin/rowActionIcons";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import {
  adminField,
  adminLabel,
  adminPanelCard,
  adminSectionHeaderIconWrap,
  adminCreateBtnLabel,
  adminPrimaryBtn,
  adminSecondaryBtn,
  adminTableCard,
} from "@/components/admin/adminFormStyles";
import {
  SPACE_STATUS,
  SPACE_TYPES,
  spaceStatusLabel,
  spaceStatusPillClassName,
} from "@/components/admin/adminConstants";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminAdSpaceGalleryField } from "@/components/admin/AdminAdSpaceGalleryField";
import { IconAdminGrid } from "@/components/admin/adminIcons";
import { TomasAdminSectionSkeleton } from "@/components/admin/skeletons/TomasAdminSectionSkeleton";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { ThumbnailPlaceholder } from "@/components/media/ThumbnailPlaceholder";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { EmptyState, EmptyStateIconGrid } from "@/components/ui/EmptyState";
import { spacesAdminListPath } from "@/lib/adminListQuery";
import {
  ADMIN_CENTERS_ALL_SWR_KEY,
  adminCentersAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
import { adminTomaRowLightboxItems } from "@/lib/imageLightboxItems";
import { mediaUrlForUiWithWebp, rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  squareAdminTablePortadaFrameClass,
  squareAdminTablePortadaImgClass,
  squareListImagePreviewButtonRingClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch, authFetchForm } from "@/services/authApi";
import {
  AdminFilterClearButton,
  AdminFiltersRow,
  AdminFilterSearchInput,
  AdminFilterSelect,
  FilterClearAction,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { AdminTomasViewQuerySync } from "@/components/admin/AdminTomasViewQuerySync";
import {
  AdminDashboardFilterLink,
  dashboardCentrosSearchHref,
} from "@/lib/adminDashboardLinks";
import { subtitleCityAfterCenterName } from "@/lib/shoppingCenterDisplay";

const SPACE_STATUS_FILTERS = [{ v: "all", l: "Todos los estados" }, ...SPACE_STATUS];

function TomaCentroComercialValue({ s }) {
  const name = (s?.shopping_center_name || "").trim();
  const slug = (s?.shopping_center_slug || "").trim();
  const cityLine = subtitleCityAfterCenterName(name, s?.shopping_center_city);
  if (!name) return adminDetailEmpty("");
  return (
    <>
      <AdminDashboardFilterLink href={dashboardCentrosSearchHref(slug || name)}>
        {name}
      </AdminDashboardFilterLink>
      {cityLine ? <span className="mt-0.5 block text-xs text-zinc-500">{cityLine}</span> : null}
    </>
  );
}

/** Código de toma: prefijo-T{número}[sufijo]; el prefijo no depende del centro. */
function validateTomaCodeFormat(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "Indica el código del espacio publicitario.";
  if (c.length > 32) return "El código no puede superar 32 caracteres.";
  if (!/^[A-Z0-9][A-Z0-9_-]*-T[0-9]+[A-Z]*$/.test(c)) {
    return "Usa un prefijo (letras, números, guiones o guiones bajos), luego «-T», un número y, si aplica, letras (ej. DEMO-T1, CC-T2A).";
  }
  return null;
}

function buildSpacePayload(fd, values) {
  const {
    code,
    shopping_center,
    type,
    title,
    description,
    monthly_price_usd,
    status,
    width,
    height,
    quantity,
    material,
    location_description,
    level,
    venue_zone,
    double_sided,
    production_specs,
    installation_notes,
    hem_pocket_top_cm,
    is_active,
  } = values;
  fd.append("code", code.trim());
  fd.append("shopping_center", String(shopping_center));
  fd.append("type", type);
  fd.append("title", title.trim());
  fd.append("description", description.trim());
  fd.append("monthly_price_usd", String(monthly_price_usd).trim());
  fd.append("status", status);
  fd.append("double_sided", double_sided ? "true" : "false");
  if (typeof is_active === "boolean") fd.append("is_active", is_active ? "true" : "false");
  if (width.trim()) fd.append("width", width.trim());
  if (height.trim()) fd.append("height", height.trim());
  if (quantity.trim()) fd.append("quantity", quantity.trim());
  if (material.trim()) fd.append("material", material.trim());
  if (location_description.trim()) fd.append("location_description", location_description.trim());
  if (level.trim()) fd.append("level", level.trim());
  if (venue_zone.trim()) fd.append("venue_zone", venue_zone.trim());
  if (production_specs.trim()) fd.append("production_specs", production_specs.trim());
  if (installation_notes.trim()) fd.append("installation_notes", installation_notes.trim());
  if (hem_pocket_top_cm.trim()) fd.append("hem_pocket_top_cm", hem_pocket_top_cm.trim());
}

function spaceTypeLabel(v) {
  const o = SPACE_TYPES.find((t) => t.v === v);
  return o ? o.l : v;
}

function tomaAccordionGalleryImages(s) {
  if (!s) return [];
  if (Array.isArray(s.gallery_images) && s.gallery_images.length > 0) {
    return s.gallery_images;
  }
  if (s.cover_image) return [{ id: -1, image: s.cover_image, sort_order: 0 }];
  return [];
}

export function TomasAdminSection() {
  const { authReady, accessToken } = useAuth();
  const { caps } = useWorkspaceCapabilities();
  const canCreateSpaces = caps.can_create_ad_spaces;
  const { mutate: swrGlobalMutate } = useSWRConfig();
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [galleryLightbox, setGalleryLightbox] = useState({
    open: false,
    items: [],
    initialIndex: 0,
  });
  const [filterQ, setFilterQ] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterSpaceStatus, setFilterSpaceStatus] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const filtersActive =
    filterQ.trim() !== "" || filterCenter !== "all" || filterSpaceStatus !== "all";

  const [shoppingCenter, setShoppingCenter] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("billboard");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [status, setStatus] = useState("available");
  const [isActive, setIsActive] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [material, setMaterial] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [level, setLevel] = useState("");
  const [venueZone, setVenueZone] = useState("");
  const [doubleSided, setDoubleSided] = useState(false);
  const [productionSpecs, setProductionSpecs] = useState("");
  const [installationNotes, setInstallationNotes] = useState("");
  const [hemPocketTopCm, setHemPocketTopCm] = useState("");

  const galleryRef = useRef(null);

  const centersAllKey = authReady && accessToken ? ADMIN_CENTERS_ALL_SWR_KEY : null;
  const {
    data: centersData,
    error: centersSwrError,
    isLoading: centersLoading,
    mutate: mutateCentersAll,
  } = useSWR(centersAllKey, adminCentersAllPagesFetcher);

  const spacesListKey =
    authReady && accessToken
      ? spacesAdminListPath(page, debouncedFilterQ, filterSpaceStatus, filterCenter)
      : null;
  const {
    data: spacesData,
    error: spacesSwrError,
    isLoading: spacesLoading,
    mutate: mutateSpaces,
  } = useSWR(spacesListKey, authJsonFetcher, { keepPreviousData: true });

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
  const rows = useMemo(
    () => (spacesData ? parsePaginatedResponse(spacesData).results : []),
    [spacesData],
  );
  const totalCount = useMemo(
    () => (spacesData ? parsePaginatedResponse(spacesData).count : 0),
    [spacesData],
  );

  const reloadSpaces = useCallback(async () => {
    await mutateSpaces();
    await revalidateHomeCatalog(swrGlobalMutate);
  }, [mutateSpaces, swrGlobalMutate]);

  const ready =
    !(authReady && accessToken) ||
    ((!centersLoading && (centersData !== undefined || centersSwrError !== undefined)) &&
      (!spacesLoading && (spacesData !== undefined || spacesSwrError !== undefined)));

  useEffect(() => {
    const ce = centersSwrError
      ? centersSwrError instanceof Error
        ? centersSwrError.message
        : String(centersSwrError)
      : "";
    const sp = spacesSwrError
      ? spacesSwrError instanceof Error
        ? spacesSwrError.message
        : String(spacesSwrError)
      : "";
    setPageErr(ce || sp);
  }, [centersSwrError, spacesSwrError]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilterQ, filterCenter, filterSpaceStatus]);

  function resetForm() {
    setShoppingCenter("");
    setCode("");
    setType("billboard");
    setTitle("");
    setDescription("");
    setMonthlyPrice("");
    setStatus("available");
    setIsActive(true);
    setWidth("");
    setHeight("");
    setQuantity("1");
    setMaterial("");
    setLocationDescription("");
    setLevel("");
    setVenueZone("");
    setDoubleSided(false);
    setProductionSpecs("");
    setInstallationNotes("");
    setHemPocketTopCm("");
  }

  function openCreate() {
    setSelected(null);
    resetForm();
    setModal("create");
    setFieldErrors({});
  }

  const expandById = useCallback(
    async (id) => {
      const sid = String(id ?? "").trim();
      if (!sid) return;
      const fromList = rows.find((s) => String(s.id) === sid);
      if (fromList) {
        setExpandedId(fromList.id);
        return;
      }
      try {
        const data = await authFetch(`/api/admin/spaces/${sid}/`);
        setExpandedId(data.id);
      } catch (e) {
        setPageErr(
          e instanceof Error ? e.message : "No se pudo abrir el detalle del espacio publicitario.",
        );
      }
    },
    [rows],
  );

  function openEdit(s) {
    if (!s) return;
    setSelected(s);
    setShoppingCenter(String(s.shopping_center));
    setCode(s.code);
    setType(s.type);
    setTitle(s.title);
    setDescription(s.description || "");
    setMonthlyPrice(String(s.monthly_price_usd));
    setStatus(s.status);
    setIsActive(s.is_active !== false);
    setWidth(s.width != null ? String(s.width) : "");
    setHeight(s.height != null ? String(s.height) : "");
    setQuantity(s.quantity != null ? String(s.quantity) : "1");
    setMaterial(s.material || "");
    setLocationDescription(s.location_description || "");
    setLevel(s.level || "");
    setVenueZone(s.venue_zone || "");
    setDoubleSided(Boolean(s.double_sided));
    setProductionSpecs(s.production_specs || "");
    setInstallationNotes(s.installation_notes || "");
    setHemPocketTopCm(s.hem_pocket_top_cm != null ? String(s.hem_pocket_top_cm) : "");
    setModal("edit");
    setFieldErrors({});
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    resetForm();
    setFieldErrors({});
  }

  function setFieldErrorMapFromApiData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return false;
    const next = {};
    for (const [k, v] of Object.entries(data)) {
      if (v == null) continue;
      if (typeof v === "string") next[k] = v;
      else if (Array.isArray(v)) next[k] = v.map(String).join("\n");
      else if (typeof v === "object" && v.detail != null) next[k] = String(v.detail);
      else next[k] = String(v);
    }
    if (Object.keys(next).length === 0) return false;
    setFieldErrors(next);
    return true;
  }

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  async function suggestNextCode() {
    const centerId = parseInt(shoppingCenter, 10);
    if (!centerId) {
      setModalErr("Selecciona un centro comercial para sugerir el código.");
      return;
    }
    try {
      setModalErr("");
      setFieldErrors((x) => ({ ...(x || {}), code: undefined }));
      const data = await authFetch(`/api/admin/spaces/next-code/?shopping_center=${centerId}`);
      if (data?.suggested_code) {
        setCode(String(data.suggested_code));
      }
      if (data?.is_active === false) {
        setModalErr(
          "Este centro está inactivo. El espacio se creará, pero no aparecerá en el catálogo hasta que actives el centro.",
        );
      }
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "No se pudo sugerir el código.");
    }
  }

  function valuesObject() {
    const centerId = parseInt(shoppingCenter, 10);
    return {
      code,
      shopping_center: centerId,
      type,
      title,
      description,
      monthly_price_usd: monthlyPrice,
      status,
      width,
      height,
      quantity,
      material,
      location_description: locationDescription,
      level,
      venue_zone: venueZone,
      double_sided: doubleSided,
      production_specs: productionSpecs,
      installation_notes: installationNotes,
      hem_pocket_top_cm: hemPocketTopCm,
      is_active: Boolean(isActive),
    };
  }

  async function submitSave() {
    setModalErr("");
    setMsg("");
    setFieldErrors({});
    const centerId = parseInt(shoppingCenter, 10);
    if (!centerId) {
      setModalErr("Selecciona un centro comercial.");
      setFieldErrors({ shopping_center: "Campo obligatorio" });
      return;
    }
    if (modal === "create") {
      const c = centers.find((x) => Number(x.id) === Number(centerId));
      if (c?.is_active === false) {
        setModalErr(
          "Este centro está inactivo. Actívalo en «Centros comerciales» para publicar el espacio en el catálogo.",
        );
        setFieldErrors({ shopping_center: "Activa el centro" });
        return;
      }
    }
    if (modal === "create") {
      const codeErr = validateTomaCodeFormat(code);
      if (codeErr) {
        setModalErr(codeErr);
        setFieldErrors({ code: codeErr });
        return;
      }
    }
    if (!title.trim()) {
      setModalErr("Revisa los campos marcados.");
      setFieldErrors((x) => ({ ...(x || {}), title: "Campo obligatorio" }));
      return;
    }
    if (!String(monthlyPrice || "").trim()) {
      setModalErr("Revisa los campos marcados.");
      setFieldErrors((x) => ({ ...(x || {}), monthly_price_usd: "Campo obligatorio" }));
      return;
    }
    try {
      const v = valuesObject();
      const payload = galleryRef.current?.getPayload?.() ?? { plan: [], newFiles: [] };
      if (modal === "create") {
        const fd = new FormData();
        buildSpacePayload(fd, { ...v, code: v.code.trim().toUpperCase() });
        fd.append("gallery_plan", JSON.stringify(payload.plan));
        payload.newFiles.forEach((f) => fd.append("gallery_add", f));
        await authFetchForm("/api/admin/spaces/", { method: "POST", formData: fd });
        setMsg("Espacio publicitario creado.");
      } else if (modal === "edit" && selected) {
        const fd = new FormData();
        buildSpacePayload(fd, v);
        fd.append("gallery_plan", JSON.stringify(payload.plan));
        payload.newFiles.forEach((f) => fd.append("gallery_add", f));
        await authFetchForm(`/api/admin/spaces/${selected.id}/`, { method: "PATCH", formData: fd });
        setMsg("Espacio publicitario actualizado.");
      }
      closeModal();
      await reloadSpaces();
      await revalidateHomeCatalog(swrGlobalMutate);
    } catch (e) {
      if (e && typeof e === "object" && e.data) {
        setFieldErrorMapFromApiData(e.data);
      }
      setModalErr(e instanceof Error ? e.message : "Error");
    }
  }

  function askDeleteSpace(id) {
    setDeleteTargetId(id);
  }

  async function executeDeleteSpace(id) {
    setPageErr("");
    try {
      await authFetch(`/api/admin/spaces/${id}/`, { method: "DELETE" });
      setMsg("Espacio publicitario eliminado.");
      await reloadSpaces();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "Error");
      throw e;
    }
  }

  useEffect(() => {
    setExpandedId(null);
  }, [filterQ, filterCenter, filterSpaceStatus, page]);

  if (!ready) {
    return <TomasAdminSectionSkeleton />;
  }

  return (
    <div className={adminPanelCard}>
      <AdminTomasViewQuerySync onViewId={expandById} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={adminSectionHeaderIconWrap}>
            <IconAdminGrid className="!h-8 !w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Espacios publicitarios</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {totalCount} {totalCount === 1 ? "espacio publicitario" : "espacios publicitarios"}
            </p>
          </div>
        </div>
        {canCreateSpaces ? (
          <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
            <AdminCreatePlusIcon />
            <span className={adminCreateBtnLabel}>Nuevo espacio</span>
          </button>
        ) : null}
      </div>

      {msg ? (
        <p className={`mt-4 ${ROUNDED_CONTROL} bg-emerald-50 px-3 py-2 text-sm text-emerald-900`}>{msg}</p>
      ) : null}
      {pageErr ? (
        <p className={`mt-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}>{pageErr}</p>
      ) : null}

      {totalCount === 0 && !filtersActive ? (
        <div className="mt-6">
          <EmptyState
            icon={<EmptyStateIconGrid />}
            title="No hay espacios publicitarios en el catálogo"
            description={
              canCreateSpaces
                ? "Aún no hay espacios publicitarios cargados. Puedes crear el primero con «Nuevo espacio»."
                : "Aún no hay espacios publicitarios cargados. La creación de espacios publicitarios no está habilitada para este workspace; si necesitas cambiarlo, contacta a la plataforma."
            }
          />
        </div>
      ) : (
        <>
          <AdminFiltersRow>
            <AdminFilterSearchInput
              id="tomas-filter-q"
              value={filterQ}
              onChange={setFilterQ}
              placeholder="Código o título del espacio…"
              className="min-w-0 flex-[1.6]"
            />
            <AdminFilterSelect
              id="tomas-filter-center"
              label="Centro comercial"
              value={filterCenter}
              onChange={setFilterCenter}
              options={centerFilterOptions}
            />
            <AdminFilterSelect
              id="tomas-filter-status"
              label="Estado del espacio publicitario"
              value={filterSpaceStatus}
              onChange={setFilterSpaceStatus}
              options={SPACE_STATUS_FILTERS}
            />
            <AdminFilterClearButton
              show={filtersActive}
              onClick={() => {
                setFilterQ("");
                setFilterCenter("all");
                setFilterSpaceStatus("all");
                setPage(1);
              }}
            />
          </AdminFiltersRow>

          {rows.length === 0 && filtersActive ? (
            <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
              <p>Ningún espacio publicitario coincide con los filtros.</p>
              <div className="mt-5 flex justify-center">
                <FilterClearAction
                  onClick={() => {
                    setFilterQ("");
                    setFilterCenter("all");
                    setFilterSpaceStatus("all");
                    setPage(1);
                  }}
                />
              </div>
            </div>
          ) : null}

          {rows.length > 0 ? (
        <div className={`mt-6 ${adminTableCard}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/90">
                  <th className="w-8 px-2 py-3" aria-hidden />
                  <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Portada
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Código
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Título
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Centro comercial
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Estado
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                const open = expandedId === s.id;
                const panelId = `toma-extra-${s.id}`;
                return (
                  <Fragment key={s.id}>
                    <tr className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                      <td className="px-2 py-2.5">
                        <AdminAccordionToggle
                          expanded={open}
                          onToggle={() => setExpandedId(open ? null : s.id)}
                          rowId={s.id}
                          controlsId={panelId}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {(() => {
                          const first =
                            Array.isArray(s.gallery_images) && s.gallery_images.length > 0
                              ? s.gallery_images[0]
                              : s.cover_image;
                          const thumbRaw = rawMediaUrlFromApiField(first);
                          const lbItems = adminTomaRowLightboxItems(s, s.title);
                          if (!thumbRaw) {
                            return (
                              <div className={squareAdminTablePortadaFrameClass} aria-label="Sin imagen">
                                <ThumbnailPlaceholder />
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              className={`${squareAdminTablePortadaFrameClass} ${squareListImagePreviewButtonRingClass} p-0`}
                              aria-label={
                                s.title
                                  ? `Ver galería: ${s.title}`
                                  : "Ver imágenes del espacio publicitario"
                              }
                              onClick={() => {
                                const fallback = mediaUrlForUiWithWebp(thumbRaw);
                                const items =
                                  lbItems.length > 0
                                    ? lbItems
                                    : fallback
                                      ? [{ src: fallback, alt: s.title || "Portada" }]
                                      : [];
                                if (!items.length) return;
                                setGalleryLightbox({
                                  open: true,
                                  items,
                                  initialIndex: 0,
                                });
                              }}
                            >
                              <RasterFromApiUrl
                                url={thumbRaw}
                                alt=""
                                width={60}
                                height={60}
                                className={squareAdminTablePortadaImgClass}
                                {...catalogRasterImgAttrs}
                              />
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-zinc-800">{s.code}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 font-medium text-zinc-900" title={s.title}>
                        {s.title}
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2.5 text-xs text-zinc-600">
                        {s.shopping_center_name?.trim() ? (
                          <AdminDashboardFilterLink
                            href={dashboardCentrosSearchHref(
                              s.shopping_center_slug || s.shopping_center_name,
                            )}
                            className="block truncate"
                            title={s.shopping_center_name}
                          >
                            {s.shopping_center_name}
                          </AdminDashboardFilterLink>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${spaceStatusPillClassName(s.status)}`}
                        >
                          {spaceStatusLabel(s.status, s.status_label)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <AdminRowActions
                          onView={() => setExpandedId(open ? null : s.id)}
                          onEdit={() => openEdit(s)}
                          onDelete={() => askDeleteSpace(s.id)}
                        />
                      </td>
                    </tr>
                    {open ? (
                      <AdminAccordionRowPanel colSpan={7} panelId={panelId}>
                        <AdminAccordionDetailHeader
                          {...adminAdSpaceAccordionHeader(s.code, s.title)}
                        />

                        <div className="mt-5 grid w-full max-w-none grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="datos"
                            title="Datos del espacio"
                          >
                            <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                              <AdminDetailField label="Código">
                                <span className="font-mono text-zinc-800">
                                  {adminDetailEmpty(s.code)}
                                </span>
                              </AdminDetailField>
                              <AdminDetailField label="Título">
                                {adminDetailEmpty(s.title)}
                              </AdminDetailField>
                              <AdminDetailField label="Centro comercial">
                                <TomaCentroComercialValue s={s} />
                              </AdminDetailField>
                              <AdminDetailField label="Tipo">
                                {spaceTypeLabel(s.type)}
                              </AdminDetailField>
                              <AdminDetailField label="Estado">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${spaceStatusPillClassName(s.status)}`}
                                >
                                  {spaceStatusLabel(s.status, s.status_label)}
                                </span>
                              </AdminDetailField>
                              <AdminDetailField label="Precio USD / mes">
                                <span className="tabular-nums">{s.monthly_price_usd}</span>
                              </AdminDetailField>
                              <AdminDetailField label="Visible en catálogo">
                                {s.is_active !== false ? "Sí" : "No"}
                              </AdminDetailField>
                            </AdminDetailInset>
                          </AdminDetailSection>

                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="tecnicos"
                            title="Detalles técnicos y ubicación"
                          >
                            <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                              <AdminDetailField label="Ancho">
                                {s.width != null && String(s.width).trim() !== ""
                                  ? s.width
                                  : adminDetailEmpty("")}
                              </AdminDetailField>
                              <AdminDetailField label="Alto">
                                {s.height != null && String(s.height).trim() !== ""
                                  ? s.height
                                  : adminDetailEmpty("")}
                              </AdminDetailField>
                              <AdminDetailField label="Cantidad">
                                {s.quantity != null ? s.quantity : adminDetailEmpty("")}
                              </AdminDetailField>
                              <AdminDetailField label="Material">
                                {adminDetailEmpty(s.material)}
                              </AdminDetailField>
                              <AdminDetailField label="Doble cara">
                                {s.double_sided ? "Sí" : "No"}
                              </AdminDetailField>
                              <AdminDetailField label="Bolsillo superior (cm)">
                                {s.hem_pocket_top_cm != null
                                  ? s.hem_pocket_top_cm
                                  : adminDetailEmpty("")}
                              </AdminDetailField>
                              <div className="sm:col-span-2">
                                <AdminDetailField label="Ubicación">
                                  {adminDetailEmpty(s.location_description)}
                                </AdminDetailField>
                              </div>
                              <AdminDetailField label="Nivel">
                                {adminDetailEmpty(s.level)}
                              </AdminDetailField>
                              <AdminDetailField label="Zona / plaza">
                                {adminDetailEmpty(s.venue_zone)}
                              </AdminDetailField>
                            </AdminDetailInset>
                          </AdminDetailSection>
                        </div>

                        <div className="mt-6 grid w-full max-w-none grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="galeria"
                            title="Galería de imágenes"
                          >
                            <AdminDetailInset>
                              <AdminAdSpaceGalleryField
                                readOnly
                                initialServerImages={tomaAccordionGalleryImages(s)}
                              />
                            </AdminDetailInset>
                          </AdminDetailSection>

                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="prod"
                            title="Especificaciones artes / producción"
                          >
                            <AdminDetailInset className="space-y-5">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Especificaciones para artes y producción
                                </p>
                                <AdminDetailProse
                                  text={s.production_specs}
                                  emptyHint="Sin especificaciones."
                                />
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Notas de montaje / instalación
                                </p>
                                <AdminDetailProse
                                  text={s.installation_notes}
                                  emptyHint="Sin notas de montaje."
                                />
                              </div>
                            </AdminDetailInset>
                          </AdminDetailSection>
                        </div>

                        <div className="mt-6 w-full max-w-none">
                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="desc"
                            title="Descripción"
                          >
                            <AdminDetailProse text={s.description} emptyHint="Sin descripción." />
                          </AdminDetailSection>
                        </div>
                        <div className="mt-4 flex justify-end border-t border-zinc-100 pt-4">
                          <button
                            type="button"
                            className={adminPrimaryBtn}
                            onClick={() => openEdit(s)}
                          >
                            <IconRowEdit className="shrink-0" aria-hidden />
                            Editar
                          </button>
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
          <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} />
        </>
      )}

      <AdminModal
        open={modal != null}
        onClose={closeModal}
        title={
          modal === "create" ? "Nuevo espacio publicitario" : "Editar espacio publicitario"
        }
        wide
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={adminSecondaryBtn} onClick={closeModal}>
              Cancelar
            </button>
            <button type="button" className={adminPrimaryBtn} onClick={submitSave}>
              {modal === "create" ? "Crear" : "Guardar"}
            </button>
          </div>
        }
      >
        <div>
            {modalErr ? <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert> : null}
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <AdminAdSpaceGalleryField
                ref={galleryRef}
                key={modal === "edit" && selected ? `edit-${selected.id}` : "create"}
                readOnly={false}
                initialServerImages={modal === "edit" && selected ? selected.gallery_images || [] : []}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-center">
                Centro comercial
              </label>
              <AdminSelect
                id="s-center"
                options={centers.map((c) => ({ v: c.id, l: `${c.slug} — ${c.name}` }))}
                value={shoppingCenter}
                onChange={(v) => setShoppingCenter(v === "" || v == null ? "" : String(v))}
                placeholder="Selecciona un centro comercial…"
                inModal
                aria-label="Centro comercial"
              />
              {fieldErrors?.shopping_center ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.shopping_center}</p>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className={adminLabel} htmlFor="s-code">
                  Código del espacio
                </label>
                {modal === "create" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                    onClick={suggestNextCode}
                    disabled={!shoppingCenter}
                  >
                    Generar
                  </button>
                ) : null}
              </div>
              <input
                id="s-code"
                className={fieldClass("code")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={modal === "edit"}
                autoComplete="off"
                spellCheck={false}
              />
              {fieldErrors?.code ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.code}</p>
              ) : null}
              {modal === "create" ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Formato{" "}
                  <span className="font-mono text-zinc-600">
                    {"{prefijo}-T{número}[sufijo]"}
                  </span>
                  . Ejemplos: <span className="font-mono">DEMO-T1</span>,{" "}
                  <span className="font-mono">CC-T2A</span>. El prefijo es el código único del espacio publicitario (no
                  tiene que coincidir con el slug del centro).
                </p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-type">
                Tipo
              </label>
              <AdminSelect
                id="s-type"
                options={SPACE_TYPES}
                value={type}
                onChange={(v) => setType(v || "billboard")}
                inModal
                aria-label="Tipo de espacio publicitario"
              />
              {fieldErrors?.type ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.type}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-title">
                Título
              </label>
              <input
                id="s-title"
                className={fieldClass("title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              {fieldErrors?.title ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.title}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-desc">
                Descripción
              </label>
              <textarea
                id="s-desc"
                className={adminField}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-price">
                Precio USD / mes
              </label>
              <input
                id="s-price"
                className={fieldClass("monthly_price_usd")}
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                required
              />
              {fieldErrors?.monthly_price_usd ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.monthly_price_usd}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-status">
                Estado
              </label>
              <AdminSelect
                id="s-status"
                options={SPACE_STATUS}
                value={status}
                onChange={(v) => setStatus(v || "available")}
                inModal
                aria-label="Estado del espacio publicitario"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="s-active"
                type="checkbox"
                className="size-4 rounded border-zinc-300 accent-[var(--mp-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mp-primary)_30%,transparent)]"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="s-active" className="text-sm font-medium text-zinc-800">
                Espacio publicitario activo (visible en catálogo si el centro también lo permite)
              </label>
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-w">
                Ancho (opc.)
              </label>
              <input id="s-w" className={adminField} value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-h">
                Alto (opc.)
              </label>
              <input id="s-h" className={adminField} value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-q">
                Cantidad
              </label>
              <input id="s-q" className={adminField} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-mat">
                Material
              </label>
              <input id="s-mat" className={adminField} value={material} onChange={(e) => setMaterial(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-loc">
                Ubicación
              </label>
              <input
                id="s-loc"
                className={adminField}
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-level">
                Nivel
              </label>
              <input id="s-level" className={adminField} value={level} onChange={(e) => setLevel(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-zone">
                Zona / plaza (ej. Plaza Jardín, pasillo)
              </label>
              <input
                id="s-zone"
                className={adminField}
                value={venueZone}
                onChange={(e) => setVenueZone(e.target.value)}
                placeholder="Como en el plano comercial"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="s-double"
                type="checkbox"
                className="size-4 rounded border-zinc-300 accent-[var(--mp-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--mp-primary)_30%,transparent)]"
                checked={doubleSided}
                onChange={(e) => setDoubleSided(e.target.checked)}
              />
              <label htmlFor="s-double" className="text-sm font-medium text-zinc-800">
                Elemento doble cara
              </label>
            </div>
            <div>
              <label className={adminLabel} htmlFor="s-hem">
                Bolsillo superior (cm)
              </label>
              <input
                id="s-hem"
                className={adminField}
                value={hemPocketTopCm}
                onChange={(e) => setHemPocketTopCm(e.target.value)}
                placeholder="ej. 4.5"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-prod">
                Especificaciones para artes y producción
              </label>
              <textarea
                id="s-prod"
                className={adminField}
                rows={3}
                value={productionSpecs}
                onChange={(e) => setProductionSpecs(e.target.value)}
                placeholder="Material, medidas máximas, forma alusiva a campaña…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="s-inst">
                Notas de montaje / instalación
              </label>
              <textarea
                id="s-inst"
                className={adminField}
                rows={3}
                value={installationNotes}
                onChange={(e) => setInstallationNotes(e.target.value)}
                placeholder="Bolsillo solo arriba, prohibición pendón corrido, etc."
              />
            </div>
            </div>
        </div>
      </AdminModal>

      <ImageLightbox
        open={galleryLightbox.open}
        onClose={() => setGalleryLightbox((st) => ({ ...st, open: false }))}
        items={galleryLightbox.items}
        initialIndex={galleryLightbox.initialIndex}
        showDownload={false}
        showThumbnails={galleryLightbox.items.length > 1}
        ariaLabel="Galería del espacio publicitario"
      />

      <AdminConfirmDialog
        open={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        title="Eliminar espacio publicitario"
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTargetId == null) return;
          await executeDeleteSpace(deleteTargetId);
        }}
      >
        <p>¿Eliminar este espacio publicitario?</p>
      </AdminConfirmDialog>
    </div>
  );
}
