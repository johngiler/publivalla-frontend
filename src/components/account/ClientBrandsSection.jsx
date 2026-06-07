"use client";

import { useCallback, useId, useState } from "react";

import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";
import {
  squareAdminTablePortadaFrameClass,
  squareAdminTablePortadaImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import {
  createMyCompanyBrand,
  deleteMyCompanyBrand,
  mediaAbsoluteUrl,
  updateMyCompanyBrand,
} from "@/services/authApi";

const fieldClass = `mp-form-field-accent min-h-9 w-full ${ROUNDED_CONTROL} border border-zinc-200/80 bg-zinc-50/50 px-3 py-1.5 text-sm text-zinc-900 shadow-sm transition-[border-color,background-color] duration-200 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:outline-none`;

const rowCardClass = `rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-sm sm:p-3`;

const actionBtnClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-zinc-200/90 bg-white text-zinc-500 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)] disabled:opacity-50";

const BRAND_LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const BRAND_LOGO_MAX_BYTES = 10 * 1024 * 1024;
const BRAND_LOGO_FORMATS_HINT = "JPG, PNG, WebP o GIF · máximo 10 MB";
const BRAND_LOGO_FORMATS_HINT_COMPACT = "JPG, PNG, WebP o GIF";

const compactDropClass =
  "[&_[role=region]]:p-2.5 sm:[&_[role=region]]:p-3 [&_[role=region]>div]:gap-2.5 [&_[role=region]_div]:!flex-row [&_[role=region]_div]:!items-center [&_[role=region]_h-12]:!h-9 [&_[role=region]_w-12]:!w-9 [&_[role=region]_svg]:!h-5 [&_[role=region]_svg]:!w-5 [&_[role=region]_p]:!text-xs [&_[role=region]_p]:!font-medium";

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

function UploadIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3M17 8l-5-5-5 5M12 3v12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandLogoDropField({
  fieldId,
  label,
  disabled,
  onFile,
  compact = false,
  value = null,
  onChange,
}) {
  const isControlled = typeof onChange === "function";
  return (
    <FileDropZoneField
      id={fieldId}
      showLabel={false}
      ariaLabel={label}
      value={isControlled ? value : null}
      onChange={(file) => {
        if (isControlled) {
          onChange(file);
        } else if (file) {
          onFile?.(file);
        }
      }}
      accept={BRAND_LOGO_ACCEPT}
      maxBytes={BRAND_LOGO_MAX_BYTES}
      formatsHint={compact ? BRAND_LOGO_FORMATS_HINT_COMPACT : BRAND_LOGO_FORMATS_HINT}
      formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o GIF."
      maxBytesErrorMessage="La imagen no puede superar 10 MB. Elige otro archivo."
      showInlinePreview={isControlled ? Boolean(value) : !compact}
      dropZoneAriaLabel={`Zona para adjuntar: ${label}`}
      className={[compact ? compactDropClass : "", disabled ? "pointer-events-none opacity-50" : ""]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

function BrandLogoChangeButton({ fieldId, label, disabled, onFile }) {
  return (
    <div className="relative">
      <div className="sr-only" aria-hidden>
        <BrandLogoDropField fieldId={fieldId} label={label} disabled={disabled} onFile={onFile} />
      </div>
      <label
        htmlFor={fieldId}
        className={`${actionBtnClass} mp-text-brand cursor-pointer hover:border-[color-mix(in_srgb,var(--mp-primary)_30%,#e4e4e7)] hover:bg-[color-mix(in_srgb,var(--mp-primary)_6%,#fff)] ${disabled ? "pointer-events-none opacity-50" : ""}`}
        title="Cambiar logo"
      >
        <UploadIcon />
        <span className="sr-only">{label}</span>
      </label>
    </div>
  );
}

function BrandLogoPreview({ url, alt, onOpen }) {
  if (!url) {
    return (
      <div
        className={`${squareAdminTablePortadaFrameClass} flex items-center justify-center bg-zinc-100/80 text-[9px] font-semibold uppercase tracking-wide text-zinc-400`}
      >
        Logo
      </div>
    );
  }
  const frame = (
    <div className={squareAdminTablePortadaFrameClass}>
      <RasterFromApiUrl
        url={url}
        alt={alt}
        className={squareAdminTablePortadaImgClass}
        {...catalogRasterImgAttrs}
      />
    </div>
  );
  if (!onOpen) return frame;
  return (
    <button
      type="button"
      className="shrink-0 cursor-zoom-in rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
      aria-label={`Ver logo de ${alt}`}
      onClick={onOpen}
    >
      {frame}
    </button>
  );
}

/**
 * @param {{
 *   brands: Array<{ id: number; name: string; logo?: string | null }>;
 *   hasProfile: boolean;
 *   accessToken: string | null;
 *   onBrandsChange: (brands: Array<{ id: number; name: string; logo?: string | null }>) => void;
 * }} props
 */
export function ClientBrandsSection({ brands, hasProfile, accessToken, onBrandsChange }) {
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftFile, setDraftFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const draftLogoFieldId = useId();

  const lightboxItems = brands
    .filter((b) => b.logo)
    .map((b) => ({
      src: mediaAbsoluteUrl(b.logo),
      alt: b.name,
    }));

  const updateBrandInList = useCallback(
    (updated) => {
      onBrandsChange(
        brands.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)),
      );
    },
    [brands, onBrandsChange],
  );

  const removeBrandFromList = useCallback(
    (id) => {
      onBrandsChange(brands.filter((b) => b.id !== id));
    },
    [brands, onBrandsChange],
  );

  const appendBrand = useCallback(
    (brand) => {
      onBrandsChange([...brands, brand].sort((a, b) => a.name.localeCompare(b.name)));
    },
    [brands, onBrandsChange],
  );

  async function saveDraft() {
    setErr("");
    const name = draftName.trim();
    if (!name) {
      setErr("Indica el nombre de la marca.");
      return;
    }
    setBusyId("draft");
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (draftFile) fd.append("logo", draftFile);
      const created = await createMyCompanyBrand(fd, { token: accessToken });
      appendBrand(created);
      setDraftOpen(false);
      setDraftName("");
      setDraftFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo agregar la marca.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveBrandName(brand, name) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === brand.name) return;
    setBusyId(brand.id);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("name", trimmed);
      const updated = await updateMyCompanyBrand(brand.id, fd, { token: accessToken });
      updateBrandInList(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar la marca.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveBrandLogo(brand, file) {
    if (!file) return;
    setBusyId(brand.id);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const updated = await updateMyCompanyBrand(brand.id, fd, { token: accessToken });
      updateBrandInList(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo actualizar el logo.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const brand = deleteTarget;
    if (!brand) return;
    setBusyId(brand.id);
    setErr("");
    try {
      await deleteMyCompanyBrand(brand.id, { token: accessToken });
      removeBrandFromList(brand.id);
      setDeleteTarget(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo eliminar la marca.");
      throw e;
    } finally {
      setBusyId(null);
    }
  }

  if (!hasProfile) {
    return (
      <p className="mt-4 text-sm text-zinc-600">
        Registra primero los datos de tu empresa para poder agregar marcas.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <ul className="space-y-2">
        {brands.map((brand) => {
          const hasLogo = Boolean(brand.logo);
          const logoUrl = hasLogo ? mediaAbsoluteUrl(brand.logo) : "";
          const isBusy = busyId === brand.id;

          return (
            <li key={brand.id} className={rowCardClass}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                {hasLogo ? (
                  <BrandLogoPreview
                    url={logoUrl}
                    alt={brand.name}
                    onOpen={() => {
                      const idx = lightboxItems.findIndex((item) => item.alt === brand.name);
                      setLightbox({ open: true, index: idx >= 0 ? idx : 0 });
                    }}
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <label className="sr-only" htmlFor={`brand-name-${brand.id}`}>
                    Nombre de {brand.name}
                  </label>
                  <input
                    id={`brand-name-${brand.id}`}
                    type="text"
                    className={fieldClass}
                    defaultValue={brand.name}
                    disabled={isBusy}
                    onBlur={(e) => void saveBrandName(brand, e.target.value)}
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {hasLogo ? (
                    <BrandLogoChangeButton
                      fieldId={`brand-logo-change-${brand.id}`}
                      label={`Cambiar logo de ${brand.name}`}
                      disabled={isBusy}
                      onFile={(file) => void saveBrandLogo(brand, file)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className={`${actionBtnClass} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
                    aria-label={`Eliminar ${brand.name}`}
                    disabled={isBusy}
                    onClick={() => setDeleteTarget(brand)}
                  >
                    <IconRowTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!hasLogo ? (
                <div className="mt-2">
                  <BrandLogoDropField
                    fieldId={`brand-logo-${brand.id}`}
                    label={`Logo de ${brand.name}`}
                    disabled={isBusy}
                    compact
                    onFile={(file) => void saveBrandLogo(brand, file)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}

        {draftOpen ? (
          <li className={`${rowCardClass} border-dashed`}>
            <div className="space-y-2.5">
              <input
                type="text"
                className={fieldClass}
                placeholder="Nombre de la marca"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={busyId === "draft"}
              />
              <BrandLogoDropField
                fieldId={draftLogoFieldId}
                label="Logo de la marca"
                disabled={busyId === "draft"}
                compact
                value={draftFile}
                onChange={setDraftFile}
              />
              <div className="flex flex-wrap gap-2 pt-0.5">
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
                    setDraftName("");
                    setDraftFile(null);
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
            Agregar marca
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

      <ImageLightbox
        open={lightbox.open}
        onClose={() => setLightbox((st) => ({ ...st, open: false }))}
        items={lightboxItems}
        initialIndex={lightbox.index}
        showDownload={false}
        ariaLabel="Logos de marcas"
      />

      <CustomAlert
        open={Boolean(deleteTarget)}
        title="Eliminar marca"
        destructive
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        ¿Eliminar la marca «{deleteTarget?.name ?? ""}»? Esta acción no se puede deshacer.
      </CustomAlert>
    </div>
  );
}
