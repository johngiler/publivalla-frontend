"use client";

import { useState } from "react";

import { MarketplaceLineSpaceHeading } from "@/components/catalog/MarketplaceLineSpaceHeading";
import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { adminOrderLineCoverLightboxItems } from "@/lib/imageLightboxItems";
import {
  marketplaceLineFieldLabelClass,
  marketplaceLinePriceClass,
} from "@/lib/marketplaceLineTypography";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import {
  squareListImagePreviewButtonRingClass,
  squareOrderLinePreviewFrameClass,
  squareOrderLinePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const LINES_PREVIEW_MAX = 2;

/**
 * Líneas de un pedido en el detalle admin (/pedidos): como mucho 2 visibles; el resto tras «Mostrar N más».
 *
 * @param {{
 *   orderId: string | number;
 *   items: Array<Record<string, unknown>>;
 *   onOpenLineCover?: (payload: { items: Array<{ src: string; alt?: string }>; initialIndex: number }) => void;
 * }} props
 */
export function PedidoAdminOrderLinesList({ orderId, items, onOpenLineCover }) {
  const [expanded, setExpanded] = useState(false);
  const list = Array.isArray(items) ? items : [];
  const showAccordion = list.length > LINES_PREVIEW_MAX;
  const visibleItems = expanded || !showAccordion ? list : list.slice(0, LINES_PREVIEW_MAX);
  const hiddenCount = showAccordion && !expanded ? list.length - LINES_PREVIEW_MAX : 0;

  if (list.length === 0) {
    return <p className="text-sm text-zinc-400">Sin líneas en este pedido.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="list-none space-y-4 p-0">
        {visibleItems.map((it) => {
          const coverRaw =
            it.ad_space_cover_image && String(it.ad_space_cover_image).trim()
              ? String(it.ad_space_cover_image).trim()
              : "";
          const periodMonths = cartLineMonthsByYear(it);
          const lineItem = {
            ad_space: it.ad_space,
            ad_space_title: it.ad_space_title,
            ad_space_code: it.ad_space_code,
            shopping_center_name: it.shopping_center_name,
            shopping_center_city: it.shopping_center_city,
            start_date: it.start_date,
            end_date: it.end_date,
          };

          return (
            <li
              key={it.id}
              className={`${ROUNDED_CONTROL} overflow-hidden border border-zinc-200/90 bg-white shadow-sm`}
            >
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5">
                <div className="flex min-w-0 flex-1 gap-3">
                  {coverRaw ? (
                    <button
                      type="button"
                      className={`${squareOrderLinePreviewFrameClass} ${squareListImagePreviewButtonRingClass} shrink-0 p-0`}
                      aria-label={
                        it.ad_space_title
                          ? `Ver portada ampliada: ${it.ad_space_title}`
                          : it.ad_space_code
                            ? `Ver portada ampliada: ${it.ad_space_code}`
                            : "Ver portada ampliada"
                      }
                      onClick={() => {
                        const lightboxItems = adminOrderLineCoverLightboxItems(it);
                        if (lightboxItems.length && onOpenLineCover) {
                          onOpenLineCover({
                            items: lightboxItems,
                            initialIndex: 0,
                          });
                        }
                      }}
                    >
                      <RasterFromApiUrl
                        url={coverRaw}
                        alt={
                          it.ad_space_title
                            ? `Portada: ${it.ad_space_title}`
                            : it.ad_space_code
                              ? `Portada ${it.ad_space_code}`
                              : "Portada del espacio publicitario"
                        }
                        width={120}
                        height={120}
                        className={squareOrderLinePreviewImgClass}
                        {...catalogRasterImgAttrs}
                      />
                    </button>
                  ) : (
                    <div
                      className={`${squareOrderLinePreviewFrameClass} flex items-center justify-center`}
                      aria-hidden
                    >
                      <div className="px-1 text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-zinc-400">
                        Sin imagen
                      </div>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <MarketplaceLineSpaceHeading item={lineItem} />
                    {periodMonths.length > 0 ? (
                      <RentalMonthsByYearPills
                        groups={periodMonths}
                        keyPrefix={`admin-order-${orderId}-line-${it.id}`}
                        className="mt-2"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right sm:pt-0.5">
                  <p className={marketplaceLineFieldLabelClass}>Subtotal (sin IVA)</p>
                  <p className={marketplaceLinePriceClass}>
                    {formatUsdMoney(Number(it.subtotal))}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 ? (
        <div className="flex justify-start sm:justify-end">
          <button
            type="button"
            className="text-sm font-semibold mp-text-brand underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
            aria-expanded={false}
            onClick={() => setExpanded(true)}
          >
            Mostrar {hiddenCount} más
          </button>
        </div>
      ) : null}
      {showAccordion && expanded ? (
        <div className="flex justify-start sm:justify-end">
          <button
            type="button"
            className="text-sm font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            aria-expanded
            onClick={() => setExpanded(false)}
          >
            Mostrar menos
          </button>
        </div>
      ) : null}
    </div>
  );
}
