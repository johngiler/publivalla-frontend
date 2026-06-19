"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CatalogRasterImage } from "@/components/media/CatalogRasterImage";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { IconChevronLeft, IconChevronRight } from "@/components/layout/navIcons";
import { mediaUrlForUiWithWebp, rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { squareListImagePreviewButtonRingClass } from "@/lib/squareImagePreview";

function referenceImageUrl(value) {
  const raw = rawMediaUrlFromApiField(value);
  return raw ? mediaUrlForUiWithWebp(raw) : "";
}

function collectReferenceUrls(space, pluralKey, singularKey) {
  const plural = space?.[pluralKey];
  if (Array.isArray(plural) && plural.length > 0) {
    return plural.map((u) => referenceImageUrl(u)).filter(Boolean);
  }
  const single = referenceImageUrl(space?.[singularKey]);
  return single ? [single] : [];
}

function CarouselNavButton({ label, onClick, disabled, children, className = "" }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_45%,transparent)] ${className}`}
    >
      {children}
    </button>
  );
}

function ReferenceImageCarousel({ label, urls, lightboxOffset, onOpenLightbox }) {
  const [index, setIndex] = useState(0);
  const count = urls.length;

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count, urls]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(count - 1, i + 1));
  }, [count]);

  if (count === 0) return null;

  const currentSrc = urls[index];
  const hasMultiple = count > 1;
  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  return (
    <figure className="min-w-0">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h2>
      <div className="relative mt-2">
        {hasMultiple ? (
          <CarouselNavButton
            label="Imagen anterior"
            onClick={goPrev}
            disabled={atStart}
            className="left-2 sm:left-3"
          >
            <IconChevronLeft className="h-5 w-5" />
          </CarouselNavButton>
        ) : null}
        <button
          type="button"
          className={`block w-full overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-50 p-1 ${squareListImagePreviewButtonRingClass}`}
          aria-label={`Ver ampliada: ${label}${hasMultiple ? ` ${index + 1} de ${count}` : ""}`}
          onClick={() => onOpenLightbox(lightboxOffset + index)}
        >
          <CatalogRasterImage
            src={currentSrc}
            alt=""
            className="mx-auto aspect-[4/3] max-h-80 w-full object-contain"
            sizes="(max-width: 640px) 100vw, min(420px, 50vw)"
          />
        </button>
        {hasMultiple ? (
          <CarouselNavButton
            label="Imagen siguiente"
            onClick={goNext}
            disabled={atEnd}
            className="right-2 sm:right-3"
          >
            <IconChevronRight className="h-5 w-5" />
          </CarouselNavButton>
        ) : null}
        {hasMultiple ? (
          <p
            className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
            aria-hidden
          >
            {index + 1} / {count}
          </p>
        ) : null}
      </div>
    </figure>
  );
}

/**
 * Imágenes de ubicación y de arte/producción en el detalle de toma (marketplace).
 */
export function SpaceDetailReferenceImages({ space }) {
  const sections = useMemo(() => {
    const locationUrls = collectReferenceUrls(space, "location_images", "location_image");
    const productionUrls = collectReferenceUrls(
      space,
      "production_images",
      "production_image",
    );
    const out = [];
    if (locationUrls.length > 0) {
      out.push({
        key: "location",
        label: "Imagen de ubicación",
        alt: "Plano o foto de ubicación del espacio publicitario",
        urls: locationUrls,
      });
    }
    if (productionUrls.length > 0) {
      out.push({
        key: "production",
        label: "Imagen de arte y producción",
        alt: "Referencia de arte y producción del espacio publicitario",
        urls: productionUrls,
      });
    }
    return out;
  }, [space]);

  const lightboxItems = useMemo(
    () =>
      sections.flatMap((section) =>
        section.urls.map((src, idx) => ({
          src,
          alt: section.urls.length > 1 ? `${section.alt} (${idx + 1})` : section.alt,
        })),
      ),
    [sections],
  );

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  const openLightbox = useCallback((index) => {
    setLightbox({ open: true, index });
  }, []);

  if (sections.length === 0) return null;

  let offset = 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-5">
        {sections.map((section) => {
          const sectionOffset = offset;
          offset += section.urls.length;
          return (
            <ReferenceImageCarousel
              key={section.key}
              label={section.label}
              urls={section.urls}
              lightboxOffset={sectionOffset}
              onOpenLightbox={openLightbox}
            />
          );
        })}
      </div>
      <ImageLightbox
        open={lightbox.open}
        onClose={() => setLightbox((st) => ({ ...st, open: false }))}
        items={lightboxItems}
        initialIndex={lightbox.index}
        showDownload={false}
        ariaLabel="Imágenes de referencia del espacio publicitario"
      />
    </>
  );
}
