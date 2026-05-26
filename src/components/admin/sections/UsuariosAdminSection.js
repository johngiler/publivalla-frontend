"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { AdminSelect } from "@/components/admin/AdminSelect";
import { IconAdminUserPlus } from "@/components/admin/adminIcons";
import { ClientesUsuariosSectionSkeleton } from "@/components/admin/skeletons/ClientesUsuariosSectionSkeleton";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { ThumbnailPlaceholder } from "@/components/media/ThumbnailPlaceholder";
import { rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaceCapabilities } from "@/hooks/useWorkspaceCapabilities";
import { EmptyState, EmptyStateIconUsers } from "@/components/ui/EmptyState";
import { usersAdminListPath } from "@/lib/adminListQuery";
import {
  ADMIN_CLIENTS_ALL_SWR_KEY,
  adminClientsAllPagesFetcher,
  authJsonFetcher,
} from "@/lib/swr/fetchers";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  formatDateTimeFull,
  formatHumanDateTime,
} from "@/lib/humanDateTime";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { parsePaginatedResponse } from "@/services/api";
import { authFetch, authFetchForm } from "@/services/authApi";
import { fieldErrorsFromDrfData } from "@/lib/adminFieldErrors";
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
  dashboardClientesSearchHref,
} from "@/lib/adminDashboardLinks";

function EmpresaVinculadaAdminLink({ companyName }) {
  const n = typeof companyName === "string" ? companyName.trim() : "";
  if (!n) return null;
  return (
    <AdminDashboardFilterLink href={dashboardClientesSearchHref(n)}>{n}</AdminDashboardFilterLink>
  );
}

