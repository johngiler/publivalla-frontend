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
import { LeaseCanonHighSeasonPanel } from "@/components/admin/LeaseCanonHighSeasonPanel";
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
import {
  ADMIN_CENTERS_ALL_SWR_KEY,
  adminCentersAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
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
import {
  formatDateTimeFull,
  formatHumanDateTime,
} from "@/lib/humanDateTime";
import { parsePaginatedResponse } from "@/services/api";
import {
  adminShoppingCenterAccordionHeader,
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
  const [filterCity, setFilterCity] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const filtersActive =
    filterQ.trim() !== "" || filterCity !== "all" || filterActive !== "all";

  const centersAllKey = authReady && accessToken ? ADMIN_CENTERS_ALL_SWR_KEY : null;
  const { data: centersAllData } = useSWR(centersAllKey, adminCentersAllPagesFetcher);
  const cityFilterOptions = useMemo(() => {
    const list = Array.isArray(centersAllData) ? centersAllData : [];
    const cities = new Set();
    for (const c of list) {
      const city = String(c?.city ?? "").trim();
      if (city) cities.add(city);
    }
    return [
      { v: "all", l: "Todas las ciudades" },
      ...[...cities]
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .map((city) => ({ v: city, l: city })),
    ];
  }, [centersAllData]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("Venezuela");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [municipalAuthorityLine, setMunicipalAuthorityLine] = useState("");
  const [authorizationLetterCity, setAuthorizationLetterCity] = useState("Caracas");
  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [pendingClearCover, setPendingClearCover] = useState(false);
  const fileRef = useRef(null);

  const listKey =
    authReady && accessToken
      ? centersAdminListPath(page, debouncedFilterQ, filterActive, filterCity)
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
  }, [debouncedFilterQ, filterCity, filterActive]);

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
    setDescription("");
    setIsActive(true);
    setMunicipalAuthorityLine("");
    setAuthorizationLetterCity("Caracas");
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
    setModal("create");
    setFieldErrors({});
    setModalErr("");
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
    setDescription(c.description || "");
    setIsActive(c.is_active !== false);
    setMunicipalAuthorityLine(c.municipal_authority_line?.trim() || "");
    setAuthorizationLetterCity(
      c.authorization_letter_city?.trim() || "Caracas",
    );
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
    const extra = {
      is_active: isActive,
      municipal_authority_line: municipalAuthorityLine.trim(),
      authorization_letter_city:
        authorizationLetterCity.trim() || "Caracas",
    };
    try {
      if (modal === "create") {
        if (coverFile) {
          const fd = new FormData();
          fd.append("name", name.trim());
          fd.append("slug", slug.trim());
          fd.append("city", city.trim());
          fd.append("address", address.trim());
          fd.append("country", country.trim());
          fd.append("description", description.trim());
          fd.append("is_active", isActive ? "true" : "false");
          fd.append("municipal_authority_line", municipalAuthorityLine.trim());
          fd.append(
            "authorization_letter_city",
            authorizationLetterCity.trim() || "Caracas",
          );
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
          fd.append("address", address.trim());
          fd.append("country", country.trim());
          fd.append("description", description.trim());
          fd.append("is_active", isActive ? "true" : "false");
          fd.append("municipal_authority_line", municipalAuthorityLine.trim());
          fd.append(
            "authorization_letter_city",
            authorizationLetterCity.trim() || "Caracas",
          );
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

  const existingCover =
    selected?.cover_image && !pendingClearCover ? selected.cover_image : null;

  useEffect(() => {
    setExpandedId(null);
  }, [filterQ, filterCity, filterActive, page]);

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
                placeholder="Nombre del centro comercial…"
                className="min-w-0 flex-[1.6]"
              />
              <AdminFilterSelect
                id="centros-filter-city"
                label="Ciudad"
                value={filterCity}
                onChange={setFilterCity}
                options={cityFilterOptions}
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
                  setFilterCity("all");
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
                      setFilterCity("all");
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
                                  onView={() => setExpandedId(open ? null : c.id)}
                                  onEdit={() => openEdit(c)}
                                  onDelete={() => askDeleteCenter(c.id)}
                                />
                              </td>
                            </tr>
                            {open ? (
                              <AdminAccordionRowPanel
                                colSpan={8}
                                panelId={panelId}
                              >
                                <AdminAccordionDetailHeader
                                  {...adminShoppingCenterAccordionHeader(c.slug, c.name)}
                                />

                                <div className="mt-5 grid w-full max-w-none grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="general"
                                    title="Datos del centro"
                                  >
                                    <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                                      <AdminDetailField label="Nombre">
                                        {adminDetailEmpty(c.name)}
                                      </AdminDetailField>
                                      <AdminDetailField label="Slug (URL)">
                                        <span className="font-mono text-zinc-800">
                                          {adminDetailEmpty(c.slug)}
                                        </span>
                                      </AdminDetailField>
                                      <AdminDetailField label="Estado">
                                        {c.is_active !== false ? "Activo" : "Inactivo"}
                                      </AdminDetailField>
                                      <AdminDetailField label="Espacios publicitarios">
                                        {typeof c.tomas_count === "number"
                                          ? String(c.tomas_count)
                                          : adminDetailEmpty("")}
                                      </AdminDetailField>
                                      {c.display_title ? (
                                        <AdminDetailField label="Título en tarjetas">
                                          {c.display_title}
                                        </AdminDetailField>
                                      ) : null}
                                      <AdminDetailField label="Creado">
                                        {c.created_at ? (
                                          <time
                                            dateTime={c.created_at}
                                            title={formatDateTimeFull(c.created_at)}
                                          >
                                            {formatHumanDateTime(c.created_at)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Última actualización">
                                        {c.updated_at ? (
                                          <time
                                            dateTime={c.updated_at}
                                            title={formatDateTimeFull(c.updated_at)}
                                          >
                                            {formatHumanDateTime(c.updated_at)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                    </AdminDetailInset>
                                  </AdminDetailSection>

                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="ubic"
                                    title="Ubicación"
                                  >
                                    <AdminDetailInset className="grid gap-4 sm:grid-cols-2">
                                      <AdminDetailField label="País">
                                        {adminDetailEmpty(c.country)}
                                      </AdminDetailField>
                                      <AdminDetailField label="Ciudad">
                                        {adminDetailEmpty(c.city)}
                                      </AdminDetailField>
                                      <div className="sm:col-span-2">
                                        <AdminDetailField label="Dirección">
                                          {adminDetailEmpty(c.address)}
                                        </AdminDetailField>
                                      </div>
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="mt-6 grid w-full max-w-none grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="municipio"
                                    title="Carta al municipio"
                                  >
                                    <AdminDetailInset className="grid gap-4">
                                      <AdminDetailField label="Destinatario (Atención)">
                                        {adminDetailEmpty(c.municipal_authority_line)}
                                      </AdminDetailField>
                                      <AdminDetailField label="Ciudad en encabezado de fecha">
                                        {adminDetailEmpty(c.authorization_letter_city)}
                                      </AdminDetailField>
                                    </AdminDetailInset>
                                  </AdminDetailSection>

                                  <AdminDetailSection
                                    panelId={panelId}
                                    sectionId="lease-canon"
                                    title="Canon de arrendamiento"
                                  >
                                    <AdminDetailInset>
                                      <LeaseCanonHighSeasonPanel slug={c.slug} name={c.name} />
                                    </AdminDetailInset>
                                  </AdminDetailSection>
                                </div>

                                <div className="mt-6 w-full max-w-none">
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
                                <div className="mt-4 flex justify-end border-t border-zinc-100 pt-4">
                                  <button
                                    type="button"
                                    className={adminPrimaryBtn}
                                    onClick={() => openEdit(c)}
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
          title={modal === "create" ? "Nuevo centro" : "Editar centro"}
          wide
          footer={
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
          }
        >
          {modalErr ? (
            <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert>
          ) : null}
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
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Centro activo?
                </label>
              </div>
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-900">Canon de arrendamiento</p>
                <LeaseCanonHighSeasonPanel slug={slug} name={name} className="mt-2" />
              </div>
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-semibold text-zinc-900">Carta al municipio</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Texto del bloque «Atención» en el PDF de autorización municipal. Si lo dejas vacío,
                  el sistema intenta inferirlo por el nombre del centro.
                </p>
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-municipal-auth">
                  Destinatario (Atención)
                </label>
                <input
                  id="c-municipal-auth"
                  className={fieldClass("municipal_authority_line")}
                  value={municipalAuthorityLine}
                  onChange={(e) => setMunicipalAuthorityLine(e.target.value)}
                  placeholder="Ej. Sres. Alcaldía Municipio Chacao"
                />
                {fieldErrors?.municipal_authority_line ? (
                  <p className="mt-1 text-xs text-rose-700">
                    {fieldErrors.municipal_authority_line}
                  </p>
                ) : null}
              </div>
              <div>
                <label className={adminLabel} htmlFor="c-auth-letter-city">
                  Ciudad en encabezado de fecha
                </label>
                <input
                  id="c-auth-letter-city"
                  className={fieldClass("authorization_letter_city")}
                  value={authorizationLetterCity}
                  onChange={(e) => setAuthorizationLetterCity(e.target.value)}
                  placeholder="Caracas"
                />
                {fieldErrors?.authorization_letter_city ? (
                  <p className="mt-1 text-xs text-rose-700">
                    {fieldErrors.authorization_letter_city}
                  </p>
                ) : null}
              </div>
          </div>
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
          <p>¿Eliminar este centro? Se borrarán los espacios publicitarios asociados.</p>
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
