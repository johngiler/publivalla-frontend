"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { PdfPreview } from "@/components/media/PdfPreview";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { squareListImagePreviewButtonRingClass } from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** @param {File} file */
function fileIsImage(file) {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

/** @param {File} file */
function fileIsPdf(file) {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

/** @param {File} file @param {string} accept */
function fileMatchesAccept(file, accept) {
  const tokens = accept
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  for (const t of tokens) {
    if (t.startsWith(".")) {
      if (file.name.toLowerCase().endsWith(t.toLowerCase())) return true;
    } else if (t.endsWith("/*")) {
      const prefix = t.slice(0, -1);
      if (file.type && file.type.startsWith(prefix)) return true;
    } else if (file.type === t) {
      return true;
    }
  }
  return false;
}

function UploadIcon({ className }) {
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

function FileStackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12h6m-6 4h4M9 8h6m2-2.5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h5l3 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Zona de arrastrar y soltar + selector de archivo(s), con vista previa opcional en modo simple.
 * @param {{
 *   id: string;
 *   label?: string;
 *   multiple?: boolean;
 *   value: File | null | File[];
 *   onChange: (file: File | null | File[]) => void;
 *   accept?: string;
 *   helperText?: string;
 *   maxBytes?: number;
 *   maxBytesErrorMessage?: string;
 *   formatErrorMessage?: string;
 *   formatsHint?: string;
 *   showInlinePreview?: boolean;
 *   dropZoneAriaLabel?: string;
 *   className?: string;
 *   showLabel?: boolean;
 *   ariaLabel?: string;
 * }} props
 * ariaLabel: si showLabel es false, texto accesible del input de archivo.
 */
export function FileDropZoneField(props) {
  if (props.multiple) {
    return <FileDropZoneMultiField {...props} />;
  }
  return <FileDropZoneSingleField {...props} />;
}

const filePreviewTileFrameClass =
  "relative h-[150px] w-[150px] shrink-0 overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm";

const filePreviewRemoveBtnClass =
  "absolute right-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-md border border-zinc-200/90 bg-white/95 text-red-700 shadow-sm transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80";

/** @param {File} file */
function filePdfPreviewLoadKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Vista previa PDF compacta (rellena el contenedor padre).
 * @param {{ file: File; previewUrl: string; className?: string }} props
 */
function FilePdfPreviewCompact({ file, previewUrl, className = "" }) {
  return (
    <PdfPreview
      compact
      hideTitle
      fillParentCell
      title={file.name}
      downloadFileName={file.name}
      directUrl={previewUrl}
      loadKey={filePdfPreviewLoadKey(file)}
      className={`h-full min-h-0 w-full border-0 shadow-none ${className}`.trim()}
      previewMinHeightClass="min-h-0"
    />
  );
}

/**
 * Miniatura 150×150: quitar encima; imagen abre visor si `onImageClick`.
 * @param {{
 *   file: File;
 *   previewUrl: string | null;
 *   onRemove: () => void;
 *   onImageClick?: () => void;
 * }} props
 */
function FilePreviewTile({ file, previewUrl, onRemove, onImageClick }) {
  const isImage = fileIsImage(file);
  const isPdf = fileIsPdf(file);

  return (
    <div className="w-[150px] shrink-0">
      <div className={filePreviewTileFrameClass}>
        <button
          type="button"
          onClick={onRemove}
          className={filePreviewRemoveBtnClass}
          aria-label={`Quitar ${file.name}`}
          title="Quitar"
        >
          <IconRowTrash className="!h-3.5 !w-3.5 shrink-0 text-red-600" />
        </button>
        {previewUrl && isImage ? (
          <button
            type="button"
            onClick={onImageClick}
            className={`absolute inset-0 cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 ${squareListImagePreviewButtonRingClass}`}
            aria-label={`Ver imagen ampliada: ${file.name}`}
          >
            <img
              src={previewUrl}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
              {...catalogRasterImgAttrs}
            />
          </button>
        ) : previewUrl && isPdf ? (
          <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden">
            <FilePdfPreviewCompact file={file} previewUrl={previewUrl} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-1.5 text-center">
            <FileStackIcon className="h-5 w-5 text-zinc-500" />
          </div>
        )}
      </div>
      <p
        className="mt-1 max-w-[150px] truncate text-[10px] font-medium text-zinc-500"
        title={`${file.name} · ${formatFileSize(file.size)}`}
      >
        {file.name}
      </p>
    </div>
  );
}

/** Envuelve {@link FilePreviewTile} para listas `<ul>`. */
function MultiFilePreviewTile(props) {
  return (
    <li className="list-none">
      <FilePreviewTile {...props} />
    </li>
  );
}

function FileDropZoneSingleField({
  id,
  label = "Archivo",
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  helperText = "",
  maxBytes = DEFAULT_MAX_BYTES,
  maxBytesErrorMessage = "El archivo no puede superar 5 MB. Elige otro archivo.",
  formatErrorMessage = "Formato no permitido. Revisa los tipos aceptados.",
  formatsHint = "JPG, PNG, WebP o PDF · máximo 5 MB",
  showInlinePreview = true,
  dropZoneAriaLabel = "Zona para adjuntar archivo",
  className = "",
  showLabel = true,
  ariaLabel,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(/** @type {string | null} */ (null));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const helperId = useId();
  const errorId = useId();

  const imageLightboxItems = useMemo(() => {
    if (!value || !previewUrl || !fileIsImage(value)) return [];
    return [
      {
        src: previewUrl,
        alt: value.name,
        downloadFileName: value.name,
      },
    ];
  }, [value, previewUrl]);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const assignFile = useCallback(
    (file) => {
      if (!file) {
        setSizeError("");
        onChange(null);
        return;
      }
      if (!fileMatchesAccept(file, accept)) {
        setSizeError(formatErrorMessage);
        return;
      }
      if (file.size > maxBytes) {
        setSizeError(maxBytesErrorMessage);
        return;
      }
      setSizeError("");
      onChange(file);
    },
    [accept, formatErrorMessage, maxBytes, maxBytesErrorMessage, onChange],
  );

  const clear = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    setSizeError("");
    onChange(null);
  }, [onChange]);

  const onInputChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    assignFile(f);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    assignFile(f);
  };

  const openPicker = () => inputRef.current?.click();

  const zoneBase = `${ROUNDED_CONTROL} border-2 border-dashed transition-[border-color,background-color,box-shadow] duration-200 ease-out`;
  const zoneIdle =
    "border-zinc-200 bg-zinc-50/60 hover:border-[color-mix(in_srgb,var(--mp-primary)_35%,#d4d4d8)] hover:bg-[color-mix(in_srgb,var(--mp-primary)_6%,#fafafa)]";
  const zoneDrag =
    "border-[color-mix(in_srgb,var(--mp-primary)_55%,#a1a1aa)] bg-[color-mix(in_srgb,var(--mp-primary)_10%,#fff)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--mp-primary)_18%,transparent)]";
  const zoneFile = "border-[color-mix(in_srgb,var(--mp-primary)_28%,#e4e4e7)] bg-white";

  const rootClass = [className.trim(), "space-y-2"].filter(Boolean).join(" ");

  const inputAriaLabel = showLabel ? undefined : ariaLabel ?? label;

  return (
    <div className={rootClass}>
      {showLabel ? (
        <label className={labelClass} htmlFor={id}>
          {label}
        </label>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onInputChange}
        aria-label={inputAriaLabel}
        aria-describedby={[helperText ? helperId : null, sizeError ? errorId : null].filter(Boolean).join(" ") || undefined}
      />

      <div
        role="region"
        aria-label={dropZoneAriaLabel}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`${zoneBase} ${value ? zoneFile : isDragging ? zoneDrag : zoneIdle} p-4 sm:p-5`}
      >
        {!value ? (
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left sm:gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center ${ROUNDED_CONTROL} bg-[color-mix(in_srgb,var(--mp-primary)_14%,#fff)] mp-text-brand`}
            >
              <UploadIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-zinc-900">
                Arrastra el archivo aquí o{" "}
                <button
                  type="button"
                  onClick={openPicker}
                  className="mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_80%,transparent)]"
                >
                  elige un archivo
                </button>
              </p>
              <p className="text-xs text-zinc-500">{formatsHint}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {showInlinePreview && previewUrl && fileIsPdf(value) ? (
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={clear}
                  className={filePreviewRemoveBtnClass}
                  aria-label={`Quitar ${value.name}`}
                  title="Quitar"
                >
                  <IconRowTrash className="!h-3.5 !w-3.5 shrink-0 text-red-600" />
                </button>
                <PdfPreview
                  compact
                  hideTitle
                  embedHideSidebar
                  title={value.name}
                  downloadFileName={value.name}
                  directUrl={previewUrl}
                  loadKey={filePdfPreviewLoadKey(value)}
                  className="w-full"
                  previewMinHeightClass="min-h-[220px] h-[min(42vh,360px)]"
                />
                <p
                  className="mt-1 truncate text-[10px] font-medium text-zinc-500"
                  title={`${value.name} · ${formatFileSize(value.size)}`}
                >
                  {value.name}
                </p>
              </div>
            ) : showInlinePreview && previewUrl ? (
              <FilePreviewTile
                file={value}
                previewUrl={previewUrl}
                onRemove={clear}
                onImageClick={
                  fileIsImage(value) ? () => setLightboxOpen(true) : undefined
                }
              />
            ) : (
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center ${ROUNDED_CONTROL} bg-[color-mix(in_srgb,var(--mp-primary)_12%,#fff)] mp-text-brand`}
                  aria-hidden
                >
                  <FileStackIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900" title={value.name}>
                    {value.name}
                  </p>
                  <p className="text-xs text-zinc-500">{formatFileSize(value.size)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {sizeError ? (
        <p id={errorId} className={`text-xs font-medium text-red-700 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2`} role="alert">
          {sizeError}
        </p>
      ) : null}

      {helperText ? (
        <p id={helperId} className="text-xs leading-relaxed text-zinc-500">
          {helperText}
        </p>
      ) : null}

      <ImageLightbox
        open={lightboxOpen && imageLightboxItems.length > 0}
        onClose={() => setLightboxOpen(false)}
        items={imageLightboxItems}
        initialIndex={0}
        showThumbnails={false}
        showDownload
        ariaLabel="Vista previa del archivo seleccionado"
      />
    </div>
  );
}

/**
 * Variante multiarchivo (misma API de estilos que el modo simple).
 * @param {Parameters<typeof FileDropZoneField>[0]} props
 */
function FileDropZoneMultiField({
  id,
  label = "Archivos",
  value,
  onChange,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  helperText = "",
  maxBytes = DEFAULT_MAX_BYTES,
  maxBytesErrorMessage = "Cada archivo no puede superar 5 MB. Elige otros archivos.",
  formatErrorMessage = "Formato no permitido. Revisa los tipos aceptados.",
  formatsHint = "JPG, PNG, WebP o PDF · máximo 5 MB por archivo",
  dropZoneAriaLabel = "Zona para adjuntar archivos",
  className = "",
  showLabel = true,
  ariaLabel,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const [previewUrls, setPreviewUrls] = useState(/** @type {string[]} */ ([]));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const helperId = useId();
  const errorId = useId();
  const files = Array.isArray(value) ? value : [];

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const imageLightboxItems = useMemo(
    () =>
      files
        .map((file, index) => ({ file, index, url: previewUrls[index] ?? "" }))
        .filter(({ file, url }) => fileIsImage(file) && url)
        .map(({ file, url }) => ({
          src: url,
          alt: file.name,
          downloadFileName: file.name,
        })),
    [files, previewUrls],
  );

  const openImageLightbox = useCallback(
    (fileIndex) => {
      let imageIdx = 0;
      for (let i = 0; i < fileIndex; i += 1) {
        if (fileIsImage(files[i])) imageIdx += 1;
      }
      setLightboxIndex(imageIdx);
      setLightboxOpen(true);
    },
    [files],
  );

  const addFiles = useCallback(
    (incoming) => {
      const list = Array.from(incoming || []);
      if (list.length === 0) return;
      const accepted = [];
      let err = "";
      for (const file of list) {
        if (!fileMatchesAccept(file, accept)) {
          err = err || formatErrorMessage;
          continue;
        }
        if (file.size > maxBytes) {
          err = err || maxBytesErrorMessage;
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length > 0) {
        setSizeError("");
        onChange([...files, ...accepted]);
      } else if (err) {
        setSizeError(err);
      }
    },
    [
      accept,
      files,
      formatErrorMessage,
      maxBytes,
      maxBytesErrorMessage,
      onChange,
    ],
  );

  const removeAt = useCallback(
    (index) => {
      onChange(files.filter((_, i) => i !== index));
      setSizeError("");
    },
    [files, onChange],
  );

  const clearAll = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    setSizeError("");
    onChange([]);
  }, [onChange]);

  const onInputChange = (e) => {
    addFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const openPicker = () => inputRef.current?.click();

  const zoneBase = `${ROUNDED_CONTROL} border-2 border-dashed transition-[border-color,background-color,box-shadow] duration-200 ease-out`;
  const zoneIdle =
    "border-zinc-200 bg-zinc-50/60 hover:border-[color-mix(in_srgb,var(--mp-primary)_35%,#d4d4d8)] hover:bg-[color-mix(in_srgb,var(--mp-primary)_6%,#fafafa)]";
  const zoneDrag =
    "border-[color-mix(in_srgb,var(--mp-primary)_55%,#a1a1aa)] bg-[color-mix(in_srgb,var(--mp-primary)_10%,#fff)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--mp-primary)_18%,transparent)]";
  const zoneFile = "border-[color-mix(in_srgb,var(--mp-primary)_28%,#e4e4e7)] bg-white";

  const rootClass = [className.trim(), "space-y-2"].filter(Boolean).join(" ");
  const inputAriaLabel = showLabel ? undefined : ariaLabel ?? label;

  return (
    <div className={rootClass}>
      {showLabel ? (
        <label className={labelClass} htmlFor={id}>
          {label}
        </label>
      ) : null}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={onInputChange}
        aria-label={inputAriaLabel}
        aria-describedby={[helperText ? helperId : null, sizeError ? errorId : null]
          .filter(Boolean)
          .join(" ") || undefined}
      />

      {files.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={clearAll}
              className={`${ROUNDED_CONTROL} border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80 sm:text-sm`}
            >
              Quitar todos
            </button>
          </div>
          <ul className="flex flex-wrap gap-3" aria-label="Archivos seleccionados">
            {files.map((file, index) => (
              <MultiFilePreviewTile
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                file={file}
                previewUrl={previewUrls[index] ?? null}
                onRemove={() => removeAt(index)}
                onImageClick={
                  fileIsImage(file) ? () => openImageLightbox(index) : undefined
                }
              />
            ))}
          </ul>
        </div>
      ) : null}

      <div
        role="region"
        aria-label={dropZoneAriaLabel}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`${zoneBase} ${files.length > 0 ? zoneFile : isDragging ? zoneDrag : zoneIdle} p-4 sm:p-5`}
      >
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left sm:gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center ${ROUNDED_CONTROL} bg-[color-mix(in_srgb,var(--mp-primary)_14%,#fff)] mp-text-brand`}
          >
            <UploadIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-zinc-900">
              {files.length > 0 ? "Añade más archivos: arrastra aquí o " : "Arrastra los archivos aquí o "}
              <button
                type="button"
                onClick={openPicker}
                className="mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_80%,transparent)]"
              >
                elige archivos
              </button>
            </p>
            <p className="text-xs text-zinc-500">{formatsHint}</p>
          </div>
        </div>
      </div>

      {sizeError ? (
        <p
          id={errorId}
          className={`text-xs font-medium text-red-700 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2`}
          role="alert"
        >
          {sizeError}
        </p>
      ) : null}

      {helperText ? (
        <p id={helperId} className="text-xs leading-relaxed text-zinc-500">
          {helperText}
        </p>
      ) : null}

      <ImageLightbox
        open={lightboxOpen && imageLightboxItems.length > 0}
        onClose={() => setLightboxOpen(false)}
        items={imageLightboxItems}
        initialIndex={lightboxIndex}
        showThumbnails={imageLightboxItems.length > 1}
        showDownload
        ariaLabel="Vista previa de archivos seleccionados"
      />
    </div>
  );
}
