"use client";

import { useMemo, useState } from "react";

import { CatalogRasterImage } from "@/components/media/CatalogRasterImage";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { mediaUrlForUiWithWebp, rawMediaUrlFromApiField } from "@/lib/mediaUrls";
import { squareListImagePreviewButtonRingClass } from "@/lib/squareImagePreview";

function referenceImageUrl(value) {
  const raw = rawMediaUrlFromApiField(value);
  return raw ? mediaUrlForUiWithWebp(raw) : "";
}

/**
 * Imágenes de ubicación y de arte/producción en el detalle de toma (marketplace).
 * @param {{ space: { location_image?: unknown; production_image?: unknown } }} props
 */
export function SpaceDetailReferenceImages({ space }) {
  const items = useMemo(() => {
    const out = [];
    const loc = referenceImageUrl(space?.location_image);
    const prod = referenceImageUrl(space?.production_image);
    if (loc) {
      out.push({
        key: "location",
        src: loc,
        label: "Imagen de ubicación",
        alt: "Plano o foto de ubicación del espacio publicitario",
      });
    }
    if (prod) {
      out.push({
        key: "production",
        src: prod,
        label: "Imagen de arte y producción",
        alt: "Referencia de arte y producción del espacio publicitario",
      });
    }
    return out;
  }, [space?.location_image, space?.production_image]);

  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {items.map((item, idx) => (
          <figure key={item.key} className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {item.label}
            </h2>
            <button
              type="button"
              className={`mt-2 block w-full overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-50 p-1 ${squareListImagePreviewButtonRingClass}`}
              aria-label={`Ver ampliada: ${item.label}`}
              onClick={() => setLightbox({ open: true, index: idx })}
            >
              <CatalogRasterImage
                src={item.src}
                alt={item.alt}
                className="mx-auto aspect-[4/3] max-h-80 w-full object-contain"
                sizes="(max-width: 640px) 100vw, min(420px, 50vw)"
              />
            </button>
          </figure>
        ))}
      </div>
      <ImageLightbox
        open={lightbox.open}
        onClose={() => setLightbox((st) => ({ ...st, open: false }))}
        items={items.map((i) => ({ src: i.src, alt: i.alt }))}
        initialIndex={lightbox.index}
        showDownload={false}
        ariaLabel="Imágenes de referencia del espacio publicitario"
      />
    </>
  );
}
