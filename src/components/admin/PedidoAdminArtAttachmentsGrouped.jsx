"use client";

import { useMemo } from "react";

import {
  IcDownload,
  IcExternal,
  PdfPreview,
  pdfPreviewCompactIconButtonClass,
} from "@/components/media/PdfPreview";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { apiBlobPathFromMediaField } from "@/lib/mediaUrls";
import {
  ORDER_ART_ATTACHMENT_PREVIEW_PX,
  squareListImagePreviewButtonRingClass,
  squareOrderArtAttachmentPreviewFrameClass,
  squareOrderArtAttachmentPreviewImgClass,
} from "@/lib/squareImagePreview";
import { authFetchBlob } from "@/services/authApi";

const orderPdfGridPreviewProps = {
  compact: true,
  className: "min-w-0",
  previewMinHeightClass: "min-h-[112px] h-[min(18vh,168px)]",
};

const artThumbFrameClass = squareOrderArtAttachmentPreviewFrameClass;
const artThumbPx = ORDER_ART_ATTACHMENT_PREVIEW_PX;

/**
 * @param {{
 *   entry: {
 *     id: unknown;
 *     raw: string;
 *     abs: string;
 *     label: string;
 *     kind: string;
 *   };
 *   orderId: string | number;
 *   accessToken: string | null | undefined;
 *   imageIndex: number;
 *   onOpenImageLightbox: (index: number) => void;
 * }} props
 */
function AdminOrderArtEntryTile({
  entry: e,
  orderId,
  accessToken,
  imageIndex,
  onOpenImageLightbox,
}) {
  if (e.kind === "image") {
    return (
      <div
        className="flex shrink-0 flex-col gap-1"
        style={{ width: artThumbPx }}
      >
        <div className={artThumbFrameClass}>
          <button
            type="button"
            className={`absolute inset-0 cursor-zoom-in overflow-hidden rounded-none border-0 bg-transparent p-0 ${squareListImagePreviewButtonRingClass}`}
            aria-label={`Ver imagen ampliada (${e.label})`}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenImageLightbox(imageIndex >= 0 ? imageIndex : 0);
            }}
          >
            <RasterFromApiUrl
              url={e.raw}
              alt=""
              width={artThumbPx}
              height={artThumbPx}
              className={`pointer-events-none ${squareOrderArtAttachmentPreviewImgClass}`}
              {...catalogRasterImgAttrs}
            />
          </button>
        </div>
      </div>
    );
  }

  if (e.kind === "pdf") {
    const blobPath = apiBlobPathFromMediaField(e.raw);
    const downloadName = /\.pdf$/i.test(e.label)
      ? e.label
      : `${String(e.label).replace(/\.[^/.]+$/, "") || `arte-${e.id}`}.pdf`;
    return (
      <div
        className="flex shrink-0 flex-col gap-1"
        style={{ width: artThumbPx }}
      >
        <div className={`${artThumbFrameClass} min-h-0`}>
          <PdfPreview
            {...orderPdfGridPreviewProps}
            fillParentCell
            className="absolute inset-0 min-h-0"
            title="Artes"
            hideTitle
            downloadFileName={downloadName}
            disabled={!blobPath}
            emptyHint="No se pudo cargar el PDF (ruta o permisos)."
            loadKey={`${orderId}-client-art-pdf-${e.id}-${blobPath}`}
            onFetchBlob={() => authFetchBlob(blobPath, { token: accessToken })}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col gap-1"
      style={{ width: artThumbPx }}
    >
      <div className={`${artThumbFrameClass} flex items-center justify-center bg-zinc-50/90`}>
        {e.abs ? (
          <div className="flex gap-1">
            <a
              href={e.abs}
              download={e.label}
              className={pdfPreviewCompactIconButtonClass}
              aria-label={`Descargar archivo (${e.label})`}
              title="Descargar"
            >
              <IcDownload className="h-4 w-4" />
            </a>
            <a
              href={e.abs}
              target="_blank"
              rel="noopener noreferrer"
              className={pdfPreviewCompactIconButtonClass}
              aria-label={`Abrir archivo (${e.label})`}
              title="Abrir en pestaña nueva"
            >
              <IcExternal className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">URL no disponible</span>
        )}
      </div>
    </div>
  );
}

/**
 * Rejilla de miniaturas de artes (imagen, PDF u otro).
 *
 * @param {{
 *   entries: Array<{
 *     id: unknown;
 *     raw: string;
 *     abs: string;
 *     label: string;
 *     kind: string;
 *   }>;
 *   orderId: string | number;
 *   accessToken: string | null | undefined;
 *   artImageEntries: Array<{ id: unknown }>;
 *   onOpenImageLightbox: (index: number) => void;
 *   className?: string;
 * }} props
 */
export function PedidoAdminArtEntryTiles({
  entries,
  orderId,
  accessToken,
  artImageEntries,
  onOpenImageLightbox,
  className = "flex flex-wrap gap-2 sm:gap-3",
}) {
  const imageIndexByArtId = useMemo(() => {
    const m = new Map();
    artImageEntries.forEach((e, idx) => {
      m.set(e.id, idx);
    });
    return m;
  }, [artImageEntries]);

  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return null;

  return (
    <div className={className}>
      {list.map((e) => (
        <AdminOrderArtEntryTile
          key={String(e.id)}
          entry={e}
          orderId={orderId}
          accessToken={accessToken}
          imageIndex={imageIndexByArtId.get(e.id) ?? -1}
          onOpenImageLightbox={onOpenImageLightbox}
        />
      ))}
    </div>
  );
}

