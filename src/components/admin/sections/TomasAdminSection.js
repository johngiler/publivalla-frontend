"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { IconRowEdit } from "@/components/admin/rowActionIcons";
import {
  adminPanelCard,
  adminSectionHeaderIconWrap,
  adminCreateBtnLabel,
  adminPrimaryBtn,
  adminTableCard,
} from "@/components/admin/adminFormStyles";
import {
  SPACE_STATUS,
  spaceStatusLabel,
  spaceStatusPillClassName,
} from "@/components/admin/adminConstants";
import { AdminAdSpaceGalleryField } from "@/components/admin/AdminAdSpaceGalleryField";
import { AdminAdSpaceModal } from "@/components/admin/AdminAdSpaceModal";
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
  squareListImagePreviewFrameClass,
  squareListImagePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { revalidateHomeCatalog } from "@/lib/swr/homeCatalogSwr";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch } from "@/services/authApi";
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

function spaceDisplayName(s) {
  return String(s?.name ?? s?.title ?? "").trim();
}

function spaceMediaUrl(s, field, urlField) {
  const raw = s?.[urlField] || s?.[field];
  return raw ? rawMediaUrlFromApiField(raw) : null;
}

function TomaDetailImage({ url, alt, onOpenLightbox }) {
  if (!url) {
    return (
      <div className={squareListImagePreviewFrameClass} aria-label="Sin imagen">
        <ThumbnailPlaceholder />
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`${squareListImagePreviewFrameClass} ${squareListImagePreviewButtonRingClass} p-0`}
      aria-label={alt ? `Ver imagen: ${alt}` : "Ver imagen"}
      onClick={() =>
        onOpenLightbox([{ src: mediaUrlForUiWithWebp(url), alt: alt || "Imagen" }], 0)
      }
    >
      <RasterFromApiUrl
        url={url}
        alt=""
        width={100}
        height={100}
        className={squareListImagePreviewImgClass}
        {...catalogRasterImgAttrs}
      />
    </button>
  );
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

  const openImageLightbox = useCallback((items, initialIndex = 0) => {
    if (!items?.length) return;
    setGalleryLightbox({ open: true, items, initialIndex });
  }, []);

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

  function openCreate() {
    setSelected(null);
    setModal("create");
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
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  async function handleModalSaved() {
    setMsg(modal === "create" ? "Espacio publicitario creado." : "Espacio publicitario actualizado.");
    await reloadSpaces();
    await revalidateHomeCatalog(swrGlobalMutate);
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
              placeholder="Código o nombre del espacio…"
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
                    Nombre
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
                const displayName = spaceDisplayName(s);
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
                          const lbItems = adminTomaRowLightboxItems(s, displayName);
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
                                displayName
                                  ? `Ver galería: ${displayName}`
                                  : "Ver imágenes del espacio publicitario"
                              }
                              onClick={() => {
                                const fallback = mediaUrlForUiWithWebp(thumbRaw);
                                const items =
                                  lbItems.length > 0
                                    ? lbItems
                                    : fallback
                                      ? [{ src: fallback, alt: displayName || "Portada" }]
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
                      <td className="max-w-[10rem] truncate px-3 py-2.5 font-medium text-zinc-900" title={displayName}>
                        {displayName || "—"}
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
                          {...adminAdSpaceAccordionHeader(s.code, displayName)}
                        />

                        <div className="mt-5 grid w-full max-w-none grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="datos"
                            title="Datos principales"
                          >
                            <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                              <AdminDetailField label="Código">
                                <span className="font-mono text-zinc-800">
                                  {adminDetailEmpty(s.code)}
                                </span>
                              </AdminDetailField>
                              <AdminDetailField label="Nombre">
                                {adminDetailEmpty(displayName)}
                              </AdminDetailField>
                              <AdminDetailField label="Centro comercial">
                                <TomaCentroComercialValue s={s} />
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
                              <div className="sm:col-span-2">
                                <AdminDetailField label="Descripción">
                                  <AdminDetailProse
                                    text={s.description}
                                    emptyHint="Sin descripción."
                                  />
                                </AdminDetailField>
                              </div>
                            </AdminDetailInset>
                          </AdminDetailSection>

                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="imagenes"
                            title="Imágenes"
                          >
                            <AdminDetailInset className="space-y-5">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Imágenes de portada
                                </p>
                                <div className="mt-2">
                                  <AdminAdSpaceGalleryField
                                    readOnly
                                    initialServerImages={tomaAccordionGalleryImages(s)}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Imagen de ubicación
                                </p>
                                <div className="mt-2">
                                  <TomaDetailImage
                                    url={spaceMediaUrl(s, "location_image", "location_image_url")}
                                    alt="Ubicación"
                                    onOpenLightbox={openImageLightbox}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                  Imagen de arte y producción
                                </p>
                                <div className="mt-2">
                                  <TomaDetailImage
                                    url={spaceMediaUrl(s, "production_image", "production_image_url")}
                                    alt="Arte y producción"
                                    onOpenLightbox={openImageLightbox}
                                  />
                                </div>
                              </div>
                            </AdminDetailInset>
                          </AdminDetailSection>
                        </div>

                        <div className="mt-6 w-full max-w-none">
                          <AdminDetailSection
                            panelId={panelId}
                            sectionId="tipos"
                            title="Tipos de elemento"
                          >
                            {Array.isArray(s.formats) && s.formats.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                      <th className="px-3 py-2">Tipo</th>
                                      <th className="px-3 py-2">Ancho</th>
                                      <th className="px-3 py-2">Alto</th>
                                      <th className="px-3 py-2">Cantidad</th>
                                      <th className="px-3 py-2">Ubicación</th>
                                      <th className="px-3 py-2">Doble cara</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.formats.map((f) => (
                                      <tr key={f.id ?? `${f.product_type_id}-${f.sort_order}`} className="border-b border-zinc-50">
                                        <td className="px-3 py-2 font-medium text-zinc-900">
                                          {f.product_type_name || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-700">{f.width || "—"}</td>
                                        <td className="px-3 py-2 text-zinc-700">{f.height || "—"}</td>
                                        <td className="px-3 py-2 text-zinc-700">{f.quantity ?? "—"}</td>
                                        <td className="px-3 py-2 text-zinc-700">{f.location || "—"}</td>
                                        <td className="px-3 py-2 text-zinc-700">
                                          {f.double_sided ? "Sí" : "No"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">Sin tipos configurados.</p>
                            )}
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

      <AdminAdSpaceModal
        open={modal != null}
        mode={modal === "edit" ? "edit" : "create"}
        space={modal === "edit" ? selected : null}
        centers={centers}
        onClose={closeModal}
        onSaved={handleModalSaved}
      />

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
