"use client";

import { useMemo } from "react";

import {
  IcDownload,
  IcExternal,
  PdfPreview,
  pdfPreviewCompactIconButtonClass,
} from "@/components/media/PdfPreview";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { ArtLineGroupCardHeader } from "@/components/orders/ArtLineGroupCardHeader";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { apiBlobPathFromMediaField } from "@/lib/mediaUrls";
import {
  groupArtEntriesByOrderLine,
  groupArtEntriesBySpaceCode,
  orderNeedsPerCodeArtUpload,
} from "@/lib/orderArtLineGroups";
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
 * Listado de artes de la empresa en admin, agrupado por código de toma si hay varios.
 *
 * @param {{
 *   order: Record<string, unknown>;
 *   orderArtEntries: Array<{
 *     id: unknown;
 *     raw: string;
 *     abs: string;
 *     label: string;
 *     kind: string;
 *     spaceCode: string;
 *     orderItemPk?: number | null;
 *   }>;
 *   artImageEntries: Array<{ id: unknown }>;
 *   accessToken: string | null | undefined;
 *   onOpenImageLightbox: (index: number) => void;
 * }} props
 */
export function PedidoAdminArtAttachmentsGrouped({
  order,
  orderArtEntries,
  artImageEntries,
  accessToken,
  onOpenImageLightbox,
}) {
  const orderId = order?.id ?? "";
  const lineItems = Array.isArray(order?.items) ? order.items : [];
  const usesArtModalFlow = orderNeedsPerCodeArtUpload(lineItems);

  const artGroups = useMemo(
    () =>
      usesArtModalFlow
        ? groupArtEntriesByOrderLine(orderArtEntries, lineItems)
        : groupArtEntriesBySpaceCode(orderArtEntries, lineItems),
    [orderArtEntries, lineItems, usesArtModalFlow],
  );

  const showGroupHeaders = usesArtModalFlow;

  const imageIndexByArtId = useMemo(() => {
    const m = new Map();
    artImageEntries.forEach((e, idx) => {
      m.set(e.id, idx);
    });
    return m;
  }, [artImageEntries]);

  const tiles = (entries) =>
    entries.map((e) => (
      <AdminOrderArtEntryTile
        key={String(e.id)}
        entry={e}
        orderId={orderId}
        accessToken={accessToken}
        imageIndex={imageIndexByArtId.get(e.id) ?? -1}
        onOpenImageLightbox={onOpenImageLightbox}
      />
    ));

  if (!showGroupHeaders) {
    return <div className="flex flex-wrap gap-3">{tiles(orderArtEntries)}</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {artGroups.map((g) => (
        <div
          key={`${g.orderItemPk ?? g.code}-${g.title}`}
          className="flex w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-zinc-200/90 bg-white"
        >
          <ArtLineGroupCardHeader
            group={g}
            fileCountLabel={
              g.entries.length === 1 ? "1 archivo" : `${g.entries.length} archivos`
            }
            pillsKeyPrefix={`admin-art-grp-${orderId}-${g.orderItemPk ?? g.code}`}
          />
          <div className="flex flex-wrap gap-2 bg-white px-3 py-3 sm:gap-3">
            {tiles(g.entries)}
          </div>
        </div>
      ))}
    </div>
  );
}

