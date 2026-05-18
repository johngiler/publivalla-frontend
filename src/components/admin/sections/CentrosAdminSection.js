"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";

import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminCreatePlusIcon } from "@/components/admin/AdminCreatePlusIcon";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { HighSeasonMonthsField } from "@/components/admin/HighSeasonMonthsField";
import {
  MONTH_LABELS_ES,
  normalizeHighSeasonMonths,
  parseHighSeasonMultiplier,
} from "@/lib/highSeasonPricing";
import {
  RENTAL_BILLING_OPTIONS,
  normalizeRentalBillingUnit,
} from "@/lib/rentalBilling";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
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
import { CentrosAdminSectionSkeleton } from "@/components/admin/skeletons/CentrosAdminSectionSkeleton";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { ThumbnailPlaceholder } from "@/components/media/ThumbnailPlaceholder";
import { rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { IconBuildingSection } from "@/components/admin/rowActionIcons";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { EmptyState, EmptyStateIconBuilding } from "@/components/ui/EmptyState";
import { centersAdminListPath } from "@/lib/adminListQuery";
import { ADMIN_CENTERS_ALL_SWR_KEY, authJsonFetcher } from "@/lib/swr/fetchers";
import { adminCenterCoverLightboxItems } from "@/lib/imageLightboxItems";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { fieldErrorsFromDrfData } from "@/lib/adminFieldErrors";
import {
  squareAdminTablePortadaFrameClass,
  squareAdminTablePortadaImgClass,
  squareListImagePreviewButtonRingClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailProse,
  AdminDetailSection,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { authFetch, authFetchForm } from "@/services/authApi";
import {
  AdminFilterClearButton,
  AdminFiltersRow,
  AdminFilterSearchInput,
  AdminFilterSelect,
  FilterClearAction,
} from "@/components/admin/AdminListFilters";
import { AdminListPagination } from "@/components/admin/AdminListPagination";
import { AdminListQuerySync } from "@/components/admin/AdminListQuerySync";

const CENTER_ACTIVE_FILTERS = [
  { v: "all", l: "Todos (estado)" },
  { v: "active", l: "Activos" },
  { v: "inactive", l: "Inactivos" },
];

/** Catálogo marketplace en respuesta del API (`marketplace_catalog_enabled` o alias `marketplace_enabled`). */
function centerCatalogEnabled(c) {
  if (c == null) return false;
  if (typeof c.marketplace_catalog_enabled === "boolean") {
    return c.marketplace_catalog_enabled;
  }
  if (typeof c.marketplace_enabled === "boolean") {
    return c.marketplace_enabled;
  }
  return false;
}

export function CentrosAdminSection() {
  const { authReady, accessToken } = useAuth();
  const { workspace } = useWorkspace();
  const { caps } = useWorkspaceCapabilities();
  const canCreateCenters = caps.can_create_shopping_centers;
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [portadaLightbox, setPortadaLightbox] = useState({
    open: false,
    items: [],
    initialIndex: 0,
  });
  const [filterQ, setFilterQ] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const filtersActive = filterQ.trim() !== "" || filterActive !== "all";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Venezuela");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [onHomepage, setOnHomepage] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [marketplaceCatalogEnabled, setMarketplaceCatalogEnabled] =
    useState(false);
  const [listingOrder, setListingOrder] = useState("0");
  const [rentalBillingUnit, setRentalBillingUnit] = useState("calendar_month");
  const [highSeasonMonths, setHighSeasonMonths] = useState([]);
  const [highSeasonMultiplier, setHighSeasonMultiplier] = useState("1");
  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [pendingClearCover, setPendingClearCover] = useState(false);
  const fileRef = useRef(null);

  const listKey =
    authReady && accessToken
      ? centersAdminListPath(page, debouncedFilterQ, filterActive)
      : null;
  const {
    data,
    error: swrError,
    isLoading,
    mutate: mutateCenters,
  } = useSWR(listKey, authJsonFetcher, {
    keepPreviousData: true,
  });

  const rows = useMemo(
    () => (data ? parsePaginatedResponse(data).results : []),
    [data],
  );
  const totalCount = useMemo(
    () => (data ? parsePaginatedResponse(data).count : 0),
    [data],
  );

  const reloadCenters = useCallback(async () => {
    await Promise.all([
      mutateCenters(),
      globalMutate(ADMIN_CENTERS_ALL_SWR_KEY),
    ]);
  }, [mutateCenters]);

  const ready =
    !(authReady && accessToken) ||
    (!isLoading && (data !== undefined || swrError !== undefined));

  useEffect(() => {
    setPageErr(
      swrError
        ? swrError instanceof Error
          ? swrError.message
          : String(swrError)
        : "",
    );
  }, [swrError]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilterQ, filterActive]);

  useEffect(() => {
    if (!coverFile) {
      setFilePreview("");
      return;
    }
    const u = URL.createObjectURL(coverFile);
    setFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [coverFile]);

  function openCreate() {
    setSelected(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setCity("");
    setAddress("");
    setCountry("Venezuela");
    setPhone("");
    setContactEmail("");
    setWebsite("");
    setDescription("");
    setDistrict("");
    setOnHomepage(true);
    setIsActive(true);
    setMarketplaceCatalogEnabled(false);
    setListingOrder("0");
    setRentalBillingUnit("calendar_month");
    setHighSeasonMonths([]);
    setHighSeasonMultiplier("1");
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
    setModal("create");
    setFieldErrors({});
    setModalErr("");
  }

  function openView(c) {
    setSelected(c);
    setModal("view");
  }

  function openEdit(c) {
    if (!c) return;
    setSelected(c);
    setName(c.name);
    setSlug(c.slug || "");
    setSlugTouched(true);
    setCity(c.city || "");
    setAddress(c.address || "");
    setCountry(c.country?.trim() || "Venezuela");
    setPhone(c.phone || "");
    setContactEmail(c.contact_email || "");
    setWebsite(c.website || "");
    setDescription(c.description || "");
    setDistrict(c.district?.trim() || "");
    setOnHomepage(c.on_homepage !== false);
    setIsActive(c.is_active !== false);
    setMarketplaceCatalogEnabled(centerCatalogEnabled(c));
    setListingOrder(String(c.listing_order ?? 0));
    setRentalBillingUnit(normalizeRentalBillingUnit(c.rental_billing_unit));
    setHighSeasonMonths(normalizeHighSeasonMonths(c.high_season_months));
    setHighSeasonMultiplier(String(parseHighSeasonMultiplier(c.high_season_multiplier)));
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
    setModal("edit");
    setFieldErrors({});
    setModalErr("");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
    setSlugTouched(false);
    setFieldErrors({});
    setModalErr("");
  }

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  function suggestCenterSlug(nm) {
    const raw = String(nm || "").trim();
    if (!raw) return "";
    const low = raw.toLowerCase();
    const wsPrefix = (workspace?.slug || "").trim().toLowerCase();
    if (wsPrefix && low.startsWith(`${wsPrefix} `)) {
      const rest = raw.slice(wsPrefix.length + 1).trim();
      const tokens = rest
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.replace(/[^a-z0-9áéíóúüñ]/gi, ""));
      if (tokens.length) {
        const letters = [];
        for (const t of tokens) {
          if (!t) continue;
          if (letters.length < 2) letters.push(t[0].toLowerCase());
        }
        const first = tokens[0].toLowerCase();
        const consonants = first.replace(/[aeiouáéíóúü]/g, "");
        let i = 0;
        while (letters.length < 3 && i < consonants.length) {
          const ch = consonants[i++];
          if (ch) letters.push(ch);
        }
        while (letters.length < 3 && first.length)
          letters.push(first[letters.length] || "x");
        const out = `s${letters.join("")}`.slice(0, 3);
        return out.replace(/[^a-z0-9]/g, "");
      }
    }
    return raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  useEffect(() => {
    if (modal !== "create") return;
    if (slugTouched) return;
    const next = suggestCenterSlug(name);
    if (next && next !== slug) setSlug(next);
    if (!name.trim() && slug) setSlug("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, modal, slugTouched]);

  async function submitSave() {
    setModalErr("");
    setMsg("");
    setFieldErrors({});
    const nextFe = {};
    if (!name.trim()) nextFe.name = "Campo obligatorio.";
    if (!slug.trim()) nextFe.slug = "Campo obligatorio.";
    if (!city.trim()) nextFe.city = "Campo obligatorio.";
    if (Object.keys(nextFe).length) {
      setFieldErrors(nextFe);
      setModalErr("Revisa los campos marcados.");
      return;
    }
    const lo = Math.max(0, parseInt(listingOrder, 10) || 0);
    const mult = parseHighSeasonMultiplier(highSeasonMultiplier);
    const hsMonths = normalizeHighSeasonMonths(highSeasonMonths);
    const extra = {
      district: district.trim(),
      on_homepage: onHomepage,
      is_active: isActive,
      marketplace_catalog_enabled: marketplaceCatalogEnabled,
      listing_order: lo,
      high_season_months: hsMonths,
      high_season_multiplier: mult,
      rental_billing_unit: normalizeRentalBillingUnit(rentalBillingUnit),
    };
    try {
      if (modal === "create") {
        if (coverFile) {
          const fd = new FormData();
          fd.append("name", name.trim());
          fd.append("slug", slug.trim());
          fd.append("city", city.trim());
          fd.append("district", district.trim());
          fd.append("address", address.trim());
          fd.append("country", country.trim());
          fd.append("phone", phone.trim());
          fd.append("contact_email", contactEmail.trim());
          fd.append("website", website.trim());
          fd.append("description", description.trim());
          fd.append("on_homepage", onHomepage ? "true" : "false");
          fd.append("is_active", isActive ? "true" : "false");
          fd.append(
            "marketplace_catalog_enabled",
            marketplaceCatalogEnabled ? "true" : "false",
          );
          fd.append("listing_order", String(lo));
          fd.append("high_season_months", JSON.stringify(hsMonths));
          fd.append("high_season_multiplier", String(mult));
          fd.append("rental_billing_unit", normalizeRentalBillingUnit(rentalBillingUnit));
          fd.append("cover_image", coverFile);
          await authFetchForm("/api/admin/centers/", {
            method: "POST",
            formData: fd,
          });
        } else {
          await authFetch("/api/admin/centers/", {
            method: "POST",
            body: {
              name: name.trim(),
              slug: slug.trim(),
              city: city.trim(),
              ...extra,
              address: address.trim(),
              country: country.trim(),
              phone: phone.trim(),
              contact_email: contactEmail.trim(),
              website: website.trim(),
              description: description.trim(),
            },
          });
        }
        setMsg("Centro creado.");
      } else if (modal === "edit" && selected) {
        if (coverFile) {
          const fd = new FormData();
          fd.append("name", name.trim());
          fd.append("slug", slug.trim());
          fd.append("city", city.trim());
          fd.append("district", district.trim());
          fd.append("address", address.trim());
          fd.append("country", country.trim());
          fd.append("phone", phone.trim());
          fd.append("contact_email", contactEmail.trim());
          fd.append("website", website.trim());
          fd.append("description", description.trim());
          fd.append("on_homepage", onHomepage ? "true" : "false");
          fd.append("is_active", isActive ? "true" : "false");
          fd.append(
            "marketplace_catalog_enabled",
            marketplaceCatalogEnabled ? "true" : "false",
          );
          fd.append("listing_order", String(lo));
          fd.append("high_season_months", JSON.stringify(hsMonths));
          fd.append("high_season_multiplier", String(mult));
          fd.append("rental_billing_unit", normalizeRentalBillingUnit(rentalBillingUnit));
          fd.append("cover_image", coverFile);
          await authFetchForm(`/api/admin/centers/${selected.id}/`, {
            method: "PATCH",
            formData: fd,
          });
        } else {
          await authFetch(`/api/admin/centers/${selected.id}/`, {
            method: "PATCH",
            body: {
              name: name.trim(),
              slug: slug.trim(),
              city: city.trim(),
              ...extra,
              address: address.trim(),
              country: country.trim(),
              phone: phone.trim(),
              contact_email: contactEmail.trim(),
              website: website.trim(),
              description: description.trim(),
              ...(pendingClearCover ? { cover_image: null } : {}),
            },
          });
        }
        setMsg("Centro actualizado.");
      }
      closeModal();
      await reloadCenters();
    } catch (e) {
      if (e && typeof e === "object" && e.data) {
        const fe = fieldErrorsFromDrfData(e.data);
        if (Object.keys(fe).length) {
          setFieldErrors(fe);
          setModalErr("Revisa los campos marcados.");
          return;
        }
      }
      setModalErr(e instanceof Error ? e.message : "Error");
    }
  }

  function askDeleteCenter(id) {
    setDeleteTargetId(id);
  }

  async function executeDeleteCenter(id) {
    setPageErr("");
    try {
      await authFetch(`/api/admin/centers/${id}/`, { method: "DELETE" });
      setMsg("Centro eliminado.");
      await reloadCenters();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "Error");
      throw e;
    }
  }

  const readOnly = modal === "view";
  const existingCover =
    selected?.cover_image && !pendingClearCover ? selected.cover_image : null;

  useEffect(() => {
    setExpandedId(null);
  }, [filterQ, filterActive, page]);

  if (!ready) {
    return <CentrosAdminSectionSkeleton />;
  }

  return (
    <>
      <AdminListQuerySync onQuery={setFilterQ} />
      <div className={adminPanelCard}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={adminSectionHeaderIconWrap}>
              <IconBuildingSection className="block" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Centros comerciales
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {totalCount} centro{totalCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {canCreateCenters ? (
            <button
              type="button"
              className={adminPrimaryBtn}
              onClick={openCreate}
            >
              <AdminCreatePlusIcon />
              <span className={adminCreateBtnLabel}>Nuevo centro</span>
            </button>
          ) : null}
        </div>

        {msg ? (
          <p
            className={`mt-4 ${ROUNDED_CONTROL} bg-emerald-50 px-3 py-2 text-sm text-emerald-900`}
          >
            {msg}
          </p>
        ) : null}
        {pageErr ? (
          <p
            className={`mt-4 break-words ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
          >
            {pageErr}
          </p>
        ) : null}

        {totalCount === 0 && !filtersActive ? (
          <div className="mt-6">
            <EmptyState
              icon={<EmptyStateIconBuilding />}
              title="No hay centros comerciales registrados"
              description={
                canCreateCenters
                  ? "Aún no hay ningún centro registrado. Puedes crear el primero con el botón «Nuevo centro»."
                  : "Aún no hay ningún centro registrado. La creación de centros no está habilitada para este workspace; si necesitas cambiarlo, contacta a la plataforma."
              }
            />
          </div>
        ) : (
          <>
            <AdminFiltersRow>
              <AdminFilterSearchInput
                id="centros-filter-q"
                value={filterQ}
                onChange={setFilterQ}
                placeholder="Slug, nombre, ciudad, zona…"
              />
              <AdminFilterSelect
                id="centros-filter-active"
                label="Estado operativo"
                value={filterActive}
                onChange={setFilterActive}
                options={CENTER_ACTIVE_FILTERS}
              />
              <AdminFilterClearButton
                show={filtersActive}
                onClick={() => {
                  setFilterQ("");
                  setFilterActive("all");
                  setPage(1);
                }}
              />
            </AdminFiltersRow>

            {rows.length === 0 && filtersActive ? (
              <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
                <p>Ningún centro coincide con los filtros.</p>
                <div className="mt-5 flex justify-center">
                  <FilterClearAction
                    onClick={() => {
                      setFilterQ("");
                      setFilterActive("all");
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
                          Slug
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Nombre
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Ciudad
                        </th>
                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Espacios
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
                      {rows.map((c) => {
                        const open = expandedId === c.id;
                        const panelId = `centro-extra-${c.id}`;
                        const coverUrl = rawMediaUrlFromApiField(c.cover_image);
                        return (
                          <Fragment key={c.id}>
                            <tr className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                              <td className="px-2 py-2.5">
                                <AdminAccordionToggle
                                  expanded={open}
                                  onToggle={() =>
                                    setExpandedId(open ? null : c.id)
                                  }
                                  rowId={c.id}
                                  controlsId={panelId}
                                />
                              </td>
                              <td className="px-2 py-2">
                                {coverUrl ? (
                                  <button
                                    type="button"
                                    className={`${squareAdminTablePortadaFrameClass} ${squareListImagePreviewButtonRingClass} p-0`}
                                    aria-label={
                                      c.name
                                        ? `Ver portada ampliada: ${c.name}`
                                        : "Ver portada ampliada del centro"
                                    }
                                    onClick={() => {
                                      const items =
                                        adminCenterCoverLightboxItems(c);
                                      if (items.length)
                                        setPortadaLightbox({
                                          open: true,
                                          items,
                                          initialIndex: 0,
                                        });
                                    }}
                                  >
                                    <RasterFromApiUrl
                                      url={coverUrl}
                                      alt=""
                                      width={60}
                                      height={60}
                                      className={
                                        squareAdminTablePortadaImgClass
                                      }
                                      {...catalogRasterImgAttrs}
                                    />
                                  </button>
                                ) : (
                                  <div
                                    className={
                                      squareAdminTablePortadaFrameClass
                                    }
                                    aria-label="Sin imagen"
                                  >
                                    <ThumbnailPlaceholder />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-zinc-800">
                                {c.slug}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-zinc-900">
                                {c.name}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-600">
                                {c.city || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-zinc-700 tabular-nums">
                                {typeof c.tomas_count === "number"
                                  ? c.tomas_count
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    c.is_active !== false
                                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
                                      : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80"
                                  }`}
                                >
                                  {c.is_active !== false
                                    ? "Activo"
                                    : "Inactivo"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <AdminRowActions
                                  onView={() => openView(c)}
                                  onEdit={() => openEdit(c)}
                                  onDelete={() => askDeleteCenter(c.id)}
                                />
                              </td>
                            </tr>
                            {open ? (
                              <AdminAccordionRowPanel
                                colSpan={7}
                                panelId={panelId}
                              >
                                <AdminAccordionDetailHeader
                                  badgeText={
                                    typeof c.slug === "string" &&
                                    c.slug.trim() !== ""
                                      ? c.slug.trim()
                                      : undefined
                                  }
                                  titleLabel="Centro en sistema"
                                  titleLine={
                                    <p className="truncate text-sm font-medium text-zinc-900">
                                      <span className="font-mono text-zinc-600">
                                        {c.slug}
                                      </span>
                                      <span
                                        className="mx-2 text-zinc-300"
                                        aria-hidden
                                      >
                                        ·
                                      </span>
                                      {c.name}
                                    </p>
                                  }
                                  hint="Datos ampliados del centro comercial"
                                />

                                <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-8">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="ubic"
                                    title="Ubicación"
                                  >
                                    <AdminDetailInset>
                                      <AdminDetailField label="Dirección">
                                        {adminDetailEmpty(c.address)}
                                      </AdminDetailField>
                                      <div className="grid gap-4 sm:grid-cols-2">
                                        <AdminDetailField label="Ciudad">
                                          {adminDetailEmpty(c.city)}
                                        </AdminDetailField>
                                        <AdminDetailField label="País">
                                          {adminDetailEmpty(c.country)}
                                        </AdminDetailField>
                                      </div>
                                    </AdminDetailInset>
                                  </AdminDetailSection>

                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="contact"
                                    title="Contacto del centro"
                                  >
                                    <AdminDetailInset>
                                      <AdminDetailField label="Teléfono">
                                        {adminDetailEmpty(c.phone)}
                                      </AdminDetailField>
                                      <AdminDetailField label="Correo">
                                        {c.contact_email?.trim() ? (
                                          <a
                                            href={`mailto:${c.contact_email.trim()}`}
                                            className="font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                          >
                                            {c.contact_email.trim()}
                                          </a>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Sitio web">
                                        {c.website?.trim() ? (
                                          <a
                                            href={
                                              /^https?:\/\//i.test(
                                                c.website.trim(),
                                              )
                                                ? c.website.trim()
                                                : `https://${c.website.trim()}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                          >
                                            {c.website.trim()}
                                          </a>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="mt-6 border-t border-zinc-100 pt-5">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="pricing"
                                    title="Precios y reserva"
                                  >
                                    <AdminDetailInset>
                                      <AdminDetailField label="Facturación">
                                        {RENTAL_BILLING_OPTIONS.find(
                                          (o) => o.value === normalizeRentalBillingUnit(c.rental_billing_unit),
                                        )?.label ?? adminDetailEmpty("")}
                                      </AdminDetailField>
                                      <AdminDetailField label="Meses temporada alta">
                                        {normalizeHighSeasonMonths(c.high_season_months).length
                                          ? normalizeHighSeasonMonths(c.high_season_months)
                                              .map((m) => MONTH_LABELS_ES[m - 1])
                                              .join(", ")
                                          : adminDetailEmpty("")}
                                      </AdminDetailField>
                                      <AdminDetailField label="Multiplicador">
                                        {normalizeHighSeasonMonths(c.high_season_months).length
                                          ? `×${parseHighSeasonMultiplier(c.high_season_multiplier)}`
                                          : adminDetailEmpty("")}
                                      </AdminDetailField>
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="mt-6 border-t border-zinc-100 pt-5">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="desc"
                                    title="Descripción"
                                  >
                                    <AdminDetailProse
                                      text={c.description}
                                      emptyHint="Aún no hay descripción del centro."
                                    />
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
              </div>
            ) : null}
            <AdminListPagination
              page={page}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}

        <AdminModal
          open={modal != null}
          onClose={closeModal}
          title={
            modal === "create"
              ? "Nuevo centro"
              : modal === "edit"
                ? "Editar centro"
                : "Detalle del centro"
          }
          subtitle={
            modal === "view"
              ? `${selected?.slug} · ${selected?.name}`
              : undefined
          }
          wide={modal !== "view"}
          footer={
            readOnly ? (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={adminSecondaryBtn}
                  onClick={closeModal}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className={adminPrimaryBtn}
                  onClick={() => {
                    openEdit(selected);
                  }}
                >
                  Editar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={adminSecondaryBtn}
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={adminPrimaryBtn}
                  onClick={submitSave}
                >
                  {modal === "create" ? "Crear" : "Guardar"}
                </button>
              </div>
            )
          }
        >
          {!readOnly && modalErr ? (
            <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert>
          ) : null}
          {readOnly && selected ? (
            <div className="space-y-4 text-sm">
              <CoverImageField
                readOnly
                variant="cover"
                existingUrl={selected.cover_image}
              />
              <div>
                <p className={adminLabel}>Nombre</p>
                <p className="mt-1 font-medium text-zinc-900">
                  {selected.name}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Slug (URL)</p>
                <p className="mt-1 font-mono text-zinc-800">{selected.slug}</p>
              </div>
              <div>
                <p className={adminLabel}>Ciudad</p>
                <p className="mt-1 text-zinc-800">{selected.city || "—"}</p>
              </div>
              <div>
                <p className={adminLabel}>
                  Zona / barrio (titular en tarjetas)
                </p>
                <p className="mt-1 text-zinc-800">
                  {selected.district?.trim() || "—"}
                </p>
              </div>
              {selected.display_title ? (
                <div>
                  <p className={adminLabel}>Título en tarjetas (calculado)</p>
                  <p className="mt-1 font-medium text-zinc-900">
                    {selected.display_title}
                  </p>
                </div>
              ) : null}
              <div>
                <p className={adminLabel}>En listado público de centros</p>
                <p className="mt-1 text-zinc-800">
                  {selected.on_homepage !== false ? "Sí" : "No"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Estado</p>
                <p className="mt-1 text-zinc-800">
                  {selected.is_active !== false ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Catálogo de reservas (marketplace)</p>
                <p className="mt-1 text-zinc-800">
                  {centerCatalogEnabled(selected) ? "Sí" : "No"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Facturación en marketplace</p>
                <p className="mt-1 text-zinc-800">
                  {RENTAL_BILLING_OPTIONS.find((o) => o.value === normalizeRentalBillingUnit(selected.rental_billing_unit))
                    ?.label ?? "Por mes de calendario"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Temporada alta</p>
                <p className="mt-1 text-zinc-800">
                  {normalizeHighSeasonMonths(selected.high_season_months).length
                    ? `${normalizeHighSeasonMonths(selected.high_season_months)
                        .map((m) => MONTH_LABELS_ES[m - 1])
                        .join(", ")} · ×${parseHighSeasonMultiplier(selected.high_season_multiplier)}`
                    : "Sin meses configurados (canon base todo el año)"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Creado</p>
                <p className="mt-1 tabular-nums text-zinc-800">
                  {selected.created_at
                    ? new Date(selected.created_at).toLocaleString("es-VE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Última actualización</p>
                <p className="mt-1 tabular-nums text-zinc-800">
                  {selected.updated_at
                    ? new Date(selected.updated_at).toLocaleString("es-VE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Orden en listado de centros</p>
                <p className="mt-1 tabular-nums text-zinc-800">
                  {selected.listing_order ?? 0}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Dirección</p>
                <p className="mt-1 text-zinc-800">{selected.address || "—"}</p>
              </div>
              <div>
                <p className={adminLabel}>País</p>
                <p className="mt-1 text-zinc-800">
                  {selected.country?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Teléfono del centro</p>
                <p className="mt-1 text-zinc-800">
                  {selected.phone?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Email de contacto</p>
                <p className="mt-1 text-zinc-800">
                  {selected.contact_email?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Sitio web</p>
                <p className="mt-1 break-all text-zinc-800">
                  {selected.website?.trim() || "—"}
                </p>
              </div>
              <div>
                <p className={adminLabel}>Descripción</p>
                <p className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {selected.description?.trim() || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <CoverImageField
                readOnly={false}
                variant="cover"
                existingUrl={existingCover}
                filePreviewUrl={filePreview}
                onFileChange={(f) => {
                  setCoverFile(f);
                  setPendingClearCover(false);
                }}
                onClearExisting={() => {
                  setPendingClearCover(true);
                  setCoverFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                fileInputRef={fileRef}
              />
              <div>
                <label className={adminLabel} htmlFor="c-name">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  id="c-name"
                  className={fieldClass("name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {fieldErrors?.name ? (
                  <p className="mt-1 text-xs text-rose-700">
                    {fieldErrors.name}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-slug">
                  Slug (URL) <span className="text-red-600">*</span>
                </label>
                <input
                  id="c-slug"
                  className={fieldClass("slug")}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="solo-minusculas-numeros-guiones"
                />
                {fieldErrors?.slug ? (
                  <p className="mt-1 text-xs text-rose-700">
                    {fieldErrors.slug}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  Identificador en enlaces públicos (?center=, /m/…, API). Solo
                  letras minúsculas, números y guiones.
                </p>
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-city">
                  Ciudad <span className="text-red-600">*</span>
                </label>
                <input
                  id="c-city"
                  className={fieldClass("city")}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
                {fieldErrors?.city ? (
                  <p className="mt-1 text-xs text-rose-700">
                    {fieldErrors.city}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-district">
                  Zona / barrio (titular en tarjetas)
                </label>
                <input
                  id="c-district"
                  className={adminField}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Ej. Chacao, La Candelaria…"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Centro activo (inactivo: sin catálogo de tomas ni reservas en
                  el marketplace)
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={marketplaceCatalogEnabled}
                    onChange={(e) =>
                      setMarketplaceCatalogEnabled(e.target.checked)
                    }
                  />
                  Catálogo de reservas en marketplace (tomas públicas y ruta
                  /m/…)
                </label>
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-billing-unit">
                  Facturación en marketplace
                </label>
                <AdminSelect
                  inputId="c-billing-unit"
                  value={RENTAL_BILLING_OPTIONS.find((o) => o.value === rentalBillingUnit) ?? RENTAL_BILLING_OPTIONS[0]}
                  onChange={(opt) => setRentalBillingUnit(opt?.value ?? "calendar_month")}
                  options={RENTAL_BILLING_OPTIONS}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Por día: el cliente elige fechas concretas; el total usa canon mensual ÷ 30 por día (temporada alta
                  por mes del día).
                </p>
              </div>
              <HighSeasonMonthsField
                value={highSeasonMonths}
                onChange={setHighSeasonMonths}
                multiplier={highSeasonMultiplier}
                onMultiplierChange={setHighSeasonMultiplier}
              />
              <div className="space-y-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={onHomepage}
                    onChange={(e) => setOnHomepage(e.target.checked)}
                  />
                  Incluir en listado público de centros
                </label>
                <p className="ml-6 text-xs text-zinc-500">
                  La portada principal del sitio muestra tomas, no centros. Esto
                  solo afecta el API de centros y posibles integraciones.
                </p>
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-order">
                  Orden en listado de centros
                </label>
                <input
                  id="c-order"
                  type="number"
                  min={0}
                  className={`${adminField} max-w-[8rem]`}
                  value={listingOrder}
                  onChange={(e) => setListingOrder(e.target.value)}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Número menor = aparece antes en ese listado.
                </p>
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-addr">
                  Dirección
                </label>
                <input
                  id="c-addr"
                  className={adminField}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-country">
                  País
                </label>
                <input
                  id="c-country"
                  className={adminField}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-phone">
                  Teléfono del centro
                </label>
                <input
                  id="c-phone"
                  className={adminField}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-cemail">
                  Email de contacto
                </label>
                <input
                  id="c-cemail"
                  type="email"
                  className={adminField}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-web">
                  Sitio web
                </label>
                <input
                  id="c-web"
                  type="url"
                  className={adminField}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-desc">
                  Descripción
                </label>
                <textarea
                  id="c-desc"
                  className={adminField}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}
        </AdminModal>

        <AdminConfirmDialog
          open={deleteTargetId != null}
          onClose={() => setDeleteTargetId(null)}
          title="Eliminar centro"
          confirmLabel="Eliminar"
          onConfirm={async () => {
            if (deleteTargetId == null) return;
            await executeDeleteCenter(deleteTargetId);
          }}
        >
          <p>¿Eliminar este centro? Se borrarán tomas asociadas.</p>
        </AdminConfirmDialog>

        <ImageLightbox
          open={portadaLightbox.open}
          onClose={() => setPortadaLightbox((s) => ({ ...s, open: false }))}
          items={portadaLightbox.items}
          initialIndex={portadaLightbox.initialIndex}
          showDownload={false}
          showThumbnails={false}
          ariaLabel="Portada del centro comercial"
        />
      </div>
    </>
  );
}
