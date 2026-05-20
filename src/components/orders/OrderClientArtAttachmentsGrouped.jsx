"use client";

import { useMemo } from "react";

import { IconRowTrash } from "@/components/admin/rowActionIcons";
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

const orderClientPdfPreviewProps = {
  compact: true,
  className: "min-w-0",
  previewMinHeightClass: "min-h-[112px] h-[min(18vh,168px)]",
};

/**
 * @param {{
 *   entry: {
 *     id: unknown;
 *     raw: string;
 *     abs: string;
 *     label: string;
 *     kind: string;
 *     lineCaption?: string;
 *   };
 *   orderId: string | number;
 *   accessToken: string | null | undefined;
 *   imageIndex: number;
 *   canUploadArt: boolean;
 *   busy: string;
 *   pendingArtDeleteId: number | null;
 *   onRequestDeleteArt: (id: unknown) => void;
 *   onOpenArtsLightbox: (index: number) => void;
 *   showLineCaption: boolean;
 *   orderLineCount: number;
 * }} props
 */
function ClientOrderArtEntryTile({
  entry: e,
  orderId,
  accessToken,
  imageIndex,
  canUploadArt,
  busy,
  pendingArtDeleteId,
  onRequestDeleteArt,
  onOpenArtsLightbox,
  showLineCaption,
  orderLineCount,
}) {
  const artDelBusy = busy === `art-del-${e.id}`;
  const artDeleteLocked = pendingArtDeleteId != null || busy === "art";
  const deleteBtn = canUploadArt ? (
    <button
      type="button"
      disabled={artDelBusy || artDeleteLocked}
      onClick={() => onRequestDeleteArt(e.id)}
      className="absolute right-1 top-1 z-10 inline-flex size-8 items-center justify-center rounded-md border border-zinc-200/90 bg-white/95 text-red-700 shadow-sm hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80 disabled:opacity-50"
      aria-label={`Eliminar ${e.label}`}
      title="Eliminar"
    >
      {artDelBusy ? (
        <span
          className="size-3.5 animate-pulse rounded-full bg-red-400/90"
          aria-hidden
        />
      ) : (
        <IconRowTrash className="!h-4 !w-4 shrink-0 text-red-600" />
      )}
    </button>
  ) : null;

  const lineMeta =
    showLineCaption && e.lineCaption ? (
      <p
        className="max-w-[120px] truncate text-[10px] font-medium leading-snug text-zinc-600"
        title={e.lineCaption}
      >
        {e.lineCaption}
      </p>
    ) : showLineCaption && orderLineCount > 1 ? (
      <p className="text-[10px] leading-snug text-zinc-400">Toma no indicada</p>
    ) : null;

  const frameClass = squareOrderArtAttachmentPreviewFrameClass;
  const thumbPx = ORDER_ART_ATTACHMENT_PREVIEW_PX;

  if (e.kind === "image") {
    return (
      <div
        className="flex shrink-0 flex-col gap-1"
        style={{ width: thumbPx }}
      >
        <div className={frameClass}>
          {deleteBtn}
          <button
            type="button"
            className={`absolute inset-0 cursor-pointer overflow-hidden rounded-none border-0 bg-transparent p-0 ${squareListImagePreviewButtonRingClass}`}
            aria-label={`Ver imagen ampliada (${e.label})`}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenArtsLightbox(imageIndex >= 0 ? imageIndex : 0);
            }}
          >
            <RasterFromApiUrl
              url={e.raw}
              alt=""
              width={thumbPx}
              height={thumbPx}
              className={`pointer-events-none ${squareOrderArtAttachmentPreviewImgClass}`}
              {...catalogRasterImgAttrs}
            />
          </button>
        </div>
        {lineMeta}
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
        style={{ width: thumbPx }}
      >
        <div className={`${frameClass} min-h-0`}>
          {deleteBtn}
          <PdfPreview
            {...orderClientPdfPreviewProps}
            fillParentCell
            className="absolute inset-0 min-h-0"
            title="Arte"
            hideTitle
            downloadFileName={downloadName}
            disabled={!blobPath}
            emptyHint="No se pudo cargar el PDF."
            loadKey={`${orderId}-resumen-art-pdf-${e.id}-${blobPath}`}
            onFetchBlob={() =>
              authFetchBlob(blobPath, { token: accessToken })
            }
          />
        </div>
        {lineMeta}
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 flex-col gap-1"
      style={{ width: thumbPx }}
    >
      <div
        className={`${frameClass} flex items-center justify-center bg-zinc-50/90`}
      >
        {deleteBtn}
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
      {lineMeta}
    </div>
  );
}

