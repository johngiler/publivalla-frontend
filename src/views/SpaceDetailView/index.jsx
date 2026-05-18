import Link from "next/link";

import { SpaceDetailCoverWithLightbox } from "@/components/catalog/SpaceDetailCoverWithLightbox";
import { SpaceDetailAvailabilityBar } from "@/components/catalog/SpaceDetailAvailabilityBar";
import { SpaceMarketplaceCompliance } from "@/components/catalog/SpaceMarketplaceCompliance";
import { SpaceDetailReservationActions } from "@/components/catalog/SpaceDetailReservationActions";
import { SPACE_TYPES, spaceStatusLabel, spaceStatusPillClassName } from "@/components/admin/adminConstants";
import { formatCatalogTitle } from "@/lib/catalogDisplay";
import { catalogSummaryAvailabilityYear } from "@/lib/spaceCalendar";
import { subtitleCityAfterCenterName } from "@/lib/shoppingCenterDisplay";
import { mediaUrlForUiWithWebp, spaceCoverUrlForUi } from "@/lib/mediaUrls";

function labelFromChoices(choices, value) {
  if (value == null || String(value).trim() === "") return null;
  const v = String(value).trim();
  const row = choices.find((c) => c.v === v);
  return row?.l ?? v;
}

function formatUsdMonthly(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(x);
}

function SpecRow({ label, children, compact = false }) {
  if (children == null || children === "") return null;
  return (
    <div
      className={`border-b border-zinc-100 last:border-b-0 last:pb-0 ${compact ? "py-2" : "py-3"}`}
    >
      <dt
        className={`font-semibold uppercase tracking-wide text-zinc-500 ${
          compact ? "text-xs leading-tight" : "text-xs"
        }`}
      >
        {label}
      </dt>
      <dd
        className={`mt-1 min-w-0 break-words font-medium text-zinc-900 ${
          compact ? "text-sm leading-snug" : "text-sm leading-relaxed"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

export default function SpaceDetailView({ space }) {
  const backHref = "/";
  const typeLabel = labelFromChoices(SPACE_TYPES, space.type);
  const statusLabel = spaceStatusLabel(space.status, space.status_label);
  const summaryYear = catalogSummaryAvailabilityYear(new Date(), space);
  const yearLabel = String(summaryYear);
  const centerName =
    typeof space.shopping_center_name === "string" && space.shopping_center_name.trim() !== ""
      ? space.shopping_center_name.trim()
      : "";
  const centerSlug =
    typeof space.shopping_center_slug === "string" && space.shopping_center_slug.trim() !== ""
      ? space.shopping_center_slug.trim()
      : "";
  const cityRaw =
    typeof space.shopping_center_city === "string" && space.shopping_center_city.trim() !== ""
      ? space.shopping_center_city.trim()
      : null;
  const cityLine = subtitleCityAfterCenterName(centerName, cityRaw);
  const homeFilteredByCenterHref = centerSlug ? `/?center=${encodeURIComponent(centerSlug)}` : "/";
  const coverUrl = spaceCoverUrlForUi(space);
  const galleryUrls =
    Array.isArray(space.gallery_images) && space.gallery_images.length > 0
      ? space.gallery_images
          .filter((u) => typeof u === "string" && u.trim() !== "")
          .map((u) => mediaUrlForUiWithWebp(u))
          .filter(Boolean)
      : coverUrl
        ? [coverUrl]
        : [];
  const displayTitle = formatCatalogTitle(
    typeof space.title === "string" ? space.title : "",
  );
  const coverAlt = displayTitle
    ? `Imagen principal: ${displayTitle}`
    : "Imagen principal del espacio publicitario";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <Link
        href={backHref}
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-500 transition-colors duration-200 hover:text-zinc-900 sm:min-h-0"
      >
        <span className="transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden>
          ←
        </span>
        <span>Volver al catálogo</span>
      </Link>

      <header className="mt-8 max-w-3xl lg:mt-10">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">{space.code}</p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          {displayTitle}
        </h1>
        <p className="mt-3 text-base text-zinc-600">
          <span className="font-medium text-zinc-700">Centro comercial: </span>
          {centerSlug ? (
            <Link
              href={homeFilteredByCenterHref}
              className="font-medium mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_85%,transparent)]"
            >
              {centerName || centerSlug}
            </Link>
          ) : (
            <span className="font-medium text-zinc-900">{centerName || "—"}</span>
          )}
          {cityLine ? (
            <>
              <span className="text-zinc-400"> · </span>
              <span>{cityLine}</span>
            </>
          ) : null}
          {typeLabel ? (
            <>
              <span className="text-zinc-400"> · </span>
              <span>{typeLabel}</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-12 lg:items-start lg:gap-x-3 lg:gap-y-0">
        <div className="min-w-0 lg:col-span-7">
          <SpaceDetailCoverWithLightbox
            galleryUrls={galleryUrls}
            coverAlt={coverAlt}
            figureClassName="mt-0"
            imageSizes="(max-width: 1024px) 100vw, min(420px, 55vw)"
            spaceId={space.id}
          />
          {space.description ? (
            <div className="mt-5 max-w-md">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Descripción</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-[15px]">{space.description}</p>
            </div>
          ) : null}
        </div>

        <aside className="mx-auto flex w-full min-w-0 max-w-sm flex-col gap-5 sm:max-w-[23rem] lg:col-span-5 lg:mx-0 lg:max-w-none lg:sticky lg:top-24 lg:justify-self-start lg:self-start">
          <div className="w-full rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Precio mensual</p>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums text-[#c2410c] sm:text-3xl">
                {formatUsdMonthly(space.monthly_price_usd)}
              </span>
              <span className="text-sm text-zinc-500">USD / mes (+ impuestos si aplican)</span>
            </p>
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Disponibilidad {yearLabel}
              </p>
              <div className="mt-2 min-w-0">
                <SpaceDetailAvailabilityBar space={space} spaceId={space.id} />
              </div>
            </div>
          </div>

          <div className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3.5 sm:p-4">
            <h2 className="text-base font-bold uppercase tracking-wide text-zinc-950">Ficha técnica</h2>
            <dl className="mt-1.5">
              {space.width != null && space.height != null ? (
                <SpecRow compact label="Dimensiones (m)">
                  {space.width} × {space.height}
                </SpecRow>
              ) : null}
              {space.material ? (
                <SpecRow compact label="Material">
                  {space.material}
                </SpecRow>
              ) : null}
              {space.location_description ? (
                <SpecRow compact label="Ubicación en el centro">
                  {space.location_description}
                </SpecRow>
              ) : null}
              {space.venue_zone ? (
                <SpecRow compact label="Zona comercial">
                  {space.venue_zone}
                </SpecRow>
              ) : null}
              {space.level ? (
                <SpecRow compact label="Nivel">
                  {space.level}
                </SpecRow>
              ) : null}
              {space.quantity != null && Number(space.quantity) > 1 ? (
                <SpecRow compact label="Cantidad de unidades">
                  {space.quantity}
                </SpecRow>
              ) : null}
              <SpecRow compact label="Estado">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${spaceStatusPillClassName(space.status)}`}
                >
                  {statusLabel}
                </span>
              </SpecRow>
            </dl>
          </div>
        </aside>
      </div>

      <SpaceDetailReservationActions space={space} />
      <SpaceMarketplaceCompliance space={space} />
    </div>
  );
}
