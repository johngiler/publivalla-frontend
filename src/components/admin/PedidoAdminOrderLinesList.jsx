"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PedidoAdminArtEntryTiles } from "@/components/admin/PedidoAdminArtAttachmentsGrouped";
import { IconRowChevron } from "@/components/admin/rowActionIcons";
import { MarketplaceLineSpaceHeading } from "@/components/catalog/MarketplaceLineSpaceHeading";
import { RentalMonthsByYearPills } from "@/components/catalog/RentalMonthsByYearPills";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import {
  adminOrderLineCoverLightboxItems,
  orderArtImageLightboxItems,
} from "@/lib/imageLightboxItems";
import { buildOrderArtAdminEntries } from "@/lib/orderArtAdminEntries";
import {
  artEntriesForOrderLineItem,
  orphanArtEntries,
} from "@/lib/orderArtLineGroups";
import {
  marketplaceLineFieldLabelClass,
  marketplaceLinePriceClass,
} from "@/lib/marketplaceLineTypography";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import {
  orderLineDiscountAmount,
  orderLineHasDiscount,
  orderLineOriginalSubtotal,
} from "@/lib/orderLinePricing";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import {
  squareListImagePreviewButtonRingClass,
  squareOrderLinePreviewFrameClass,
  squareOrderLinePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const LINES_PREVIEW_MAX = 6;

function artFileCountLabel(count) {
  return count === 1 ? "1 archivo" : `${count} archivos`;
}

/**
 * @param {{
 *   lineArtsId: string;
 *   artsOpen: boolean;
 *   artCount: number;
 *   onToggle: () => void;
 *   children: React.ReactNode;
 * }} props
 */
function LineArtAttachmentsAccordion({
  lineArtsId,
  artsOpen,
  artCount,
  onToggle,
  children,
}) {
  return (
    <>
      <div className="border-t border-zinc-100">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-zinc-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)] sm:px-5"
          aria-expanded={artsOpen}
          aria-controls={lineArtsId}
          onClick={onToggle}
        >
          <span
            className={`inline-flex shrink-0 text-zinc-500 transition-transform duration-200 ease-out ${artsOpen ? "rotate-90" : ""}`}
            aria-hidden
          >
            <IconRowChevron />
          </span>
          <span className="text-sm font-semibold text-zinc-700">
            Artes adjuntos ({artFileCountLabel(artCount)})
          </span>
        </button>
      </div>
      {artsOpen ? (
        <div
          id={lineArtsId}
          className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:px-5 sm:py-4"
        >
          {children}
        </div>
      ) : null}
    </>
  );
}

/**
 * Líneas de un pedido en el detalle admin (/pedidos), con artes adjuntos por línea en acordeón.
 *
 * @param {{
 *   order: Record<string, unknown>;
 *   accessToken: string | null | undefined;
 *   onOpenLineCover?: (payload: { items: Array<{ src: string; alt?: string }>; initialIndex: number }) => void;
 * }} props
 */
