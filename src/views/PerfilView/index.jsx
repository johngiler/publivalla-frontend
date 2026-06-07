"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { CoverImageField } from "@/components/admin/CoverImageField";
import { useAuth } from "@/context/AuthContext";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { AUTH_ME_SWR_KEY, authJsonFetcher } from "@/lib/swr/fetchers";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { changeMePassword, patchMe } from "@/services/authApi";

const fieldClass = `mp-form-field-accent mt-1.5 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-zinc-400 focus:outline-none sm:min-h-0 sm:py-2 sm:text-sm`;

const roleBadgeClass =
  "inline-flex max-w-full shrink-0 items-center rounded-full border border-orange-200/90 bg-gradient-to-r from-orange-50/95 via-amber-50/80 to-white px-3 py-1 text-xs font-semibold text-orange-950 shadow-sm ring-1 ring-orange-100/70 sm:text-sm";

function marketplaceRoleLabel(role) {
  if (role === "admin") return "Administrador marketplace";
  if (role === "client") return "Cliente marketplace";
  return typeof role === "string" && role.trim() ? role : "";
}

function SectionTitle({ children, id }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500"
    >
      <span
        className="h-px w-6 bg-gradient-to-r from-[color-mix(in_srgb,var(--mp-primary)_60%,transparent)] to-transparent"
        aria-hidden
      />
      {children}
    </h2>
  );
}