/**
 * Artes adjuntos en Mis pedidos: agrupados por toma si hay varios códigos EP.
 *
 * @param {{
 *   orderId: string | number;
 *   orderLineItems: Array<Record<string, unknown>>;
 *   orderArtEntries: Array<{
 *     id: unknown;
 *     raw: string;
 *     abs: string;
 *     label: string;
 *     kind: string;
 *     lineCaption?: string;
 *     spaceCode?: string;
 *   }>;
 *   artImageEntries: Array<{ id: unknown }>;
 *   accessToken: string | null | undefined;
 *   canUploadArt: boolean;
 *   busy: string;
 *   pendingArtDeleteId: number | null;
 *   onRequestDeleteArt: (id: unknown) => void;
 *   onOpenArtsLightbox: (index: number) => void;
 * }} props
 */
export function OrderClientArtAttachmentsGrouped({
  orderId,
  orderLineItems,
  orderArtEntries,
  artImageEntries,
  accessToken,
  canUploadArt,
  busy,
  pendingArtDeleteId,
  onRequestDeleteArt,
  onOpenArtsLightbox,
}) {
  const lineItems = Array.isArray(orderLineItems) ? orderLineItems : [];
  const usesArtModalFlow = orderNeedsPerCodeArtUpload(lineItems);

  const artGroups = useMemo(
    () =>
      usesArtModalFlow
        ? groupArtEntriesByOrderLine(orderArtEntries, lineItems)
        : groupArtEntriesBySpaceCode(orderArtEntries, lineItems),
    [orderArtEntries, lineItems, usesArtModalFlow],
  );

  const showGrouped = usesArtModalFlow;

  const imageIndexByArtId = useMemo(() => {
    const m = new Map();
    artImageEntries.forEach((e, idx) => {
      m.set(e.id, idx);
    });
    return m;
  }, [artImageEntries]);

  const renderTile = (e, showLineCaption) => (
    <ClientOrderArtEntryTile
      key={String(e.id)}
      entry={e}
      orderId={orderId}
      accessToken={accessToken}
      imageIndex={imageIndexByArtId.get(e.id) ?? -1}
      canUploadArt={canUploadArt}
      busy={busy}
      pendingArtDeleteId={pendingArtDeleteId}
      onRequestDeleteArt={onRequestDeleteArt}
      onOpenArtsLightbox={onOpenArtsLightbox}
      showLineCaption={showLineCaption}
      orderLineCount={lineItems.length}
    />
  );

  if (!showGrouped) {
    return (
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {orderArtEntries.map((e) => renderTile(e, lineItems.length > 1))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {artGroups.map((g) => (
        <div
          key={`${g.orderItemPk ?? g.code}-${g.title}`}
          className="flex w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-zinc-200/90 bg-white shadow-sm"
        >
          <ArtLineGroupCardHeader
            group={g}
            fileCountLabel={
              g.entries.length === 1 ? "1 archivo" : `${g.entries.length} archivos`
            }
            pillsKeyPrefix={`client-art-grp-${orderId}-${g.orderItemPk ?? g.code}`}
          />
          <div className="flex flex-wrap gap-2 bg-white px-3 py-3 sm:gap-3">
            {g.entries.map((e) => renderTile(e, false))}
          </div>
        </div>
      ))}
    </div>
  );
}
