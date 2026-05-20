"use client";

import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import {
  artLineGroupCoverUrl,
  artUploadGroupHeading,
} from "@/lib/orderArtLineGroups";
import {
  ORDER_ART_LINE_COVER_PREVIEW_PX,
  squareOrderArtLineCoverPreviewFrameClass,
  squareOrderArtLineCoverPreviewImgClass,
} from "@/lib/squareImagePreview";

/**
 * Cabecera de tarjeta de artes por toma: portada de línea + título + meses + contador.
 *
 * @param {{
 *   group: Record<string, unknown>;
 *   fileCountLabel: string;
 *   pillsKeyPrefix: string;
 *   className?: string;
 * }} props
 */
export function ArtLineGroupCardHeader({
  group,
  fileCountLabel,
  pillsKeyPrefix,
  className = "min-w-0 border-b border-zinc-200/90 bg-zinc-100/90 px-3 py-2.5",
}) {
  const coverRaw = artLineGroupCoverUrl(group);
  const heading = artUploadGroupHeading(group);
  const centerSubtitle =
    group.centerSubtitle != null ? String(group.centerSubtitle).trim() : "";
  const periodGroups = Array.isArray(group.periodGroups) ? group.periodGroups : [];
  const showPills = periodGroups.some(
    (pg) => Array.isArray(pg.months) && pg.months.length > 0,
  );

  return (
    <div className={className}>
      <div className="flex gap-2.5">
        {coverRaw ? (
          <div className={squareOrderArtLineCoverPreviewFrameClass} aria-hidden={false}>
            <RasterFromApiUrl
              url={coverRaw}
              alt={
                group.title
                  ? `Portada: ${group.title}`
                  : group.code
                    ? `Portada ${group.code}`
                    : "Portada de la toma"
              }
              width={ORDER_ART_LINE_COVER_PREVIEW_PX}
              height={ORDER_ART_LINE_COVER_PREVIEW_PX}
              className={squareOrderArtLineCoverPreviewImgClass}
              {...catalogRasterImgAttrs}
            />
          </div>
        ) : (
          <div
            className={`${squareOrderArtLineCoverPreviewFrameClass} flex items-center justify-center`}
            aria-hidden
          >
            <span className="px-1 text-center text-[9px] font-medium uppercase leading-tight tracking-wide text-zinc-400">
              Sin portada
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-bold uppercase tracking-wide text-zinc-600"
            title={heading}
          >
            {heading}
          </p>
          {centerSubtitle ? (
            <p
              className="mt-0.5 truncate text-[10px] leading-snug text-zinc-500"
              title={centerSubtitle}
            >
              {centerSubtitle}
            </p>
          ) : null}
          {showPills ? (
            <RentalMonthsByYearPills
              groups={periodGroups}
              keyPrefix={pillsKeyPrefix}
              className="mt-1.5"
            />
          ) : null}
          <p className="mt-1 text-[10px] tabular-nums text-zinc-400">
            {fileCountLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