function IconEye({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEyeOff({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ROLE_OPTIONS = [
  { v: "client", l: "Cliente marketplace" },
  { v: "admin", l: "Administrador marketplace" },
];

const ROLE_FILTER_OPTIONS = [
  { v: "all", l: "Todos los roles" },
  ...ROLE_OPTIONS,
];

function roleLabel(role) {
  const o = ROLE_OPTIONS.find((x) => x.v === role);
  return o ? o.l : role;
}

export function UsuariosAdminSection() {
  const { authReady, accessToken, me, refreshUser } = useAuth();
  const { caps } = useWorkspaceCapabilities();
  const canCreateAdminUsers = caps.can_create_marketplace_admin_users;
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [pageErr, setPageErr] = useState("");
  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [passwordLinkUserId, setPasswordLinkUserId] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedFilterQ = useDebouncedValue(filterQ, 400);
  const filtersActive = filterQ.trim() !== "" || filterRole !== "all";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [role, setRole] = useState("client");
  const [linkedClientId, setLinkedClientId] = useState("");

  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [pendingClearCover, setPendingClearCover] = useState(false);
  const fileRef = useRef(null);

  const usersListKey =
    authReady && accessToken ? usersAdminListPath(page, debouncedFilterQ, filterRole) : null;
  const {
    data: usersData,
    error: usersSwrError,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR(usersListKey, authJsonFetcher, { keepPreviousData: true });

  const clientsAllKey = authReady && accessToken ? ADMIN_CLIENTS_ALL_SWR_KEY : null;
  const {
    data: clientsAllData,
    error: clientsSwrError,
    isLoading: clientsLoading,
    mutate: mutateClientsAll,
  } = useSWR(clientsAllKey, adminClientsAllPagesFetcher);

  const rows = useMemo(
    () => (usersData ? parsePaginatedResponse(usersData).results : []),
    [usersData],
  );
  const totalCount = useMemo(
    () => (usersData ? parsePaginatedResponse(usersData).count : 0),
    [usersData],
  );
  const clientRows = useMemo(
    () => (Array.isArray(clientsAllData) ? clientsAllData : []),
    [clientsAllData],
  );

  const reloadUsers = useCallback(() => mutateUsers(), [mutateUsers]);
  const reloadClients = useCallback(() => mutateClientsAll(), [mutateClientsAll]);

  const ready =
    !(authReady && accessToken) ||
    ((!usersLoading && (usersData !== undefined || usersSwrError !== undefined)) &&
      (!clientsLoading && (clientsAllData !== undefined || clientsSwrError !== undefined)));

  const clientSelectOptions = useMemo(() => {
    const base = [{ v: "", l: "Sin empresa vinculada" }];
    return base.concat(
      clientRows.map((c) => {
        const name = typeof c.company_name === "string" ? c.company_name.trim() : "";
        const rif = typeof c.rif === "string" ? c.rif.trim() : "";
        const l = rif && name ? `${name} · ${rif}` : name || rif || "Sin nombre";
        return { v: String(c.id), l };
      }),
    );
  }, [clientRows]);

  const roleOptionsForModal = useMemo(
    () =>
      ROLE_OPTIONS.map((o) =>
        o.v === "admin" && !canCreateAdminUsers ? { ...o, disabled: true } : o,
      ),
    [canCreateAdminUsers],
  );

  useEffect(() => {
    if (!canCreateAdminUsers && role === "admin" && modal === "create") {
      setRole("client");
    }
  }, [canCreateAdminUsers, role, modal]);

  useEffect(() => {
    const u = usersSwrError
      ? usersSwrError instanceof Error
        ? usersSwrError.message
        : String(usersSwrError)
      : "";
    const c = clientsSwrError
      ? clientsSwrError instanceof Error
        ? clientsSwrError.message
        : String(clientsSwrError)
      : "";
    setPageErr(u || c);
  }, [usersSwrError, clientsSwrError]);

  function fieldClass(name) {
    return `${adminField} ${fieldErrors?.[name] ? "mp-admin-field-error" : ""}`;
  }

  useEffect(() => {
    setPage(1);
  }, [debouncedFilterQ, filterRole]);

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
    setUsername("");
    setEmail("");
    setPassword("");
    setShowUserPassword(false);
    setRole("client");
    setLinkedClientId("");
    setCoverFile(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openCreate() {
    setSelected(null);
    resetForm();
    setModal("create");
    void reloadClients();
    setModalErr("");
    setFieldErrors({});
  }

  function openView(u) {
    setSelected(u);
    setModal("view");
  }

  function openEdit(u) {
    if (!u) return;
    void reloadClients();
    setSelected(u);
    setUsername(u.username);
    setEmail(u.email || "");
    setPassword("");
    setRole(u.role || "client");
    setLinkedClientId(u.client_id != null ? String(u.client_id) : "");
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

  async function copyPasswordSetupLink(u) {
    if (!u?.id || u.role !== "client" || u.has_usable_password !== false) return;
    setPageErr("");
    setMsg("");
    setPasswordLinkUserId(u.id);
    try {
      const data = await authFetch(`/api/admin/users/${u.id}/password-setup-link/`, {
        method: "POST",
      });
      const q = typeof data?.registration_query === "string" ? data.registration_query : "";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = q && origin ? `${origin}/registro?${q}` : "";
      if (fullUrl) {
        try {
          await navigator.clipboard.writeText(fullUrl);
          setMsg("Enlace de registro copiado al portapapeles.");
        } catch {
          setMsg(`Copia manualmente este enlace: ${fullUrl}`);
        }
      }
    } catch (e) {
      setPageErr(e instanceof Error ? e.message : "No se pudo generar el enlace.");
    } finally {
      setPasswordLinkUserId(null);
    }
  }

  async function submitSave() {
    setModalErr("");
    setMsg("");
    setFieldErrors({});
    const nextFe = {};
    if (!username.trim()) nextFe.username = "Campo obligatorio.";
    if (!email.trim()) nextFe.email = "Campo obligatorio.";
    if (Object.keys(nextFe).length) {
      setFieldErrors(nextFe);
      setModalErr("Revisa los campos marcados.");
      return;
    }
    try {
      if (modal === "create") {
        if (role === "client" && (!linkedClientId || linkedClientId === "")) {
          setModalErr(
            "Selecciona la empresa vinculada para el rol cliente marketplace.",
          );
          setFieldErrors({ client_id: "Campo obligatorio." });
          return;
        }
        if (password.length < 8) {
          setModalErr("La contraseña debe tener al menos 8 caracteres.");
          setFieldErrors({ password: "Debe tener al menos 8 caracteres." });
          return;
        }
        if (coverFile) {
          const fd = new FormData();
          fd.append("username", username.trim());
          fd.append("email", email.trim());
          fd.append("password", password);
          fd.append("role", role);
          fd.append("cover_image", coverFile);
          if (role === "client") fd.append("client_id", linkedClientId || "");
          await authFetchForm("/api/admin/users/", {
            method: "POST",
            formData: fd,
          });
        } else {
          await authFetch("/api/admin/users/", {
            method: "POST",
            body: {
              username: username.trim(),
              email: email.trim(),
              password,
              role,
              ...(role === "client"
                ? {
                    client_id: linkedClientId
                      ? parseInt(linkedClientId, 10)
                      : null,
                  }
                : {}),
            },
          });
        }
        setMsg("Usuario creado.");
      } else if (modal === "edit" && selected) {
        if (role === "client" && (!linkedClientId || linkedClientId === "")) {
          setModalErr(
            "Selecciona la empresa vinculada para el rol cliente marketplace.",
          );
          setFieldErrors({ client_id: "Campo obligatorio." });
          return;
        }
        if (password && password.length < 8) {
          setModalErr("La contraseña debe tener al menos 8 caracteres.");
          setFieldErrors({ password: "Debe tener al menos 8 caracteres." });
          return;
        }
        if (coverFile) {
          const fd = new FormData();
          fd.append("email", email.trim());
          fd.append("role", role);
          if (password.trim()) fd.append("password", password.trim());
          fd.append("cover_image", coverFile);
          if (role === "client")
            fd.append("client_id", linkedClientId ? linkedClientId : "");
          await authFetchForm(`/api/admin/users/${selected.id}/`, {
            method: "PATCH",
            formData: fd,
          });
        } else {
          const body = {
            email: email.trim(),
            role,
          };
          if (password.trim()) body.password = password.trim();
          if (pendingClearCover) body.cover_image = null;
          if (role === "client")
            body.client_id = linkedClientId
              ? parseInt(linkedClientId, 10)
              : null;
          await authFetch(`/api/admin/users/${selected.id}/`, {
            method: "PATCH",
            body,
          });
        }
        setMsg("Usuario actualizado.");
        if (me && selected.id === me.id) {
          await refreshUser();
        }
      }
      closeModal();
      await reloadUsers();
      await reloadClients();
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

  function askDeleteUser(u) {
    if (u.id === me?.id) {
      setPageErr("No puedes eliminar tu propio usuario.");
      return;
    }
    setPendingDeleteUser(u);
  }

  async function executeDeleteUser(u) {
    setPageErr("");
    try {
      await authFetch(`/api/admin/users/${u.id}/`, { method: "DELETE" });
      setMsg("Usuario eliminado.");
      await reloadUsers();
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
  }, [filterQ, filterRole, page]);

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
            <IconAdminUserPlus className="!h-8 !w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {totalCount} usuario{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button type="button" className={adminPrimaryBtn} onClick={openCreate}>
          <AdminCreatePlusIcon />
          <span className={adminCreateBtnLabel}>Nuevo usuario</span>
        </button>
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
            icon={<EmptyStateIconUsers />}
            title="No hay usuarios registrados"
            description="Todavía no hay cuentas en el sistema. Puedes crear la primera con «Nuevo usuario»."
          />
        </div>
      ) : (
        <>
          <AdminFiltersRow>
            <AdminFilterSearchInput
              id="usuarios-filter-q"
              value={filterQ}
              onChange={setFilterQ}
              placeholder="Usuario, correo, empresa…"
            />
            <AdminFilterSelect
              id="usuarios-filter-role"
              label="Rol"
              value={filterRole}
              onChange={setFilterRole}
              options={ROLE_FILTER_OPTIONS}
            />
            <AdminFilterClearButton
              show={filtersActive}
              onClick={() => {
                setFilterQ("");
                setFilterRole("all");
                setPage(1);
              }}
            />
          </AdminFiltersRow>

          {rows.length === 0 && filtersActive ? (
            <div className="mt-6 rounded-[15px] border border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
              <p>Ningún usuario coincide con los filtros.</p>
              <div className="mt-5 flex justify-center">
                <FilterClearAction
                  onClick={() => {
                    setFilterQ("");
                    setFilterRole("all");
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
                        Usuario
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Empresa vinculada
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Rol
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => {
                      const isSelf = u.id === me?.id;
                      const open = expandedId === u.id;
                      const panelId = `usuario-extra-${u.id}`;
                      const avatarUrl = rawMediaUrlFromApiField(u.cover_image);
                      return (
                        <Fragment key={u.id}>
                          <tr className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/70">
                            <td className="px-2 py-2.5">
                              <AdminAccordionToggle
                                expanded={open}
                                onToggle={() =>
                                  setExpandedId(open ? null : u.id)
                                }
                                rowId={u.id}
                                controlsId={panelId}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="relative flex h-11 w-11 overflow-hidden rounded-full border border-zinc-100 bg-zinc-100">
                                {avatarUrl ? (
                                  <RasterFromApiUrl
                                    url={avatarUrl}
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
                            <td className="px-3 py-2.5 font-medium text-zinc-900">
                              {u.username}
                              {isSelf ? (
                                <span className="mp-text-brand ml-2 text-xs font-normal">
                                  Tu sesión
                                </span>
                              ) : null}
                            </td>
                            <td
                              className="max-w-[11rem] truncate px-3 py-2.5 text-sm text-zinc-700"
                              title={
                                typeof u.client_company_name === "string" && u.client_company_name.trim()
                                  ? u.client_company_name.trim()
                                  : undefined
                              }
                            >
                              {u.role === "client" && u.client_company_name?.trim() ? (
                                <EmpresaVinculadaAdminLink companyName={u.client_company_name} />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-700">
                              {roleLabel(u.role)}
                            </td>
                            <td className="px-3 py-2">
                              <AdminRowActions
                                onView={() => openView(u)}
                                onEdit={() => openEdit(u)}
                                onDelete={() => askDeleteUser(u)}
                                showDelete={!isSelf}
                                deleteDisabledTitle="No puedes eliminar tu propio usuario"
                                trailing={
                                  u.role === "client" && u.has_usable_password === false ? (
                                    <button
                                      type="button"
                                      className={`${adminSecondaryBtn} ml-1 shrink-0 px-2 py-1.5 text-xs font-semibold`}
                                      title="Copia el enlace para que defina su contraseña en /registro"
                                      disabled={passwordLinkUserId === u.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void copyPasswordSetupLink(u);
                                      }}
                                    >
                                      {passwordLinkUserId === u.id ? "Copiando…" : "Copiar enlace"}
                                    </button>
                                  ) : null
                                }
                              />
                            </td>
                          </tr>
                          {open ? (
                            <AdminAccordionRowPanel
                              colSpan={6}
                              panelId={panelId}
                            >
                              <AdminAccordionDetailHeader
                                titleLabel="Usuario"
                                titleLine={
                                  <p className="truncate text-sm font-medium text-zinc-900">
                                    {u.username}
                                    {isSelf ? (
                                      <span className="mp-text-brand ml-2 text-xs font-normal">
                                        Tu sesión
                                      </span>
                                    ) : null}
                                  </p>
                                }
                                hint="Permisos y alta en el sistema"
                              />

                              <div className="mt-5">
                                <AdminDetailSection
                                  panelId={panelId}
                                  sectionId="account"
                                  title="Cuenta y permisos"
                                >
                                  <AdminDetailInset>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                      <AdminDetailField label="Rol">
                                        {roleLabel(u.role)}
                                      </AdminDetailField>
                                      <AdminDetailField label="Email">
                                        {u.email?.trim() ? (
                                          <a
                                            href={`mailto:${u.email.trim()}`}
                                            className="break-all font-medium text-zinc-900 no-underline underline-offset-2 hover:underline"
                                          >
                                            {u.email.trim()}
                                          </a>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      <AdminDetailField label="Fecha de alta">
                                        {u.date_joined ? (
                                          <time
                                            dateTime={u.date_joined}
                                            title={formatDateTimeFull(u.date_joined)}
                                          >
                                            {formatHumanDateTime(u.date_joined)}
                                          </time>
                                        ) : (
                                          adminDetailEmpty("")
                                        )}
                                      </AdminDetailField>
                                      {u.role === "client" ? (
                                        <AdminDetailField label="Empresa vinculada">
                                          {u.client_company_name?.trim() ? (
                                            <EmpresaVinculadaAdminLink companyName={u.client_company_name} />
                                          ) : (
                                            adminDetailEmpty("")
                                          )}
                                        </AdminDetailField>
                                      ) : null}
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
            ? "Nuevo usuario"
            : modal === "edit"
              ? "Editar usuario"
              : "Detalle del usuario"
        }
        subtitle={modal === "view" ? selected?.username : undefined}
        wide
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
                onClick={() => openEdit(selected)}
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
        {!readOnly && modalErr ? <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert> : null}
        {readOnly && selected ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CoverImageField
                readOnly
                variant="avatar"
                existingUrl={selected.cover_image}
              />
            </div>
            <div>
              <p className={adminLabel}>Usuario</p>
              <p className="mt-1 font-mono text-sm font-medium text-zinc-900">
                {selected.username}
              </p>
            </div>
            <div>
              <p className={adminLabel}>Rol</p>
              <p className="mt-1 text-sm text-zinc-800">
                {roleLabel(selected.role)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className={adminLabel}>Email</p>
              <p className="mt-1 text-sm text-zinc-800">
                {selected.email || "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className={adminLabel}>Alta</p>
              <p className="mt-1 text-sm text-zinc-800">
                {selected.date_joined ? (
                  <time
                    dateTime={selected.date_joined}
                    title={formatDateTimeFull(selected.date_joined)}
                  >
                    {formatHumanDateTime(selected.date_joined)}
                  </time>
                ) : (
                  "—"
                )}
              </p>
            </div>
            {selected.role === "client" ? (
              <div className="sm:col-span-2">
                <p className={adminLabel}>Empresa vinculada</p>
                <p className="mt-1 text-sm text-zinc-800">
                  {selected.client_company_name?.trim() ? (
                    <EmpresaVinculadaAdminLink companyName={selected.client_company_name} />
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            ) : null}
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
              <label className={adminLabel} htmlFor="u-user">
                Nombre de usuario <span className="text-red-600">*</span>
              </label>
              <input
                id="u-user"
                className={fieldClass("username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={modal === "create"}
                disabled={modal === "edit"}
                autoComplete="off"
              />
              {fieldErrors?.username ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.username}</p>
              ) : null}
              {modal === "edit" ? (
                <p className="mt-1 text-xs text-zinc-500">
                  El nombre de usuario no se puede cambiar.
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="u-email">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="u-email"
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
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="u-pass">
                {modal === "create"
                  ? "Contraseña inicial"
                  : "Nueva contraseña (opcional)"}
              </label>
              <div className="relative">
                <input
                  id="u-pass"
                  type={showUserPassword ? "text" : "password"}
                  className={`${fieldClass("password")} pr-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={modal === "create"}
                  minLength={modal === "create" ? 8 : undefined}
                  autoComplete="new-password"
                  placeholder={
                    modal === "edit" ? "Dejar vacío para no cambiar" : ""
                  }
                />
                {fieldErrors?.password ? (
                  <p className="mt-1 text-xs text-rose-700">{fieldErrors.password}</p>
                ) : null}
                <button
                  type="button"
                  className="mp-ring-brand absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[15px] text-zinc-500 transition-colors hover:bg-zinc-100/80 hover:text-zinc-800 focus:outline-none"
                  aria-label={
                    showUserPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showUserPassword}
                  onClick={() => setShowUserPassword((v) => !v)}
                >
                  {showUserPassword ? (
                    <IconEyeOff className="shrink-0" />
                  ) : (
                    <IconEye className="shrink-0" />
                  )}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="u-role">
                Rol
              </label>
              <AdminSelect
                id="u-role"
                options={roleOptionsForModal}
                value={role}
                onChange={(v) => {
                  const r = v || "client";
                  setRole(r);
                  if (r === "admin") setLinkedClientId("");
                }}
                inModal
                aria-label="Rol de usuario"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {canCreateAdminUsers ? (
                  <>
                    Los administradores pueden gestionar el panel y crear usuarios. Si cambias el
                    rol, la persona puede necesitar cerrar sesión e iniciar de nuevo para que se
                    apliquen los permisos.
                  </>
                ) : (
                  <>
                    En este workspace no está permitido crear ni promover usuarios con rol
                    administrador. Los demás roles siguen disponibles. Si necesitas cambiar este
                    permiso, contacta a la plataforma.
                  </>
                )}
              </p>
            </div>
            {role === "client" ? (
              <div className="sm:col-span-2">
                <label className={adminLabel} htmlFor="u-client">
                  Empresa vinculada
                </label>
                <AdminSelect
                  id="u-client"
                  options={clientSelectOptions}
                  value={linkedClientId}
                  onChange={(v) =>
                    setLinkedClientId(v != null && v !== "" ? String(v) : "")
                  }
                  inModal
                  isSearchable
                  placeholder="Buscar por razón social o ID…"
                  aria-label="Seleccionar empresa a vincular"
                />
                {clientRows.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-800">
                    No hay empresas en el listado. Crea primero una empresa en la sección Empresas para poder
                    seleccionarla aquí.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">
                    Obligatorio para este rol. El workspace del owner se toma de la
                    empresa. Un usuario → una empresa; la misma empresa puede
                    tener varios usuarios.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog
        open={pendingDeleteUser != null}
        onClose={() => setPendingDeleteUser(null)}
        title="Eliminar usuario"
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!pendingDeleteUser) return;
          await executeDeleteUser(pendingDeleteUser);
        }}
      >
        <p>
          ¿Eliminar al usuario{" "}
          <span className="font-semibold text-zinc-900">
            &quot;{pendingDeleteUser?.username}&quot;
          </span>
          ? Esta acción no se puede deshacer.
        </p>
      </AdminConfirmDialog>
    </div>
    </>
  );
}
