"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import {
  AdminAccordionDetailHeader,
  AdminAccordionRowPanel,
  AdminDetailField,
  AdminDetailInset,
  AdminDetailSection,
  adminDetailEmpty,
} from "@/components/admin/AdminAccordionDetail";
import { AdminCopyIconButton } from "@/components/admin/AdminCopyIconButton";
import { AdminAccordionToggle } from "@/components/admin/AdminAccordionToggle";
import { AdminCreatePlusIcon } from "@/components/admin/AdminCreatePlusIcon";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminModal } from "@/components/admin/AdminModal";
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
import {
  CLIENT_STATUS,
  clientStatusLabel,
  clientStatusPillClassName,
} from "@/components/admin/adminConstants";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { IconAdminBriefcase, IconAdminUserPlus } from "@/components/admin/adminIcons";
import { ClientesUsuariosSectionSkeleton } from "@/components/admin/skeletons/ClientesUsuariosSectionSkeleton";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { ThumbnailPlaceholder } from "@/components/media/ThumbnailPlaceholder";
import { rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, EmptyStateIconBriefcase } from "@/components/ui/EmptyState";
import { clientsListPath } from "@/lib/adminListQuery";
import { ADMIN_CLIENTS_ALL_SWR_KEY, authJsonFetcher } from "@/lib/swr/fetchers";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
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
import { AdminListQuerySync } from "@/components/admin/AdminListQuerySync";
import {
  AdminDashboardFilterLink,
  dashboardUsuariosSearchHref,
} from "@/lib/adminDashboardLinks";
import { fieldErrorsFromDrfData } from "@/lib/adminFieldErrors";

const CLIENT_STATUS_FILTERS = [{ v: "all", l: "Todos los estados" }, ...CLIENT_STATUS];

/** Pedidos vinculados (viene del listado admin con `orders_count`). */
function clientOrdersCount(c) {
  const n = c?.orders_count;
  return typeof n === "number" && !Number.isNaN(n) ? n : 0;
}

function clientCanBeDeleted(c) {
  return clientOrdersCount(c) === 0;
}

/** Sin usuarios marketplace vinculados y con correo en ficha. */
function clientCanGenerateUser(c) {
  if (c == null) return false;
  const hasLinked =
    (Array.isArray(c.linked_usernames) && c.linked_usernames.length > 0) ||
    (Array.isArray(c.linked_user_ids) && c.linked_user_ids.length > 0);
  const em = typeof c.email === "string" && c.email.trim() !== "";
  return !hasLinked && em;
}

/** Texto de usuarios vinculados al cliente (nombres de usuario, más legible que IDs). */
function formatLinkedUsersDisplay(c) {
  if (c == null) return "—";
  if (Array.isArray(c.linked_usernames) && c.linked_usernames.length > 0) {
    return c.linked_usernames.join(", ");
  }
  if (Array.isArray(c.linked_user_ids) && c.linked_user_ids.length > 0) {
    return c.linked_user_ids.join(", ");
  }
  return "—";
}

function LinkedUsernamesAdminLinks({ usernames }) {
  if (!Array.isArray(usernames) || usernames.length === 0) return null;
  return (
    <>
      {usernames.map((uname, i) => (
        <Fragment key={uname}>
          {i > 0 ? ", " : null}
          <AdminDashboardFilterLink href={dashboardUsuariosSearchHref(uname)}>
            {uname}
          </AdminDashboardFilterLink>
        </Fragment>
      ))}
    </>
  );
}

