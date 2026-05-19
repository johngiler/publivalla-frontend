"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { IconRowEdit, IconRowTrash } from "@/components/admin/rowActionIcons";
import { MarketplaceLineSpaceHeading } from "@/components/catalog/MarketplaceLineSpaceHeading";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { EmptyState, EmptyStateIconCart } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import { marketplaceItemsFromCartLine } from "@/lib/imageLightboxItems";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { primaryAdSpaceMediaRawFromOrderLike } from "@/lib/mediaUrls";
import {
  marketplaceLineFieldLabelClass,
  marketplaceLinePriceClass,
} from "@/lib/marketplaceLineTypography";
import {
  formatUsdInteger,
  formatUsdMoney,
  ivaFromSubtotal,
  totalWithIva,
} from "@/lib/marketplacePricing";
import { formatDailyRangeLabel, isDailyBilling } from "@/lib/rentalBilling";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";
import {
  marketplacePrimaryBtn,
  marketplaceSecondaryBtn,
} from "@/lib/marketplaceActionButtons";
import {
  cartAllItemsMeetCheckoutRules,
  cartLineSubtotalOrNull,
  cartTotalUsd,
} from "@/lib/rentalDates";
import {
  squareListImagePreviewButtonRingClass,
  squareMarketplaceLinePreviewFrameClass,
  squareMarketplaceLinePreviewImgClass,
} from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const accent = "mp-text-brand";

const cardShell = `${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5`;

