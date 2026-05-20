"use client";

import { AdminSelect } from "@/components/admin/AdminSelect";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import {
  marketplacePrimaryBtn,
  marketplaceSecondaryBtn,
} from "@/lib/marketplaceActionButtons";
import { artUploadGroupSelectLabel } from "@/lib/orderArtLineGroups";

/**
 * Selector de toma por código EP (líneas con el mismo código fusionadas).
 *
 * @param {{
 *   groups: Array<Record<string, unknown>>;
 *   value: number | null;
 *   onChange: (id: number) => void;
 *   idSuffix: string | number;
 *   labelClass: string;
 * }} props
 */
export function ArtSpaceCodePicker({
  groups,
  value,
  onChange,
  idSuffix,
  labelClass,
}) {
  if (!groups || groups.length <= 1) return null;
  const selectId = `art-space-select-${idSuffix}`;
  const options = groups
    .map((g) => {
      const pk = g.orderItemPk;
      if (pk == null) return null;
      return { v: pk, l: artUploadGroupSelectLabel(g) };
    })
    .filter(Boolean);

  return (
    <div className="min-w-0 space-y-2">
      <label className={labelClass} htmlFor={selectId}>
        Toma a la que aplica este archivo
      </label>
      <AdminSelect
        id={selectId}
        options={options}
        value={value}
        onChange={(v) => {
          const n = typeof v === "number" ? v : Number(v);
          if (Number.isFinite(n) && n > 0) onChange(n);
        }}
        placeholder="Selecciona la toma…"
        aria-label="Toma a la que aplica este archivo"
        className="mt-1"
        isSearchable={options.length > 6}
      />
      <p className="text-xs leading-snug text-zinc-500">
        Elige la línea del pedido a la que corresponden estos archivos. Cada fila aparece por
        separado, aunque comparta el mismo código.
      </p>
    </div>
  );
}

/**
 * Zona de subida de artes (inline o dentro del modal).
 *
 * @param {{
 *   groups: Array<Record<string, unknown>>;
 *   needsTomaChoice: boolean;
 *   artOrderItemId: number | null;
 *   onArtOrderItemIdChange: (id: number) => void;
 *   artFiles: File[];
 *   onArtFilesChange: (files: File[]) => void;
 *   idSuffix: string | number;
 *   labelClass: string;
 *   busy: string;
 *   onUpload: () => void;
 *   actionMode?: "stage" | "upload"; // stage = añadir al paso 2; upload = enviar al servidor
 *   onCancel?: () => void;
 *   showCancel?: boolean;
 *   dropZoneClassName?: string;
 * }} props
 */
export function OrderArtUploadFields({
  groups,
  needsTomaChoice,
  artOrderItemId,
  onArtOrderItemIdChange,
  artFiles,
  onArtFilesChange,
  idSuffix,
  labelClass,
  busy,
  onUpload,
  actionMode = "upload",
  onCancel,
  showCancel = false,
  dropZoneClassName = "mt-4",
}) {
  const isStage = actionMode === "stage";
  const uploadDisabled =
    artFiles.length === 0 ||
    busy === "art" ||
    (needsTomaChoice && artOrderItemId == null);

  return (
    <div className="space-y-4">
      {needsTomaChoice ? (
        <ArtSpaceCodePicker
          groups={groups}
          value={artOrderItemId}
          onChange={onArtOrderItemIdChange}
          idSuffix={idSuffix}
          labelClass={labelClass}
        />
      ) : null}
      <FileDropZoneField
        className={needsTomaChoice ? "" : dropZoneClassName}
        id={`art-upload-${idSuffix}`}
        multiple
        label="Subir artes"
        value={artFiles}
        onChange={onArtFilesChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        helperText={
          isStage
            ? "Puedes elegir varios archivos a la vez. Luego pulsa «Añadir»; se mostrarán en el paso 2 y podrás subirlos cuando termines."
            : "Puedes elegir varios archivos a la vez. Luego pulsa «Subir archivos»."
        }
        formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB por archivo"
        formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
        dropZoneAriaLabel="Zona para adjuntar artes del anuncio"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploadDisabled}
          onClick={() => onUpload()}
          className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
        >
          {busy === "art"
            ? isStage
              ? "Añadiendo…"
              : "Subiendo…"
            : isStage
              ? artFiles.length > 1
                ? `Añadir ${artFiles.length} archivos`
                : "Añadir"
              : artFiles.length > 1
                ? `Subir ${artFiles.length} archivos`
                : "Subir archivo"}
        </button>
        {showCancel && onCancel ? (
          <button
            type="button"
            disabled={busy === "art"}
            onClick={() => onCancel()}
            className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
