"use client";

import { useEffect, useMemo, useState } from "react";

import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { ArtLineGroupCardHeader } from "@/components/orders/ArtLineGroupCardHeader";
import { PdfPreview } from "@/components/media/PdfPreview";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { artLineGroupForOrderItemPk } from "@/lib/orderArtLineGroups";
import {
  ORDER_ART_ATTACHMENT_PREVIEW_PX,
  squareOrderArtAttachmentPreviewFrameClass,
  squareOrderArtAttachmentPreviewImgClass,
} from "@/lib/squareImagePreview";

const orderClientPdfPreviewProps = {
  compact: true,
  className: "min-w-0",
  previewMinHeightClass: "min-h-[112px] h-[min(18vh,168px)]",
};

/** @param {File} file */
function fileIsImage(file) {
  if (file.type?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

/** @param {File} file */
function fileIsPdf(file) {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

/**
 * @param {{
 *   file: File;
 *   onRemove: () => void;
 * }} props
 */
function PendingArtFileTile({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameClass = squareOrderArtAttachmentPreviewFrameClass;
  const thumbPx = ORDER_ART_ATTACHMENT_PREVIEW_PX;

  return (
    <div
      className="flex shrink-0 flex-col gap-1"
      style={{ width: thumbPx }}
    >
      <div className={frameClass}>
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 z-10 inline-flex size-8 items-center justify-center rounded-md border border-zinc-200/90 bg-white/95 text-red-700 shadow-sm hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80"
          aria-label={`Quitar ${file.name}`}
          title="Quitar"
        >
          <IconRowTrash className="!h-4 !w-4 shrink-0 text-red-600" />
        </button>
        {fileIsImage(file) && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className={squareOrderArtAttachmentPreviewImgClass}
            width={thumbPx}
            height={thumbPx}
            {...catalogRasterImgAttrs}
          />
        ) : fileIsPdf(file) && previewUrl ? (
          <PdfPreview
            {...orderClientPdfPreviewProps}
            fillParentCell
            className="absolute inset-0 min-h-0"
            title="Arte"
            hideTitle
            downloadFileName={file.name}
            disabled={false}
            emptyHint="No se pudo cargar el PDF."
            loadKey={`pending-art-pdf-${file.name}-${file.size}-${file.lastModified}`}
            directUrl={previewUrl}
            embedHideSidebar
          />
        ) : (
          <div className="flex h-full min-h-[80px] items-center justify-center px-2 text-center text-[10px] font-medium text-zinc-500">
            {file.name}
          </div>
        )}
      </div>
      <p className="truncate text-[10px] font-medium leading-snug text-zinc-500">
        {file.name}
      </p>
    </div>
  );
}

/**
 * Archivos elegidos en el modal, agrupados por toma, antes de subir al servidor.
 *
 * @param {{
 *   pendingGroups: Array<{ orderItemPk: number; files: File[] }>;
 *   lineGroups: Array<Record<string, unknown>>;
 *   orderId: string | number;
 *   onRemoveFile: (orderItemPk: number, fileIndex: number) => void;
 *   labelClass: string;
 * }} props
 */
export function OrderPendingArtStaging({
  pendingGroups,
  lineGroups,
  orderId,
  onRemoveFile,
  labelClass,
}) {
  const groupsWithMeta = useMemo(
    () =>
      pendingGroups
        .filter((g) => g.files.length > 0)
        .map((g) => ({
          ...g,
          meta: artLineGroupForOrderItemPk(lineGroups, g.orderItemPk),
        })),
    [pendingGroups, lineGroups],
  );

  if (!groupsWithMeta.length) return null;

  return (
    <div className="space-y-4">
      <p className={labelClass}>Pendientes de subir</p>
      <div className="grid grid-cols-2 gap-3">
      {groupsWithMeta.map((g) => {
        const headerGroup = g.meta ?? {
          code: `Toma #${g.orderItemPk}`,
          title: "",
          centerSubtitle: "",
          items: [],
          periodGroups: [],
          multiPeriod: false,
        };
        const fileCountLabel =
          g.files.length === 1
            ? "1 archivo pendiente"
            : `${g.files.length} archivos pendientes`;
        return (
          <div
            key={g.orderItemPk}
            className="flex w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-zinc-200/90 bg-white"
          >
            <ArtLineGroupCardHeader
              group={headerGroup}
              fileCountLabel={fileCountLabel}
              pillsKeyPrefix={`pending-art-${orderId}-${g.orderItemPk}`}
            />
            <div className="flex flex-wrap gap-2 bg-white px-3 py-3 sm:gap-3">
              {g.files.map((file, fileIndex) => (
                <PendingArtFileTile
                  key={`${g.orderItemPk}-${file.name}-${file.size}-${file.lastModified}-${fileIndex}`}
                  file={file}
                  onRemove={() => onRemoveFile(g.orderItemPk, fileIndex)}
                />
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