export function PedidoAdminOrderLinesList({ order, accessToken, onOpenLineCover }) {
  const orderId = order?.id ?? "";
  const list = Array.isArray(order?.items) ? order.items : [];
  const [expanded, setExpanded] = useState(false);
  const [openArtsLineIds, setOpenArtsLineIds] = useState(() => new Set());
  const [artsLightboxOpen, setArtsLightboxOpen] = useState(false);
  const [artsLightboxIndex, setArtsLightboxIndex] = useState(0);

  useEffect(() => {
    setOpenArtsLineIds(new Set());
    setArtsLightboxOpen(false);
    setArtsLightboxIndex(0);
    setExpanded(false);
  }, [orderId]);

  const orderArtEntries = useMemo(() => buildOrderArtAdminEntries(order), [order?.art_attachments]);

  const artImageEntries = useMemo(
    () => orderArtEntries.filter((e) => e.kind === "image"),
    [orderArtEntries],
  );

  const artsLightboxItems = useMemo(
    () => orderArtImageLightboxItems(artImageEntries),
    [artImageEntries],
  );

  const openArtsLightbox = useCallback(
    (initialIndex) => {
      if (!artsLightboxItems.length) return;
      const i = Math.min(Math.max(0, initialIndex), artsLightboxItems.length - 1);
      setArtsLightboxIndex(i);
      setArtsLightboxOpen(true);
    },
    [artsLightboxItems],
  );

  const orphanArts = useMemo(
    () => orphanArtEntries(orderArtEntries, list),
    [orderArtEntries, list],
  );

  const showAccordion = list.length > LINES_PREVIEW_MAX;
  const visibleItems = expanded || !showAccordion ? list : list.slice(0, LINES_PREVIEW_MAX);
  const hiddenCount = showAccordion && !expanded ? list.length - LINES_PREVIEW_MAX : 0;

  const toggleLineArts = useCallback((lineId) => {
    setOpenArtsLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  }, []);

  if (list.length === 0) {
    return <p className="text-sm text-zinc-400">Sin líneas en este pedido.</p>;
  }

  const renderLineCard = (it, { orphan = false } = {}) => {
    const lineArts = orphan
      ? orphanArts
      : artEntriesForOrderLineItem(it, orderArtEntries, list);
    const lineKey = orphan ? "orphan-arts" : String(it.id);
    const lineArtsId = `admin-order-${orderId}-line-arts-${lineKey}`;
    const artsOpen = openArtsLineIds.has(lineKey);
    const coverRaw =
      it?.ad_space_cover_image && String(it.ad_space_cover_image).trim()
        ? String(it.ad_space_cover_image).trim()
        : "";
    const periodMonths = orphan ? [] : cartLineMonthsByYear(it);
    const lineItem = orphan
      ? null
      : {
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
        key={lineKey}
        className={`${ROUNDED_CONTROL} min-w-0 overflow-hidden border border-zinc-200/90 bg-white shadow-sm${orphan ? " sm:col-span-2" : ""}`}
      >
        {orphan ? (
          <div className="border-b border-zinc-100 bg-zinc-50/90 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-zinc-800">Sin línea indicada</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Archivos de arte sin toma o línea asociada en el pedido.
            </p>
          </div>
        ) : (
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
              {orderLineHasDiscount(it) ? (
                <>
                  <p className="text-xs text-zinc-400 line-through tabular-nums">
                    {formatUsdMoney(orderLineOriginalSubtotal(it))}
                  </p>
                  <p className={marketplaceLinePriceClass}>
                    {formatUsdMoney(Number(it.subtotal))}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-800">
                    −{formatUsdMoney(orderLineDiscountAmount(it))}
                  </p>
                </>
              ) : (
                <p className={marketplaceLinePriceClass}>
                  {formatUsdMoney(Number(it.subtotal))}
                </p>
              )}
            </div>
          </div>
        )}

        {lineArts.length > 0 ? (
          <LineArtAttachmentsAccordion
            lineArtsId={lineArtsId}
            artsOpen={artsOpen}
            artCount={lineArts.length}
            onToggle={() => toggleLineArts(lineKey)}
          >
            <PedidoAdminArtEntryTiles
              entries={lineArts}
              orderId={orderId}
              accessToken={accessToken}
              artImageEntries={artImageEntries}
              onOpenImageLightbox={openArtsLightbox}
            />
          </LineArtAttachmentsAccordion>
        ) : null}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
        {visibleItems.map((it) => renderLineCard(it))}
        {orphanArts.length > 0 && (expanded || !showAccordion)
          ? renderLineCard(null, { orphan: true })
          : null}
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

      <ImageLightbox
        open={artsLightboxOpen}
        onClose={() => setArtsLightboxOpen(false)}
        items={artsLightboxItems}
        initialIndex={artsLightboxIndex}
        showThumbnails={artsLightboxItems.length > 1}
        showDownload
        ariaLabel="Artes subidos por la empresa"
      />
    </div>
  );
}
