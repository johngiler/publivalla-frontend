"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { ClientBrandsSection } from "@/components/account/ClientBrandsSection";
import { ClientMembersSection } from "@/components/account/ClientMembersSection";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { useAuth } from "@/context/AuthContext";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import { authJsonFetcher, MY_COMPANY_SWR_KEY } from "@/lib/swr/fetchers";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { saveMyCompany } from "@/services/authApi";

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

export default function CuentaView() {
  const router = useRouter();
  const { authReady, me, isAdmin, company, setCompanyData, accessToken, role } = useAuth();
  const companyFileRef = useRef(null);
  const [company_name, setCompanyName] = useState("");
  const [rif, setRif] = useState("");
  const [contact_name, setContactName] = useState("");
  const [representative_name, setRepresentativeName] = useState("");
  const [representative_id_number, setRepresentativeIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pendingClearCover, setPendingClearCover] = useState(false);
  const [error, setError] = useState("");
  const [companyLoadErr, setCompanyLoadErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const companyListKey =
    authReady && accessToken && me && !isAdmin ? MY_COMPANY_SWR_KEY : null;
  const { data: companyData, error: companySwrError, mutate: mutateMyCompany } = useSWR(
    companyListKey,
    authJsonFetcher,
    { fallbackData: company === undefined ? undefined : company },
  );

  useEffect(() => {
    if (!authReady) return;
    if (!me) {
      router.replace("/login?next=/cuenta");
      return;
    }
    if (isAdmin) {
      router.replace("/dashboard");
    }
  }, [authReady, me, isAdmin, router]);

  useEffect(() => {
    if (companySwrError) {
      setCompanyLoadErr(
        companySwrError instanceof Error ? companySwrError.message : String(companySwrError),
      );
      return;
    }
    setCompanyLoadErr("");
    if (companyData === undefined) return;
    if (companyData && typeof companyData === "object") {
      setCompanyName(companyData.company_name || "");
      setRif(companyData.rif || "");
      setContactName(companyData.contact_name || "");
      setRepresentativeName(companyData.representative_name || "");
      setRepresentativeIdNumber(companyData.representative_id_number || "");
      setEmail(companyData.email || "");
      setPhone(companyData.phone || "");
      setAddress(companyData.address || "");
      setCity(companyData.city || "");
      setCoverFile(null);
      setFilePreview(null);
      setPendingClearCover(false);
      if (companyFileRef.current) companyFileRef.current.value = "";
    } else {
      setCompanyName("");
      setRif("");
      setContactName("");
      setRepresentativeName("");
      setRepresentativeIdNumber("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCity("");
      setCoverFile(null);
      setFilePreview(null);
      setPendingClearCover(false);
      if (companyFileRef.current) companyFileRef.current.value = "";
    }
  }, [companyData, companySwrError]);

  useEffect(() => {
    if (!coverFile) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  if (!authReady || !me || isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-zinc-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:var(--mp-primary)]" />
        <p className="mt-4 text-sm">Cargando…</p>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!rif.trim()) {
      setError("Indica el RIF de la empresa.");
      return;
    }
    if (!representative_name.trim()) {
      setError("Indica el nombre del representante legal.");
      return;
    }
    if (!representative_id_number.trim()) {
      setError("Indica la cédula del representante legal.");
      return;
    }
    setSaving(true);
    try {
      const hasProfile = companyData && typeof companyData === "object";
      const useMultipart = coverFile != null || pendingClearCover;
      let data;
      if (useMultipart) {
        const fd = new FormData();
        fd.append("company_name", company_name.trim());
        fd.append("rif", rif.trim());
        fd.append("contact_name", contact_name.trim());
        fd.append("representative_name", representative_name.trim());
        fd.append("representative_id_number", representative_id_number.trim());
        fd.append("email", email.trim());
        fd.append("phone", phone.trim());
        fd.append("address", address.trim());
        fd.append("city", city.trim());
        if (coverFile) fd.append("cover_image", coverFile);
        if (pendingClearCover) fd.append("remove_company_cover", "true");
        data = await saveMyCompany(fd, {
          method: hasProfile ? "PATCH" : "POST",
          token: accessToken,
        });
      } else {
        const payload = {
          company_name: company_name.trim(),
          rif: rif.trim(),
          contact_name: contact_name.trim(),
          representative_name: representative_name.trim(),
          representative_id_number: representative_id_number.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
        };
        data = await saveMyCompany(payload, {
          method: hasProfile ? "PATCH" : "POST",
          token: accessToken,
        });
      }
      setCompanyData(data);
      await mutateMyCompany(data, { revalidate: false });
      setCoverFile(null);
      setPendingClearCover(false);
      setFilePreview(null);
      if (companyFileRef.current) companyFileRef.current.value = "";
      setOk(
        hasProfile
          ? "Datos actualizados correctamente."
          : "Empresa registrada. Ya puedes usar el checkout.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const hasProfile = companyData && typeof companyData === "object";
  const profileRoleBadge = marketplaceRoleLabel(role);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-5 py-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:px-6 sm:py-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent" aria-hidden />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Mi empresa
          </h1>
          {profileRoleBadge ? (
            <span className={roleBadgeClass} aria-label={`Rol: ${profileRoleBadge}`}>
              {profileRoleBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
          Datos de contacto y facturación de tu empresa en el marketplace.
        </p>
      </div>

      <div
        className={`mt-8 ${ROUNDED_CONTROL} border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/40 px-4 py-3 text-sm text-amber-950 shadow-sm ring-1 ring-amber-100/60`}
      >
        <span className="font-semibold">Importante:</span> estos datos identifican a tu empresa en pedidos y facturación.
        Revísalos antes de confirmar reservas.
      </div>

      <form
        id="empresa"
        onSubmit={onSubmit}
        className={`relative mt-8 overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-zinc-100/80`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] mp-admin-filters-top-accent" aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="space-y-8">
          <section aria-labelledby="sec-empresa">
            <SectionTitle id="sec-empresa">Empresa</SectionTitle>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 sm:p-5">
                <CoverImageField
                  readOnly={false}
                  variant="avatar"
                  label="Logo o foto de la empresa"
                  existingUrl={pendingClearCover ? "" : companyData?.cover_image}
                  filePreviewUrl={filePreview}
                  onFileChange={(f) => {
                    setCoverFile(f);
                    setPendingClearCover(false);
                  }}
                  onClearExisting={() => {
                    setPendingClearCover(true);
                    setCoverFile(null);
                    if (companyFileRef.current) companyFileRef.current.value = "";
                  }}
                  fileInputRef={companyFileRef}
                />
              </div>
              <div>
                <label htmlFor="cuenta-razon" className="block text-sm font-medium text-zinc-800">
                  Razón social <span className="text-red-600">*</span>
                </label>
                <input
                  id="cuenta-razon"
                  required
                  autoComplete="organization"
                  className={fieldClass}
                  value={company_name}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="sm:max-w-md">
                <label htmlFor="cuenta-rif" className="block text-sm font-medium text-zinc-800">
                  RIF <span className="text-red-600">*</span>
                </label>
                <input
                  id="cuenta-rif"
                  required
                  className={`mt-1.5 ${fieldClass}`}
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  placeholder="Ej. J-12345678-9"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="cuenta-rep" className="block text-sm font-medium text-zinc-800">
                  Representante legal <span className="text-red-600">*</span>
                </label>
                <input
                  id="cuenta-rep"
                  required
                  autoComplete="name"
                  className={fieldClass}
                  value={representative_name}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                />
              </div>
              <div className="sm:max-w-md">
                <label htmlFor="cuenta-rep-ci" className="block text-sm font-medium text-zinc-800">
                  Cédula del representante <span className="text-red-600">*</span>
                </label>
                <input
                  id="cuenta-rep-ci"
                  required
                  className={`mt-1.5 ${fieldClass}`}
                  value={representative_id_number}
                  onChange={(e) => setRepresentativeIdNumber(e.target.value)}
                  placeholder="Ej. V-12345678"
                  autoComplete="off"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-contacto">
            <SectionTitle id="sec-contacto">Contacto</SectionTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="cuenta-contacto" className="block text-sm font-medium text-zinc-800">
                  Persona de contacto
                </label>
                <input
                  id="cuenta-contacto"
                  autoComplete="name"
                  className={fieldClass}
                  value={contact_name}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cuenta-email" className="block text-sm font-medium text-zinc-800">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="cuenta-email"
                  required
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cuenta-tel" className="block text-sm font-medium text-zinc-800">
                  Teléfono
                </label>
                <input
                  id="cuenta-tel"
                  type="tel"
                  autoComplete="tel"
                  className={fieldClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-ubicacion">
            <SectionTitle id="sec-ubicacion">Ubicación</SectionTitle>
            <div className="mt-4 space-y-4">
              <div className="sm:max-w-md">
                <label htmlFor="cuenta-ciudad" className="block text-sm font-medium text-zinc-800">
                  Ciudad
                </label>
                <input
                  id="cuenta-ciudad"
                  autoComplete="address-level2"
                  className={fieldClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cuenta-dir" className="block text-sm font-medium text-zinc-800">
                  Dirección
                </label>
                <textarea
                  id="cuenta-dir"
                  autoComplete="street-address"
                  className={`${fieldClass} min-h-[5rem] resize-y py-3 sm:min-h-0`}
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-marcas">
            <SectionTitle id="sec-marcas">Marcas</SectionTitle>
            <p className="mt-2 text-sm text-zinc-600">
              Marcas que tu empresa promociona en el marketplace (nombre y logo).
            </p>
            <ClientBrandsSection
              brands={Array.isArray(companyData?.brands) ? companyData.brands : []}
              hasProfile={hasProfile}
              accessToken={accessToken}
              onBrandsChange={(nextBrands) => {
                mutateMyCompany(
                  (prev) => {
                    if (!prev || typeof prev !== "object") return prev;
                    const next = { ...prev, brands: nextBrands };
                    setCompanyData(next);
                    return next;
                  },
                  { revalidate: false },
                );
              }}
            />
          </section>

          <section aria-labelledby="sec-usuarios">
            <SectionTitle id="sec-usuarios">Usuarios</SectionTitle>
            <p className="mt-2 text-sm text-zinc-600">
              Personas de tu empresa con acceso al marketplace. Cada una puede trabajar con una o
              varias marcas.
            </p>
            <ClientMembersSection
              brands={Array.isArray(companyData?.brands) ? companyData.brands : []}
              hasProfile={hasProfile}
              accessToken={accessToken}
            />
          </section>
          </div>

        {companyLoadErr ? (
          <p
            className={`mt-6 break-words ${ROUNDED_CONTROL} border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800`}
            role="alert"
          >
            {companyLoadErr}
          </p>
        ) : null}
        {error ? (
          <p
            className={`mt-6 break-words ${ROUNDED_CONTROL} border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800`}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {ok ? (
          <p
            className={`mt-6 ${ROUNDED_CONTROL} border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900`}
            role="status"
          >
            {ok}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`${marketplacePrimaryBtn} min-h-11 px-5 py-2.5 text-sm font-semibold disabled:opacity-60`}
          >
            {saving ? "Guardando…" : hasProfile ? "Guardar cambios" : "Registrar empresa"}
          </button>
        </div>
      </div>
      </form>
    </div>
  );
}
