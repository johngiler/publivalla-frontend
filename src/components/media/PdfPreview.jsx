"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adminSecondaryBtn } from "@/components/admin/adminFormStyles";
import { ROUNDED_CONTROL, ROUNDED_PDF_GRID_CARD } from "@/lib/uiRounding";

export function IcExternal({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3h7v7M10 14L21 3M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IcDownload({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0l4-4m-4 4L8 12M4 20h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Vista previa de PDF en línea (iframe) con acciones de descargar y abrir en otra pestaña.
 * Modo **blob**: `onFetchBlob` (p. ej. `authFetchBlob` con JWT). Modo **URL**: `directUrl` (misma pestaña / media).
 *
 * @param {{
 *   title: string;
 *   downloadFileName: string;
 *   disabled?: boolean;
 *   emptyHint?: string;
 *   loadKey?: string | number;
 *   directUrl?: string;
 *   onFetchBlob?: () => Promise<Blob>;
 *   className?: string;
 *   previewMinHeightClass?: string;
 *   hideTitle?: boolean;
 *   compact?: boolean;
 *   fillParentCell?: boolean;
 *   embedHideSidebar?: boolean;
 * }} props
 * compact: título más pequeño, iframe más bajo y acciones solo icono (rejillas admin).
 * fillParentCell: el padre define alto (p. ej. celda `aspect-square`); la vista previa crece y el iframe llena el espacio restante.
 * embedHideSidebar: en el visor PDF del navegador oculta el panel de miniaturas (`#navpanes=0`).
 */
export const pdfPreviewCompactIconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none border border-zinc-200/90 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]";

/** Parámetros de fragmento para el visor PDF embebido (Chrome / Edge / Firefox). */
function pdfIframeSrc(url, embedHideSidebar) {
  if (!url) return "";
  if (!embedHideSidebar) return url;
  const hash = "navpanes=0";
  return url.includes("#") ? `${url}&${hash}` : `${url}#${hash}`;
}

export function PdfPreview({
  title,
  downloadFileName,
  disabled = false,
  emptyHint = "Documento no disponible.",
  loadKey = "",
  directUrl = "",
  onFetchBlob,
  className = "",
  previewMinHeightClass = "min-h-[280px] h-[min(52vh,420px)]",
  hideTitle = false,
  compact = false,
  fillParentCell = false,
  embedHideSidebar = false,
}) {
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const blobUrlRef = useRef("");
  const onFetchBlobRef = useRef(onFetchBlob);
  onFetchBlobRef.current = onFetchBlob;

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
    setBlobUrl("");
  }, []);

  useEffect(() => {
    if (disabled) {
      revokeBlob();
      setLoadErr("");
      setLoading(false);
      return;
    }
    const direct = typeof directUrl === "string" && directUrl.trim();
    if (direct) {
      revokeBlob();
      setLoadErr("");
      setLoading(false);
      return;
    }
    if (typeof onFetchBlobRef.current !== "function") {
      setLoadErr("Falta la función para cargar el PDF.");
      return;
    }

    let cancelled = false;
    revokeBlob();
    setLoadErr("");
    setLoading(true);

    (async () => {
      try {
        const blob = await onFetchBlobRef.current();
        if (cancelled) return;
        if (!(blob instanceof Blob) || blob.size === 0) {
          setLoadErr("El archivo está vacío o no es válido.");
          setLoading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "No se pudo cargar el PDF.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // ``onFetchBlob`` puede ser inline en el padre; no incluirlo en deps para evitar bucles de carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se usa ``loadKey`` + ``directUrl`` + ``disabled`` como firma de carga
  }, [disabled, directUrl, loadKey, revokeBlob]);

  useEffect(() => {
    return () => revokeBlob();
  }, [revokeBlob]);

  const src = (typeof directUrl === "string" && directUrl.trim()) || blobUrl || "";

  /** Contenedor de la tarjeta (compact: padre 5px; vista ancha: radio estándar). */
  const shellRadiusClass = compact ? ROUNDED_PDF_GRID_CARD : ROUNDED_CONTROL;
  /** Vista previa / estados internos: en compact van rectos para alinear el marco del PDF. */
  const innerPreviewRadiusClass = compact ? "rounded-none" : ROUNDED_CONTROL;

  const openInNewTab = useCallback(() => {
    if (!src) return;
    window.open(src, "_blank", "noopener,noreferrer");
  }, [src]);

  const toolbar = src ? (
    <div className={`flex shrink-0 flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
      {compact ? (
        <>
          <a
            href={src}
            download={downloadFileName}
            className={pdfPreviewCompactIconButtonClass}
            aria-label="Descargar PDF"
            title="Descargar"
          >
            <IcDownload className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={openInNewTab}
            className={pdfPreviewCompactIconButtonClass}
            aria-label="Abrir en pestaña nueva"
            title="Abrir en pestaña nueva"
          >
            <IcExternal className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <a
            href={src}
            download={downloadFileName}
            className={`${adminSecondaryBtn} inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold sm:text-sm`}
          >
            <IcDownload />
            Descargar
          </a>
          <button
            type="button"
            onClick={openInNewTab}
            className={`${adminSecondaryBtn} inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold sm:text-sm`}
          >
            <IcExternal />
            Abrir en pestaña nueva
          </button>
        </>
      )}
    </div>
  ) : null;

  if (disabled) {
    return (
      <div
        className={`${shellRadiusClass} border border-dashed border-zinc-200 bg-zinc-50/80 text-center text-zinc-500 ${compact ? "px-3 py-4 text-xs" : "px-4 py-6 text-sm"} ${fillParentCell ? "flex h-full min-h-0 w-full flex-col justify-center overflow-auto" : ""} ${className}`}
      >
        <p className={`font-medium text-zinc-700 ${compact ? "text-xs" : ""}`}>{title?.trim() || "Documento PDF"}</p>
        <p className="mt-1">{emptyHint}</p>
      </div>
    );
  }

  const showTitleRow = Boolean((!hideTitle && title?.trim()) || toolbar);

  return (
    <div
      className={`${shellRadiusClass} border border-zinc-200/90 bg-white shadow-sm ${fillParentCell ? "flex min-h-0 flex-col overflow-hidden" : ""} ${className}`}
      aria-label={title?.trim() || downloadFileName}
    >
      {showTitleRow ? (
        <div
          className={`flex shrink-0 border-b border-zinc-100 bg-zinc-50/90 ${
            compact
              ? `flex flex-row items-center gap-2 px-2 py-2 ${
                  !hideTitle && title?.trim() ? "justify-between" : "justify-end"
                }`
              : `flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 ${
                  hideTitle ? "sm:justify-end" : "sm:justify-between"
                }`
          }`}
        >
          {!hideTitle && title?.trim() ? (
            <h4
              className={
                compact
                  ? "min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-zinc-900"
                  : "text-sm font-semibold text-zinc-900"
              }
            >
              {title}
            </h4>
          ) : null}
          {toolbar}
        </div>
      ) : null}
      <div
        className={`${compact ? "p-1.5" : "p-2 sm:p-3"} ${fillParentCell ? "flex min-h-0 flex-1 flex-col" : ""}`}
      >
        {loadErr ? (
          <p
            className={`${innerPreviewRadiusClass} bg-red-50 px-3 py-2 text-sm text-red-800 ${fillParentCell ? "min-h-0 flex-1 overflow-auto" : ""}`}
            role="alert"
          >
            {loadErr}
          </p>
        ) : loading && !src ? (
          <div
            className={`flex w-full items-center justify-center ${innerPreviewRadiusClass} border border-zinc-100 bg-zinc-100/60 ${
              fillParentCell ? "min-h-0 flex-1" : previewMinHeightClass
            }`}
            aria-busy="true"
            aria-label="Cargando vista previa del PDF"
          >
            <span className={`font-medium text-zinc-500 ${compact ? "text-xs" : "text-sm"}`}>
              Cargando vista previa…
            </span>
          </div>
        ) : src ? (
          <iframe
            title={title}
            src={pdfIframeSrc(src, embedHideSidebar)}
            className={`w-full ${innerPreviewRadiusClass} border border-zinc-200 bg-zinc-50 ${
              fillParentCell ? "min-h-0 flex-1" : previewMinHeightClass
            }`}
          />
        ) : (
          <p
            className={`text-center text-sm text-zinc-500 ${fillParentCell ? "flex min-h-0 flex-1 items-center justify-center py-4" : "py-8"}`}
          >
            No hay vista previa disponible.
          </p>
        )}
      </div>
    </div>
  );
}