function normalizeCartHighlightCode(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

export default function CartView() {
  const searchParams = useSearchParams();
  const { authReady, me, isClient, isAdmin } = useAuth();
  const { items, removeItem, clear } = useCart();
  const highlightCode = useMemo(
    () => normalizeCartHighlightCode(searchParams.get("code")),
    [searchParams],
  );
  const [lightbox, setLightbox] = useState({
    open: false,
    items: /** @type {{ src: string; alt: string }[]} */ ([]),
    initialIndex: 0,
  });

  const openCartLineLightbox = useCallback((item) => {
    const lbItems = marketplaceItemsFromCartLine(item);
    if (!lbItems.length) return;
    setLightbox({ open: true, items: lbItems, initialIndex: 0 });
  }, []);

  useEffect(() => {
    if (!highlightCode || items.length === 0) return;
    const match = items.find(
      (item) => normalizeCartHighlightCode(item.code) === highlightCode,
    );
    if (!match) return;
    const el = document.getElementById(`cart-line-${match.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightCode, items]);

  const meetsMin = cartAllItemsMeetCheckoutRules(items);
  const subtotal = meetsMin ? cartTotalUsd(items) : 0;
  const iva = ivaFromSubtotal(subtotal);
  const grandTotal = totalWithIva(subtotal);

  if (authReady && me && isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Carrito</h1>
        <p className="mt-4 text-zinc-600">
          Este proceso no está disponible para tu cuenta. Usa el acceso que te corresponde o vuelve al inicio.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/dashboard"
            className={`${marketplacePrimaryBtn} min-h-11 px-5 py-2.5 text-sm font-semibold`}
          >
            Continuar
          </Link>
          <Link
            href="/"
            className={`${marketplaceSecondaryBtn} min-h-11 px-5 py-2.5 text-sm font-medium`}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (authReady && me && !isClient) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">Carrito</h1>
        <p className="mt-4 text-zinc-600">
          El carrito del marketplace es para clientes o para quien envía una solicitud sin iniciar sesión. Si necesitas
          ayuda, contacta a soporte.
        </p>
        <Link
          href="/"
          className={`${marketplacePrimaryBtn} mt-8 min-h-11 px-5 py-2.5 text-sm font-semibold`}
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-balance text-2xl font-bold text-zinc-900 sm:text-3xl">
        Carrito{items.length > 0 ? ` (${items.length})` : ""}
      </h1>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<EmptyStateIconCart />}
            title="Tu carrito está vacío"
            description="Explora el catálogo y añade tomas con el período que necesites."
            action={
              <Link
                href="/"
                className={`${marketplacePrimaryBtn} min-h-11 px-5 py-2.5 text-sm font-semibold sm:min-h-0`}
              >
                Ir al catálogo
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => {
            const line = cartLineSubtotalOrNull(item);
            const monthGroups = isDailyBilling(item) ? [] : cartLineMonthsByYear(item);
            const dayRangeLabel =
              isDailyBilling(item) &&
              typeof item.start_date === "string" &&
              typeof item.end_date === "string"
                ? formatDailyRangeLabel(item.start_date, item.end_date)
                : null;
            const thumbRaw = primaryAdSpaceMediaRawFromOrderLike(item);
            const isHighlighted =
              Boolean(highlightCode) &&
              normalizeCartHighlightCode(item.code) === highlightCode;
            return (
              <li
                key={item.id}
                id={isHighlighted ? `cart-line-${item.id}` : undefined}
                data-cart-space-code={
                  typeof item.code === "string" ? item.code : undefined
                }
                className={`${cardShell}${
                  isHighlighted
                    ? " ring-2 ring-[color:var(--mp-primary)] ring-offset-2"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    {thumbRaw ? (
                      <button
                        type="button"
                        onClick={() => openCartLineLightbox(item)}
                        className={`${squareMarketplaceLinePreviewFrameClass} ${squareListImagePreviewButtonRingClass} shrink-0 p-0`}
                        aria-label={
                          typeof item.title === "string" && item.title.trim()
                            ? `Ver imágenes: ${item.title.trim()}`
                            : "Ver imágenes de la toma"
                        }
                      >
                        <RasterFromApiUrl
                          url={thumbRaw}
                          alt=""
                          width={120}
                          height={120}
                          className={`${squareMarketplaceLinePreviewImgClass} transition duration-200 group-hover:scale-105`}
                          {...catalogRasterImgAttrs}
                        />
                      </button>
                    ) : (
                      <div
                        className={`${squareMarketplaceLinePreviewFrameClass} shrink-0 bg-zinc-100`}
                        aria-hidden
                      >
                        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-zinc-400">
                          Sin imagen
                        </div>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <MarketplaceLineSpaceHeading item={item} />
                    {dayRangeLabel ? (
                      <p className="mt-3 text-sm font-medium text-zinc-700">{dayRangeLabel}</p>
                    ) : null}
                    {monthGroups.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {monthGroups.map(({ year, months }) => (
                          <div key={`${item.id}-${year}`}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              {year}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {months.map((label) => (
                                <span
                                  key={`${item.id}-${year}-${label}`}
                                  className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    </div>
                  </div>
                  <div className="flex flex-row items-start justify-between gap-4 sm:flex-col sm:items-end">
                    {line != null ? (
                      <p className={marketplaceLinePriceClass}>{formatUsdInteger(line)}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">—</p>
                    )}
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      <Link
                        href={`/catalog/${item.id}`}
                        className="mp-ring-brand inline-flex shrink-0 items-center justify-center rounded-[15px] border border-transparent p-2 text-[color:var(--mp-primary)] transition-colors hover:border-[color-mix(in_srgb,var(--mp-primary)_28%,#e4e4e7)] hover:bg-[color-mix(in_srgb,var(--mp-primary)_10%,#fff)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
                        aria-label="Editar fechas de reserva"
                      >
                        <IconRowEdit />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-[15px] border border-transparent p-2 text-red-600 transition-colors hover:border-red-200/90 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]`}
                        aria-label="Quitar del carrito"
                      >
                        <IconRowTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ImageLightbox
        open={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        items={lightbox.items}
        initialIndex={lightbox.initialIndex}
        showDownload={false}
        showThumbnails={lightbox.items.length > 1}
        ariaLabel="Imágenes de la toma en el carrito"
      />

      {items.length > 0 && !meetsMin ? (
        <p
          className={`mt-6 ${ROUNDED_CONTROL} border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950`}
        >
          Alguna línea no tiene fechas válidas o no cumple al menos un mes de calendario. Usa el icono de{" "}
          <strong className="font-medium">lápiz</strong>, ajusta el calendario y pulsa{" "}
          <strong className="font-medium">Guardar modificación</strong>, o vacía el carrito.
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className={`mt-6 ${cardShell}`}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className={`font-semibold tabular-nums ${meetsMin ? accent : "text-zinc-400"}`}>
                {meetsMin ? formatUsdMoney(subtotal) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>IVA (16 %)</span>
              <span className={`font-semibold tabular-nums ${meetsMin ? accent : "text-zinc-400"}`}>
                {meetsMin ? formatUsdMoney(iva) : "—"}
              </span>
            </div>
          </div>
          <div className="my-4 border-t border-zinc-200" />
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-base font-bold text-zinc-900">Total</span>
            <span className={`text-2xl font-bold tabular-nums ${meetsMin ? accent : "text-zinc-400"}`}>
              {meetsMin ? formatUsdInteger(grandTotal) : "—"}
            </span>
          </div>
          <Link
            href={meetsMin ? "/checkout" : "#"}
            aria-disabled={!meetsMin}
            className={`${marketplacePrimaryBtn} mt-6 flex min-h-12 w-full items-center justify-center text-center text-base font-semibold ${
              !meetsMin
                ? "pointer-events-none !bg-none bg-zinc-200 text-zinc-500 shadow-none hover:brightness-100"
                : ""
            }`}
            onClick={(e) => {
              if (!meetsMin) e.preventDefault();
            }}
          >
            Proceder al pago
          </Link>
          <button
            type="button"
            onClick={() => clear()}
            className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-800"
          >
            Vaciar carrito
          </button>
        </div>
      ) : null}
    </div>
  );
}