export default function PerfilView() {
  const router = useRouter();
  const { authReady, me, accessToken, refreshUser, role } = useAuth();
  const fileRef = useRef(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pendingClearCover, setPendingClearCover] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [pwdErr, setPwdErr] = useState("");
  const [pwdOk, setPwdOk] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const profileKey = authReady && accessToken && me ? AUTH_ME_SWR_KEY : null;
  const { data: profileSwr, mutate: mutateProfileSwr } = useSWR(profileKey, authJsonFetcher, {
    fallbackData: me ?? undefined,
  });
  const profileDisplay = profileSwr ?? me;

  useEffect(() => {
    if (!authReady) return;
    if (!me) {
      router.replace("/login?next=/cuenta/perfil");
    }
  }, [authReady, me, router]);

  useEffect(() => {
    if (!profileDisplay) return;
    setEmail(profileDisplay.email || "");
    setFirstName(profileDisplay.first_name || "");
    setLastName(profileDisplay.last_name || "");
    setCoverFile(null);
    setFilePreview(null);
    setPendingClearCover(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [
    profileDisplay?.id,
    profileDisplay?.email,
    profileDisplay?.first_name,
    profileDisplay?.last_name,
    profileDisplay?.cover_image,
  ]);

  useEffect(() => {
    if (!coverFile) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  if (!authReady || !me) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--mp-primary)]" />
        <p className="mt-4 text-sm">Cargando…</p>
      </div>
    );
  }

  async function onSaveProfile(e) {
    e.preventDefault();
    setProfileErr("");
    setProfileOk("");
    setProfileSaving(true);
    try {
      const useMultipart = coverFile != null || pendingClearCover;
      if (useMultipart) {
        const fd = new FormData();
        fd.append("email", email.trim());
        fd.append("first_name", firstName.trim());
        fd.append("last_name", lastName.trim());
        if (coverFile) fd.append("cover_image", coverFile);
        if (pendingClearCover) fd.append("remove_cover", "true");
        await patchMe(fd, { token: accessToken });
      } else {
        await patchMe(
          {
            email: email.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          { token: accessToken },
        );
      }
      const m = await refreshUser();
      if (m) await mutateProfileSwr(m, { revalidate: false });
      setCoverFile(null);
      setPendingClearCover(false);
      setFilePreview(null);
      if (fileRef.current) fileRef.current.value = "";
      setProfileOk("Datos guardados correctamente.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setProfileSaving(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPwdErr("");
    setPwdOk("");
    if (newPassword !== confirmPassword) {
      setPwdErr("Las contraseñas nuevas no coinciden.");
      return;
    }
    setPwdSaving(true);
    try {
      await changeMePassword(
        { old_password: oldPassword, new_password: newPassword },
        { token: accessToken },
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdOk("Contraseña actualizada correctamente.");
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : "Error al cambiar la contraseña");
    } finally {
      setPwdSaving(false);
    }
  }

  const profileRoleBadge = marketplaceRoleLabel(role);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-5 py-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:px-6 sm:py-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent" aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Mi perfil
          </h1>
          {profileRoleBadge ? (
            <span className={roleBadgeClass} aria-label={`Rol: ${profileRoleBadge}`}>
              {profileRoleBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
          Correo, nombre y foto de tu cuenta.
        </p>
      </div>

      <form
        onSubmit={onSaveProfile}
        className={`relative mt-8 overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-zinc-100/80`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent" aria-hidden />
        <div className="p-5 sm:p-6">
        <SectionTitle id="sec-foto">Foto y datos</SectionTitle>

        <div className="mt-5 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 sm:p-5">
          <CoverImageField
            readOnly={false}
            variant="avatar"
            existingUrl={pendingClearCover ? "" : profileDisplay?.cover_image}
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

        <div className="mt-8 space-y-5">
          <div>
            <p className="text-sm font-medium text-zinc-800">Usuario</p>
            <div
              className={`mt-1.5 ${ROUNDED_CONTROL} border border-dashed border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 font-mono text-sm text-zinc-800`}
            >
              {profileDisplay?.username}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">No editable desde aquí.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-email">
              Correo <span className="text-red-600">*</span>
            </label>
            <input
              id="pf-email"
              type="email"
              required
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-first">
                Nombre
              </label>
              <input
                id="pf-first"
                className={fieldClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-last">
                Apellido
              </label>
              <input
                id="pf-last"
                className={fieldClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>
        </div>

        {profileErr ? (
          <p
            className={`mt-6 break-words ${ROUNDED_CONTROL} border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800`}
            role="alert"
          >
            {profileErr}
          </p>
        ) : null}
        {profileOk ? (
          <p
            className={`mt-6 ${ROUNDED_CONTROL} border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900`}
            role="status"
          >
            {profileOk}
          </p>
        ) : null}

        <div className="mt-8 border-t border-zinc-100 pt-6">
          <button
            type="submit"
            disabled={profileSaving}
            className={`${marketplacePrimaryBtn} min-h-11 w-full px-6 py-2.5 text-base sm:w-auto sm:text-sm`}
          >
            {profileSaving ? "Guardando…" : "Guardar datos"}
          </button>
        </div>
        </div>
      </form>

      <div
        className={`relative mt-8 overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-zinc-100/80`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent" aria-hidden />
        <div className="p-5 sm:p-6">
        <SectionTitle id="sec-password">Seguridad</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Introduce tu contraseña actual y la nueva (mínimo <span className="font-medium text-zinc-800">8</span>{" "}
          caracteres).
        </p>

        <form onSubmit={onChangePassword} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-old-pw">
              Contraseña actual
            </label>
            <input
              id="pf-old-pw"
              type="password"
              className={fieldClass}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-new-pw">
                Nueva contraseña
              </label>
              <input
                id="pf-new-pw"
                type="password"
                className={fieldClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800" htmlFor="pf-confirm-pw">
                Confirmar nueva contraseña
              </label>
              <input
                id="pf-confirm-pw"
                type="password"
                className={fieldClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </div>

          {pwdErr ? (
            <p
              className={`break-words ${ROUNDED_CONTROL} border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800`}
              role="alert"
            >
              {pwdErr}
            </p>
          ) : null}
          {pwdOk ? (
            <p
              className={`${ROUNDED_CONTROL} border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900`}
              role="status"
            >
              {pwdOk}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pwdSaving || !oldPassword || !newPassword || !confirmPassword}
            className={`${marketplacePrimaryBtn} min-h-11 w-full px-6 py-2.5 text-base sm:w-auto sm:text-sm`}
          >
            {pwdSaving ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
