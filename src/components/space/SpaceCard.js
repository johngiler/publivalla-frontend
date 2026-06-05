import Link from "next/link";

import { SpaceDetailFavoriteButton } from "@/components/catalog/SpaceDetailFavoriteButton";
import { CatalogRasterImage } from "@/components/media/CatalogRasterImage";
import { SpaceMultiYearAvailabilityBar } from "@/components/catalog/SpaceMultiYearAvailabilityBar";
import {
  spaceStatusLabel,
  spaceStatusPillClassName,
} from "@/components/admin/adminConstants";
import { IconCart } from "@/components/layout/navIcons";
import { CATALOG_CART_BADGE_CLASS } from "@/lib/catalogMonthColors";
import { formatCatalogTitle } from "@/lib/catalogDisplay";
import { spaceCoverCandidatesForUi } from "@/lib/mediaUrls";

function formatUsdMonthly(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}

/**
 * Tarjeta de toma en catálogo (título a ancho completo; fila estado / precio; badge centro + ciudad).
 * @param {{ space: Record<string, unknown>, showFooterLink?: boolean, inCart?: boolean, cartStartIso?: string | null, cartEndIso?: string | null, cartRentalSegments?: Array<{ start_date?: string, end_date?: string }> | null, priority?: boolean, cardFooter?: import("react").ReactNode, showFavoriteButton?: boolean }} props
 */
export function SpaceCard({
  space,
  showFooterLink = true,
  inCart = false,
  cartStartIso = null,
  cartEndIso = null,
  cartRentalSegments = null,
  priority = false,
  cardFooter = null,
  showFavoriteButton = false,
}) {
  const coverCandidates = spaceCoverCandidatesForUi(space);
  const centerName =
    typeof space.shopping_center_name === "string"
      ? space.shopping_center_name.trim()
      : "";
  const cityLine =
    typeof space.shopping_center_city === "string"
      ? space.shopping_center_city.trim()
      : "";
  /** Ciudad bajo el nombre del CC cuando aporta contexto y no duplica el nombre. */
  const showCitySubline =
    cityLine !== "" &&
    centerName !== "" &&
    cityLine.localeCompare(centerName, undefined, { sensitivity: "accent" }) !==
      0;
  const hasLocationBadge = centerName !== "" || cityLine !== "";
  const statusText = spaceStatusLabel(space.status, space.status_label);
  const code =
    typeof space.code === "string" && space.code.trim() !== ""
      ? space.code.trim()
      : "";
  const displayTitle = formatCatalogTitle(
    (typeof space.name === "string" && space.name.trim()) ||
      (typeof space.title === "string" && space.title.trim()) ||
      "",
  );

  const detailHref = `/catalog/${space.id}`;

  return (
    <article className="group relative overflow-visible rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-zinc-200/80 transition-all duration-300 ease-out hover:z-20 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.15)] hover:ring-zinc-300">
      <div className="relative">
        <Link
          href={detailHref}
          className="mp-ring-brand block overflow-hidden rounded-t-2xl focus-visible:outline-none"
        >
          <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900">
            {coverCandidates.length > 0 ? (
              <CatalogRasterImage
                candidates={coverCandidates}
                alt={displayTitle || "Espacio publicitario"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                priority={priority}
                fetchPriority={priority ? "high" : "low"}
                decoding="async"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(217,142,50,0.2),transparent_55%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </>
            )}
            {hasLocationBadge ? (
              <div
                className="absolute bottom-3 right-3 max-w-[min(calc(100%-1.5rem),12.5rem)] rounded-lg bg-black/65 px-2.5 py-1.5 text-right shadow-sm ring-1 ring-white/[0.12] backdrop-blur-md"
                aria-label={
                  centerName
                    ? showCitySubline
                      ? `${centerName}, ${cityLine}`
                      : centerName
                    : cityLine
                }
              >
                {centerName ? (
                  <span className="block w-full truncate text-end text-[11px] font-semibold leading-snug tracking-tight text-white">
                    {centerName}
                  </span>
                ) : (
                  <span className="block w-full truncate text-end text-[11px] font-semibold uppercase tracking-wide text-white">
                    {cityLine}
                  </span>
                )}
                {showCitySubline ? (
                  <span className="mt-0.5 block w-full truncate text-end text-[9px] font-medium uppercase tracking-[0.14em] text-white/72">
                    {cityLine}
                  </span>
                ) : null}
              </div>
            ) : null}
            {inCart ? (
              <span
                className={`absolute right-2.5 top-2.5 inline-flex max-w-[min(100%-4rem,9.5rem)] items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-tight shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${CATALOG_CART_BADGE_CLASS}`}
              >
                <IconCart className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">En carrito</span>
              </span>
            ) : null}
          </div>
        </Link>
        {showFavoriteButton && space.id != null ? (
          <SpaceDetailFavoriteButton
            spaceId={space.id}
            variant="overlay"
            overlayAlign={inCart ? "left" : "right"}
          />
        ) : null}
      </div>
      <Link
        href={detailHref}
        className="mp-ring-brand block rounded-b-2xl focus-visible:outline-none"
      >
        <div className="p-4">
          <h2 className="w-full text-balance break-words text-[15px] font-semibold leading-snug tracking-tight text-zinc-900">
            {displayTitle}
          </h2>
          {code ? (
            <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {code}
            </p>
          ) : null}
          <div className="mt-2.5 flex w-full items-center justify-between gap-3">
            <span
              className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight ${spaceStatusPillClassName(space.status)}`}
            >
              {statusText}
            </span>
            <p className="min-w-0 text-right text-lg font-bold tabular-nums text-[#c2410c]">
              {formatUsdMonthly(space.monthly_price_usd)}
            </p>
          </div>
          <div className="relative z-30 mt-4">
            <SpaceMultiYearAvailabilityBar
              space={space}
              cartStartIso={inCart ? cartStartIso : null}
              cartEndIso={inCart ? cartEndIso : null}
              cartRentalSegments={inCart ? cartRentalSegments : null}
              compact
              variant="summary"
            />
          </div>
          {showFooterLink ? (
            <span className="mt-3 inline-block text-sm font-semibold text-zinc-800 no-underline underline-offset-4 group-hover:underline">
              Ver detalle
            </span>
          ) : null}
        </div>
      </Link>
      {cardFooter != null ? (
        <div className="border-t border-zinc-100 px-4 py-3">{cardFooter}</div>
      ) : null}
    </article>
  );
}
