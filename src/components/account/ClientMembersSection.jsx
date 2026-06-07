"use client";

import { useCallback, useId, useMemo, useState } from "react";
import useSWR from "swr";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { authJsonFetcher, MY_COMPANY_MEMBERS_SWR_KEY } from "@/lib/swr/fetchers";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import {
  createMyCompanyMember,
  deleteMyCompanyMember,
  updateMyCompanyMember,
} from "@/services/authApi";

const fieldClass = `mp-form-field-accent min-h-9 w-full ${ROUNDED_CONTROL} border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 shadow-sm transition-[border-color,background-color] duration-200 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none`;

const rowCardClass = `rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-sm sm:p-3`;

const actionBtnClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-zinc-200/90 bg-white text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)] disabled:opacity-50";

const selfBadgeClass =
  "inline-flex shrink-0 items-center rounded-full border border-zinc-200/90 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600";

function PlusIcon({ className = "h-3 w-3" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function memberLabel(member) {
  const full = [member?.first_name, member?.last_name].filter(Boolean).join(" ").trim();
  return full || member?.email || "Usuario";
}

function brandIdsFromMember(member) {
  if (!Array.isArray(member?.brands)) return [];
  return member.brands.map((b) => b.id);
}

/**
 * @param {{
 *   brands: Array<{ id: number; name: string }>;
 *   hasProfile: boolean;
 *   accessToken: string | null;
 * }} props
 */
export function ClientMembersSection({ brands, hasProfile, accessToken }) {
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftBrandIds, setDraftBrandIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const draftEmailId = useId();

  const membersKey =
    hasProfile && accessToken ? MY_COMPANY_MEMBERS_SWR_KEY : null;
  const { data: membersData, mutate: mutateMembers } = useSWR(
    membersKey,
    authJsonFetcher,
  );
  const members = Array.isArray(membersData) ? membersData : [];

  const brandOptions = useMemo(
    () => brands.map((b) => ({ v: b.id, l: b.name })),
    [brands],
  );

  const updateMemberInList = useCallback(
    (updated) => {
      mutateMembers(
        (prev) => {
          if (!Array.isArray(prev)) return [updated];
          return prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
        },
        { revalidate: false },
      );
    },
    [mutateMembers],
  );

  const removeMemberFromList = useCallback(
    (id) => {
      mutateMembers(
        (prev) => (Array.isArray(prev) ? prev.filter((m) => m.id !== id) : prev),
        { revalidate: false },
      );
    },
    [mutateMembers],
  );

  const appendMember = useCallback(
    (member) => {
      mutateMembers(
        (prev) => {
          const list = Array.isArray(prev) ? [...prev, member] : [member];
          return list.sort((a, b) => memberLabel(a).localeCompare(memberLabel(b)));
        },
        { revalidate: false },
      );
    },
    [mutateMembers],
  );

  async function saveDraft() {
    setErr("");
    const email = draftEmail.trim();
    if (!email) {
      setErr("Indica el correo del usuario.");
      return;
    }
    setBusyId("draft");
    try {
      const created = await createMyCompanyMember(
        {
          email,
          first_name: draftFirstName.trim(),
          last_name: draftLastName.trim(),
          brand_ids: draftBrandIds,
        },
        { token: accessToken },
      );
      appendMember(created);
      setDraftOpen(false);
      setDraftEmail("");
      setDraftFirstName("");
      setDraftLastName("");
      setDraftBrandIds([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo agregar el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveMemberFields(member, fields) {
    setBusyId(member.id);
    setErr("");
    try {
      const updated = await updateMyCompanyMember(member.id, fields, {
        token: accessToken,
      });
      updateMemberInList(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const member = deleteTarget;
    if (!member) return;
    setBusyId(member.id);
    setErr("");
    try {
      await deleteMyCompanyMember(member.id, { token: accessToken });
      removeMemberFromList(member.id);
      setDeleteTarget(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo eliminar el usuario.");
      throw e;
    } finally {
      setBusyId(null);
    }
  }

  if (!hasProfile) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        Registra primero los datos de tu empresa para poder agregar usuarios.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <ul className="space-y-2">
        {members.map((member) => {
          const isBusy = busyId === member.id;
          const brandIds = brandIdsFromMember(member);

          return (
            <li key={member.id} className={rowCardClass}>
              <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {memberLabel(member)}
                    </p>
                    {member.is_self ? <span className={selfBadgeClass}>Tú</span> : null}
                  </div>
                  <p className="truncate text-xs text-zinc-500">{member.email}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label
                        className="sr-only"
                        htmlFor={`member-fn-${member.id}`}
                      >
                        Nombre de {memberLabel(member)}
                      </label>
                      <input
                        id={`member-fn-${member.id}`}
                        type="text"
                        className={fieldClass}
                        placeholder="Nombre"
                        defaultValue={member.first_name || ""}
                        disabled={isBusy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (member.first_name || "").trim()) return;
                          void saveMemberFields(member, { first_name: v });
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="sr-only"
                        htmlFor={`member-ln-${member.id}`}
                      >
                        Apellido de {memberLabel(member)}
                      </label>
                      <input
                        id={`member-ln-${member.id}`}
                        type="text"
                        className={fieldClass}
                        placeholder="Apellido"
                        defaultValue={member.last_name || ""}
                        disabled={isBusy}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v === (member.last_name || "").trim()) return;
                          void saveMemberFields(member, { last_name: v });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-xs font-medium text-zinc-600"
                      htmlFor={`member-brands-${member.id}`}
                    >
                      Marcas
                    </label>
                    <AdminSelect
                      id={`member-brands-${member.id}`}
                      isMulti
                      compact
                      isClearable
                      isDisabled={isBusy || brandOptions.length === 0}
                      placeholder={
                        brandOptions.length === 0
                          ? "Agrega marcas en la sección anterior"
                          : "Seleccionar marcas…"
                      }
                      options={brandOptions}
                      value={brandIds}
                      onChange={(nextIds) => {
                        const normalized = Array.isArray(nextIds) ? nextIds : [];
                        const same =
                          normalized.length === brandIds.length &&
                          normalized.every((id) => brandIds.includes(id));
                        if (same) return;
                        void saveMemberFields(member, { brand_ids: normalized });
                      }}
                    />
                  </div>
                </div>

                {!member.is_self ? (
                  <button
                    type="button"
                    className={actionBtnClass}
                    aria-label={`Eliminar ${memberLabel(member)}`}
                    disabled={isBusy}
                    onClick={() => setDeleteTarget(member)}
                  >
                    <IconRowTrash className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}

        {draftOpen ? (
          <li className={`${rowCardClass} border-dashed`}>
            <div className="space-y-2.5">
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-zinc-700"
                  htmlFor={draftEmailId}
                >
                  Correo <span className="text-red-600">*</span>
                </label>
                <input
                  id={draftEmailId}
                  type="email"
                  className={fieldClass}
                  placeholder="correo@empresa.com"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  disabled={busyId === "draft"}
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="Nombre"
                  value={draftFirstName}
                  onChange={(e) => setDraftFirstName(e.target.value)}
                  disabled={busyId === "draft"}
                />
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="Apellido"
                  value={draftLastName}
                  onChange={(e) => setDraftLastName(e.target.value)}
                  disabled={busyId === "draft"}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Marcas (opcional)
                </label>
                <AdminSelect
                  id="draft-member-brands"
                  isMulti
                  compact
                  isClearable
                  isDisabled={busyId === "draft" || brandOptions.length === 0}
                  placeholder={
                    brandOptions.length === 0
                      ? "Agrega marcas en la sección anterior"
                      : "Seleccionar marcas…"
                  }
                  options={brandOptions}
                  value={draftBrandIds}
                  onChange={(nextIds) =>
                    setDraftBrandIds(Array.isArray(nextIds) ? nextIds : [])
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${marketplacePrimaryBtn} px-4 py-2 text-sm`}
                  disabled={busyId === "draft"}
                  onClick={() => void saveDraft()}
                >
                  {busyId === "draft" ? "Guardando…" : "Añadir"}
                </button>
                <button
                  type="button"
                  className="rounded-[10px] border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  disabled={busyId === "draft"}
                  onClick={() => {
                    setDraftOpen(false);
                    setDraftEmail("");
                    setDraftFirstName("");
                    setDraftLastName("");
                    setDraftBrandIds([]);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </li>
        ) : null}
      </ul>

      {!draftOpen ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] border border-zinc-200/90 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
            onClick={() => setDraftOpen(true)}
          >
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--mp-primary)_12%,white)] text-[color:var(--mp-primary)]"
              aria-hidden
            >
              <PlusIcon />
            </span>
            Agregar usuario
          </button>
        </div>
      ) : null}

      {err ? (
        <p
          role="alert"
          className={`${ROUNDED_CONTROL} border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800`}
        >
          {err}
        </p>
      ) : null}

      <CustomAlert
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        destructive
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        ¿Eliminar a «{deleteTarget ? memberLabel(deleteTarget) : ""}»? Perderá el acceso a
        la cuenta de la empresa.
      </CustomAlert>
    </div>
  );
}
