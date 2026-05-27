"use client";

import { useCallback } from "react";

import { SignatureCanvasField } from "@/components/ui/SignatureCanvasField";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import { marketplacePrimaryBtn } from "@/lib/marketplaceActionButtons";

/**
 * Subida manual o firma digital de la hoja de negociación (paso 1 y reemplazo).
 *
 * @param {{
 *   idPrefix: string;
 *   signedFile: File | null;
 *   onSignedFileChange: (file: File | null) => void;
 *   signOnWeb: boolean;
 *   onSignOnWebChange: (value: boolean) => void;
 *   signatureEmpty: boolean;
 *   onSignatureEmptyChange: (empty: boolean) => void;
 *   signatureRef: import("react").RefObject<import("@/components/ui/SignatureCanvasField").SignatureCanvasHandle | null>;
 *   fileDropLabel?: string;
 *   submitDisabled?: boolean;
 *   busy?: boolean;
 *   onSubmit: () => void;
 *   submitLabel: string;
 *   busySubmitLabel: string;
 *   className?: string;
 * }} props
 */
export function NegotiationSheetSignedUpload({
  idPrefix,
  signedFile,
  onSignedFileChange,
  signOnWeb,
  onSignOnWebChange,
  signatureEmpty,
  onSignatureEmptyChange,
  signatureRef,
  fileDropLabel = "Subir hoja de negociación firmada",
  submitDisabled = false,
  busy = false,
  onSubmit,
  submitLabel,
  busySubmitLabel,
  className = "",
}) {
  const handleSignOnWebChange = useCallback(
    (checked) => {
      onSignOnWebChange(checked);
      if (checked) {
        onSignedFileChange(null);
      } else {
        signatureRef.current?.clear();
        onSignatureEmptyChange(true);
      }
    },
    [
      onSignOnWebChange,
      onSignedFileChange,
      onSignatureEmptyChange,
      signatureRef,
    ],
  );

  const canSubmit = signOnWeb ? !signatureEmpty : Boolean(signedFile);

  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-zinc-200/90 bg-zinc-50/60 px-4 py-3 ring-1 ring-zinc-100/80">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-[color:var(--mp-primary)] focus:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
          checked={signOnWeb}
          onChange={(e) => handleSignOnWebChange(e.target.checked)}
        />
        <span className="min-w-0 text-sm leading-snug text-zinc-800">
          <span className="font-semibold text-zinc-900">Firmar aquí en la web</span>
          <span className="mt-0.5 block text-zinc-600">
            Dibuja tu firma en pantalla en lugar de subir un archivo escaneado.
          </span>
        </span>
      </label>

      {signOnWeb ? (
        <div className="mt-4">
          <SignatureCanvasField
            ref={signatureRef}
            id={`${idPrefix}-signature-canvas`}
            onEmptyChange={onSignatureEmptyChange}
          />
        </div>
      ) : (
        <FileDropZoneField
          className="mt-4"
          id={`${idPrefix}-signed-file`}
          label={fileDropLabel}
          value={signedFile}
          onChange={onSignedFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego pulsa el botón de abajo."
          formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
          formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
          dropZoneAriaLabel="Zona para adjuntar la hoja de negociación firmada"
        />
      )}

      <button
        type="button"
        disabled={!canSubmit || submitDisabled || busy}
        onClick={() => onSubmit()}
        className={`${marketplacePrimaryBtn} mt-3 min-h-10 px-4 py-2 text-sm font-semibold`}
      >
        {busy ? busySubmitLabel : submitLabel}
      </button>
    </div>
  );
}