export function ClientesAdminSection() {
  const { authReady, accessToken } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [generatingClientId, setGeneratingClientId] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [filterClientStatus, setFilterClientStatus] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const filtersActive = filterQ.trim() !== "" || filterClientStatus !== "all";

  const [companyName, setCompanyName] = useState("");
  const [rif, setRif] = useState("");
  const [contactName, setContactName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativeIdNumber, setRepresentativeIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clStatus, setClStatus] = useState("active");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [pendingClearCover, setPendingClearCover] = useState(false);
  const fileRef = useRef(null);

  const listKey =
    authReady && accessToken ? clientsListPath(page, debouncedFilterQ, filterClientStatus) : null;
  const { data, error: swrError, isLoading, mutate: mutateClients } = useSWR(listKey, authJsonFetcher, {
    keepPreviousData: true,
  });

  const rows = useMemo(() => (data ? parsePaginatedResponse(data).results : []), [data]);
  const totalCount = useMemo(() => (data ? parsePaginatedResponse(data).count : 0), [data]);

  const reloadClientes = useCallback(async () => {
    await Promise.all([mutateClients(), globalMutate(ADMIN_CLIENTS_ALL_SWR_KEY)]);
  }, [mutateClients]);

  const ready =
    !(authReady && accessToken) ||
    (!isLoading && (data !== undefined || swrError !== undefined));

  useEffect(() => {
    setPageErr(
      swrError ? (swrError instanceof Error ? swrError.message : String(swrError)) : "",
    );
  }, [swrError]);

  useEffect(() => {
    setPage(1);
  }, [debouncedFilterQ, filterClientStatus]);

  useEffect(() => {
    if (!coverFile) {
      setFilePreview("");
      return;
    }
    const u = URL.createObjectURL(coverFile);
    setFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [coverFile]);

  function resetForm() {
    setCompanyName("");
    setRif("");
    setContactName("");
    setRepresentativeName("");
    setRepresentativeIdNumber("");
    setEmail("");
    setPhone("");
    setClStatus("active");
    setAddress("");
    setCity("");
    setNotes("");
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  function openCreate() {
    setSelected(null);
    resetForm();
    setModal("create");
    setModalErr("");
    setFieldErrors({});
  }

  function openView(c) {
    setSelected(c);
    setModal("view");
  }

  function openEdit(c) {
    if (!c) return;
    setSelected(c);
    setCompanyName(c.company_name);
    setRif(c.rif);
    setContactName(c.contact_name || "");
    setRepresentativeName(c.representative_name || "");
    setRepresentativeIdNumber(c.representative_id_number || "");
    setEmail(c.email);
    setPhone(c.phone || "");
    setClStatus(c.status);
    setAddress(c.address || "");
    setCity(c.city || "");
    setNotes(c.notes || "");
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
    setModal("edit");
    setModalErr("");
    setFieldErrors({});
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    resetForm();
    setModalErr("");
    setFieldErrors({});
  }

  async function generateUserForClient(c) {
    if (!c?.id || !clientCanGenerateUser(c)) return;
    setPageErr("");
    setMsg("");
    setGeneratingClientId(c.id);
    try {
      const data = await authFetch(`/api/clients/${c.id}/generate-user/`, { method: "POST" });
      const q = typeof data?.registration_query === "string" ? data.registration_query : "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = q && origin ? `${origin}/registro?${q}` : "";
      if (fullUrl) {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setMsg(
            `Usuario generado para ${data.email || c.email}. Enlace de registro copiado al portapapeles; compártelo con la empresa.`,
          );
        } catch {
          setMsg(
            `Usuario generado para ${data.email || c.email}. Copia manualmente este enlace: ${fullUrl}`,
          );
        }
      } else {
        setMsg(`Usuario generado para ${data?.email || c.email}.`);
      }
      await reloadClientes();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "No se pudo generar el usuario.");
    } finally {
      setGeneratingClientId(null);
    }
  }

  async function submitSave() {
    setModalErr("");
    setMsg("");
    setFieldErrors({});
    const nextFe = {};
    if (!companyName.trim()) nextFe.company_name = "Campo obligatorio.";
    if (!rif.trim()) nextFe.rif = "Campo obligatorio.";
    if (!email.trim()) nextFe.email = "Campo obligatorio.";
    if (Object.keys(nextFe).length) {
      setFieldErrors(nextFe);
      setModalErr("Revisa los campos marcados.");
      return;
    }
    try {
      if (modal === "create") {
        if (coverFile) {
          const fd = new FormData();
          fd.append("company_name", companyName.trim());
          fd.append("rif", rif.trim());
          fd.append("contact_name", contactName.trim());
          fd.append("representative_name", representativeName.trim());
          fd.append("representative_id_number", representativeIdNumber.trim());
          fd.append("email", email.trim());
          fd.append("phone", phone.trim());
          fd.append("address", address.trim());
          fd.append("city", city.trim());
          fd.append("notes", notes.trim());
          fd.append("status", clStatus);
          fd.append("cover_image", coverFile);
          await authFetchForm("/api/clients/", { method: "POST", formData: fd });
        } else {
          await authFetch("/api/clients/", {
            method: "POST",
            body: {
              company_name: companyName.trim(),
              rif: rif.trim(),
              contact_name: contactName.trim(),
              representative_name: representativeName.trim(),
              representative_id_number: representativeIdNumber.trim(),
              email: email.trim(),
              phone: phone.trim(),
              address: address.trim(),
              city: city.trim(),
              notes: notes.trim(),
              status: clStatus,
            },
          });
        }
        setMsg("Empresa creada.");
      } else if (modal === "edit" && selected) {
        if (coverFile) {
          const fd = new FormData();
          fd.append("company_name", companyName.trim());
          if (!(selected.rif || "").trim()) {
            fd.append("rif", rif.trim());
          }
          fd.append("contact_name", contactName.trim());
          fd.append("representative_name", representativeName.trim());
          fd.append("representative_id_number", representativeIdNumber.trim());
          fd.append("email", email.trim());
          fd.append("phone", phone.trim());
          fd.append("address", address.trim());
          fd.append("city", city.trim());
          fd.append("notes", notes.trim());
          fd.append("status", clStatus);
          fd.append("cover_image", coverFile);
          await authFetchForm(`/api/clients/${selected.id}/`, { method: "PATCH", formData: fd });
        } else {
          const body = {
            company_name: companyName.trim(),
            contact_name: contactName.trim(),
            representative_name: representativeName.trim(),
            representative_id_number: representativeIdNumber.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
            notes: notes.trim(),
            status: clStatus,
          };
          if (!(selected.rif || "").trim()) {
            body.rif = rif.trim();
          }
          if (pendingClearCover) body.cover_image = null;
          await authFetch(`/api/clients/${selected.id}/`, { method: "PATCH", body });
        }
        setMsg("Empresa actualizada.");
      }
      closeModal();
      await reloadClientes();
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

  function askDeleteClient(id) {
    setDeleteTargetId(id);
  }

  async function executeDeleteClient(id) {
    setPageErr("");
    try {
      await authFetch(`/api/clients/${id}/`, { method: "DELETE" });
        setMsg("Empresa eliminada.");
      await reloadClientes();
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "Error");
      throw e;
    }
  }

  const readOnly = modal === "view";
  const existingCover = selected?.cover_image && !pendingClearCover ? selected.cover_image : null;

  useEffect(() => {
    setExpandedId(null);
  }, [filterQ, filterClientStatus, page]);

  if (!ready) {
    return <ClientesUsuariosSectionSkeleton />;
  }

  return (
    <>
      <AdminListQuerySync onQuery={setFilterQ} />
      <div className={adminPanelCard}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={adminSectionHeaderIconWrap}>
            <IconAdminBriefcase className="!h-8 !w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Empresas</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {totalCount} empresa{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
          <AdminCreatePlusIcon />
          <span className={adminCreateBtnLabel}>Nueva empresa</span>
        </button>
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
            icon={<EmptyStateIconBriefcase />}
            title="No hay empresas registradas"
            description="Todavía no hay empresas dadas de alta. Puedes registrar la primera con «Nueva empresa» o aparecerán cuando un usuario complete los datos en Mi empresa."
          />
        </div>
      ) : (
        <>
          <AdminFiltersRow>
            <AdminFilterSearchInput
              id="clientes-filter-q"
              value={filterQ}
              onChange={setFilterQ}
              placeholder="Empresa, correo, contacto…"
            />
            <AdminFilterSelect
              id="clientes-filter-status"
              label="Estado de la ficha"
              value={filterClientStatus}
              onChange={setFilterClientStatus}
              options={CLIENT_STATUS_FILTERS}
            />
            <AdminFilterClearButton
              show={filtersActive}
              onClick={() => {
                setFilterQ("");
                setFilterClientStatus("all");
                setPage(1);
              }}
            />
          </AdminFiltersRow>

          {rows.length === 0 && filtersActive ? (
            <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
              <p>Ninguna empresa coincide con los filtros.</p>
              <div className="mt-5 flex justify-center">
                <FilterClearAction
                  onClick={() => {
                    setFilterQ("");
                    setFilterClientStatus("all");
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
                    Foto
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Empresa
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Email
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Usuarios vinculados
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
                const panelId = `cliente-extra-${c.id}`;
                const linkedUsersText = formatLinkedUsersDisplay(c);
                const clientAvatarUrl = rawMediaUrlFromApiField(c.cover_image);
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                      <td className="px-2 py-2.5">
                        <AdminAccordionToggle
                          expanded={open}
                          onToggle={() => setExpandedId(open ? null : c.id)}
                          rowId={c.id}
                          controlsId={panelId}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative flex h-11 w-11 overflow-hidden rounded-full border border-zinc-100 bg-zinc-100">
                          {clientAvatarUrl ? (
                            <RasterFromApiUrl
                              url={clientAvatarUrl}
                              alt=""
                              width={44}
                              height={44}
                              className="h-full w-full object-cover"
                              {...catalogRasterImgAttrs}
                            />
                          ) : (
                            <ThumbnailPlaceholder variant="avatar" />
                          )}
                        </div>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 font-medium text-zinc-900" title={c.company_name}>
                        {c.company_name}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2.5 text-sm text-zinc-800">
                        {c.email?.trim() ? (
                          <a
                            href={`mailto:${encodeURIComponent(c.email.trim())}`}
                            className="block truncate font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                            title={c.email.trim()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.email.trim()}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[16rem] px-3 py-2 align-middle text-zinc-700">
                        {clientCanGenerateUser(c) ? (
                          <button
                            type="button"
                            className={`${adminSecondaryBtn} !justify-start gap-1.5 px-2.5 py-1.5 text-left text-xs font-semibold`}
                            title="Crea usuario sin contraseña y copia el enlace para que definan su clave"
                            disabled={generatingClientId === c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              void generateUserForClient(c);
                            }}
                          >
                            <IconAdminUserPlus className="!h-4 !w-4 shrink-0" />
                            <span className="min-w-0">
                              {generatingClientId === c.id ? "Generando…" : "Generar usuario"}
                            </span>
                          </button>
                        ) : (
                          <span className="block truncate" title={linkedUsersText}>
                            {Array.isArray(c.linked_usernames) && c.linked_usernames.length > 0 ? (
                              <LinkedUsernamesAdminLinks usernames={c.linked_usernames} />
                            ) : (
                              linkedUsersText
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${clientStatusPillClassName(c.status)}`}
                        >
                          {clientStatusLabel(c.status, c.status_label)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <AdminRowActions
                          onView={() => openView(c)}
                          onEdit={() => openEdit(c)}
                          showDelete={clientCanBeDeleted(c)}
                          deleteDisabledTitle="Tiene pedidos relacionados. Revisa la sección Pedidos antes de eliminar."
                          onDelete={() => askDeleteClient(c.id)}
                        />
                      </td>
                    </tr>
                    {open ? (
                      <AdminAccordionRowPanel colSpan={7} panelId={panelId}>
                        <AdminAccordionDetailHeader
                          badgeText={typeof c.rif === "string" && c.rif.trim() !== "" ? c.rif.trim() : undefined}
                          titleLabel="Empresa en sistema"
                          titleLine={c.company_name}
                          hint="Datos de contacto y ubicación"
                        />

                        <div className="mt-5 grid gap-6 lg:grid-cols-2">
                          <AdminDetailSection panelId={panelId} sectionId="contact" title="Contacto">
                            <AdminDetailInset>
                              <AdminDetailField label="Usuarios vinculados">
                                {Array.isArray(c.linked_usernames) && c.linked_usernames.length > 0 ? (
                                  <span className="text-sm text-zinc-800">
                                    <LinkedUsernamesAdminLinks usernames={c.linked_usernames} />
                                  </span>
                                ) : linkedUsersText !== "—" ? (
                                  <span className="text-sm text-zinc-800">{linkedUsersText}</span>
                                ) : (
                                  <span className="text-sm text-zinc-400">
                                    Ninguno · usa «Generar usuario» en la columna Usuarios vinculados o crea la cuenta
                                    en Usuarios
                                  </span>
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="Representante legal">
                                {c.representative_name?.trim() ? (
                                  <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                                    <span>{c.representative_name.trim()}</span>
                                    <AdminCopyIconButton
                                      value={c.representative_name.trim()}
                                      ariaLabel="Copiar representante legal"
                                    />
                                  </span>
                                ) : (
                                  adminDetailEmpty("")
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="Cédula del representante">
                                {c.representative_id_number?.trim() ? (
                                  <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 font-mono text-sm text-zinc-800">
                                    <span>{c.representative_id_number.trim()}</span>
                                    <AdminCopyIconButton
                                      value={c.representative_id_number.trim()}
                                      ariaLabel="Copiar cédula del representante"
                                    />
                                  </span>
                                ) : (
                                  <span className="font-mono text-sm text-zinc-800">{adminDetailEmpty("")}</span>
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="Persona de contacto">
                                {c.contact_name?.trim() ? (
                                  <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                                    <span>{c.contact_name.trim()}</span>
                                    <AdminCopyIconButton
                                      value={c.contact_name.trim()}
                                      ariaLabel="Copiar persona de contacto"
                                    />
                                  </span>
                                ) : (
                                  adminDetailEmpty("")
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="Email">
                                {c.email?.trim() ? (
                                  <a
                                    href={`mailto:${c.email.trim()}`}
                                    className="break-all font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                  >
                                    {c.email.trim()}
                                  </a>
                                ) : (
                                  adminDetailEmpty("")
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="RIF">
                                {c.rif?.trim() ? (
                                  <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 font-mono text-sm text-zinc-800">
                                    <span>{c.rif.trim()}</span>
                                    <AdminCopyIconButton value={c.rif.trim()} ariaLabel="Copiar RIF" />
                                  </span>
                                ) : (
                                  <span className="font-mono text-sm text-zinc-800">{adminDetailEmpty("")}</span>
                                )}
                              </AdminDetailField>
                              <AdminDetailField label="Teléfono">
                                {c.phone?.trim() ? (
                                  <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                                    <span>{c.phone.trim()}</span>
                                    <AdminCopyIconButton
                                      value={c.phone.trim()}
                                      ariaLabel="Copiar teléfono"
                                    />
                                  </span>
                                ) : (
                                  adminDetailEmpty("")
                                )}
                              </AdminDetailField>
                            </AdminDetailInset>
                          </AdminDetailSection>

                          <AdminDetailSection panelId={panelId} sectionId="ubic" title="Ubicación">
                            <AdminDetailInset>
                              <AdminDetailField label="Ciudad">{adminDetailEmpty(c.city)}</AdminDetailField>
                              <AdminDetailField label="Dirección fiscal / oficina">
                                {adminDetailEmpty(c.address)}
                              </AdminDetailField>
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
        </div>
          ) : null}
          <AdminListPagination page={page} totalCount={totalCount} onPageChange={setPage} />
        </>
      )}

      <AdminModal
        open={modal != null}
        onClose={closeModal}
        title={
          modal === "create"
            ? "Nueva empresa"
            : modal === "edit"
              ? "Editar empresa"
              : "Detalle de la empresa"
        }
        subtitle={modal === "view" ? selected?.company_name : undefined}
        wide
        footer={
          readOnly ? (
            <div className="flex justify-end gap-2">
              <button type="button" className={adminSecondaryBtn} onClick={closeModal}>
                Cerrar
              </button>
              <button type="button" className={adminPrimaryBtn} onClick={() => openEdit(selected)}>
                Editar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={adminSecondaryBtn} onClick={closeModal}>
                Cancelar
              </button>
              <button type="button" className={adminPrimaryBtn} onClick={submitSave}>
                {modal === "create" ? "Crear" : "Guardar"}
              </button>
            </div>
          )
        }
      >
        {!readOnly && modalErr ? <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert> : null}
        {readOnly && selected ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CoverImageField readOnly variant="avatar" existingUrl={selected.cover_image} />
            </div>
            <div className="sm:col-span-2">
              <p className={adminLabel}>Razón social</p>
              <p className="mt-1 font-medium text-zinc-900">{selected.company_name}</p>
            </div>
            <div>
              <p className={adminLabel}>RIF</p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 font-mono text-sm text-zinc-800">
                <span>{selected.rif?.trim() || "—"}</span>
                {selected.rif?.trim() ? (
                  <AdminCopyIconButton value={selected.rif.trim()} ariaLabel="Copiar RIF" />
                ) : null}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Estado</p>
              <p className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${clientStatusPillClassName(selected.status)}`}
                >
                  {clientStatusLabel(selected.status, selected.status_label)}
                </span>
              </p>
            </div>
            <div>
              <p className={adminLabel}>Representante legal</p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                <span>{selected.representative_name?.trim() || "—"}</span>
                {selected.representative_name?.trim() ? (
                  <AdminCopyIconButton
                    value={selected.representative_name.trim()}
                    ariaLabel="Copiar representante legal"
                  />
                ) : null}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Cédula del representante</p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 font-mono text-sm text-zinc-800">
                <span>{selected.representative_id_number?.trim() || "—"}</span>
                {selected.representative_id_number?.trim() ? (
                  <AdminCopyIconButton
                    value={selected.representative_id_number.trim()}
                    ariaLabel="Copiar cédula del representante"
                  />
                ) : null}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Persona de contacto</p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                <span>{selected.contact_name?.trim() || "—"}</span>
                {selected.contact_name?.trim() ? (
                  <AdminCopyIconButton
                    value={selected.contact_name.trim()}
                    ariaLabel="Copiar persona de contacto"
                  />
                ) : null}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Usuarios vinculados</p>
              <p className="mt-1 text-sm text-zinc-800">
                {Array.isArray(selected.linked_usernames) && selected.linked_usernames.length > 0 ? (
                  <LinkedUsernamesAdminLinks usernames={selected.linked_usernames} />
                ) : (
                  formatLinkedUsersDisplay(selected)
                )}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Solo lectura. Puedes usar «Generar usuario» en la columna Usuarios vinculados (enlace para definir
                contraseña) o enlazar cuentas en Usuarios con rol «Cliente marketplace». Varias cuentas pueden compartir
                la misma ficha.
              </p>
            </div>
            <div>
              <p className={adminLabel}>Email</p>
              <p className="mt-1 text-sm text-zinc-800">{selected.email}</p>
            </div>
            <div>
              <p className={adminLabel}>Teléfono</p>
              <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-sm text-zinc-800">
                <span>{selected.phone?.trim() || "—"}</span>
                {selected.phone?.trim() ? (
                  <AdminCopyIconButton value={selected.phone.trim()} ariaLabel="Copiar teléfono" />
                ) : null}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Ciudad</p>
              <p className="mt-1 text-sm text-zinc-800">{selected.city?.trim() || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className={adminLabel}>Dirección fiscal / oficina</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                {selected.address?.trim() || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className={adminLabel}>Notas internas</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {selected.notes?.trim() || "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CoverImageField
                readOnly={false}
                variant="avatar"
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
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="cl-name">
                Razón social <span className="text-red-600">*</span>
              </label>
              <input
                id="cl-name"
                className={fieldClass("company_name")}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              {fieldErrors?.company_name ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.company_name}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-rif">
                RIF <span className="text-red-600">*</span>
              </label>
              <input
                id="cl-rif"
                className={adminField}
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                required
                placeholder="Ej. J-12345678-9"
                disabled={modal === "edit" && Boolean((selected?.rif || "").trim())}
              />
              {modal === "edit" && (selected?.rif || "").trim() ? (
                <p className="mt-1 text-xs text-zinc-500">El RIF no se puede cambiar.</p>
              ) : null}
              {fieldErrors?.rif ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.rif}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-status">
                Estado
              </label>
              <AdminSelect
                id="cl-status"
                options={CLIENT_STATUS}
                value={clStatus}
                onChange={(v) => setClStatus(v || "active")}
                inModal
                aria-label="Estado de la empresa"
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-rep">
                Representante legal
              </label>
              <input
                id="cl-rep"
                className={adminField}
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-rep-ci">
                Cédula del representante
              </label>
              <input
                id="cl-rep-ci"
                className={adminField}
                value={representativeIdNumber}
                onChange={(e) => setRepresentativeIdNumber(e.target.value)}
                placeholder="Ej. V-12345678"
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-contact">
                Persona de contacto
              </label>
              <input
                id="cl-contact"
                className={adminField}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-email">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="cl-email"
                type="email"
                className={fieldClass("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {fieldErrors?.email ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-phone">
                Teléfono
              </label>
              <input
                id="cl-phone"
                className={adminField}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className={adminLabel} htmlFor="cl-city">
                Ciudad
              </label>
              <input id="cl-city" className={adminField} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="cl-address">
                Dirección
              </label>
              <textarea
                id="cl-address"
                className={adminField}
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="cl-notes">
                Notas internas
              </label>
              <textarea
                id="cl-notes"
                className={adminField}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Solo visibles en el panel"
              />
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog
        open={deleteTargetId != null}
        onClose={() => setDeleteTargetId(null)}
        title="Eliminar empresa"
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTargetId == null) return;
          await executeDeleteClient(deleteTargetId);
        }}
      >
        <p>
          ¿Eliminar esta empresa del sistema? Solo aparece esta opción si no tiene pedidos vinculados. Esta acción no se
          puede deshacer.
        </p>
      </AdminConfirmDialog>
    </div>
    </>
  );
}
