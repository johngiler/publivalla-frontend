import {
  mediaUrlForUiWithWebp,
  primaryAdSpaceMediaRawFromOrderLike,
  rawSpaceCoverSrc,
} from "@/lib/mediaUrls";

/**
 * Línea de carrito marketplace (tras `addItem`): URLs ya pueden venir absolutas del API.
 */
export function marketplaceItemsFromCartLine(item) {
  const alt = typeof item?.title === "string" && item.title.trim() ? item.title.trim() : "Espacio publicitario";
  const list = [];
  if (Array.isArray(item?.gallery_images)) {
    for (const u of item.gallery_images) {
      if (typeof u !== "string" || !u.trim()) continue;
      const s = mediaUrlForUiWithWebp(u.trim());
      if (s) list.push({ src: s, alt, thumbnailSrc: s });
    }
  }
  if (list.length === 0) {
    const raw = rawSpaceCoverSrc(item?.cover_image);
    const s = raw ? mediaUrlForUiWithWebp(raw) : "";
    if (s) list.push({ src: s, alt, thumbnailSrc: s });
  }
  return list;
}

export function cartLineThumbSrc(item) {
  const raw = primaryAdSpaceMediaRawFromOrderLike(item);
  return raw ? mediaUrlForUiWithWebp(raw) : "";
}

/** Fila de toma en listado admin: `gallery_images[]` con `{ image }` o `cover_image`. */
export function adminTomaRowLightboxItems(row, altText) {
  const alt =
    typeof altText === "string" && altText.trim() ? altText.trim() : "Portada del espacio publicitario";
  const out = [];
  if (Array.isArray(row?.gallery_images) && row.gallery_images.length > 0) {
    for (const g of row.gallery_images) {
      const im = g?.image;
      if (typeof im !== "string" || !im.trim()) continue;
      const s = mediaUrlForUiWithWebp(im.trim());
      if (s) out.push({ src: s, alt });
    }
  }
  if (out.length === 0 && row?.cover_image) {
    const s = mediaUrlForUiWithWebp(row.cover_image);
    if (s) out.push({ src: s, alt });
  }
  return out;
}

export function adminCenterCoverLightboxItems(center) {
  if (!center?.cover_image) return [];
  const s = mediaUrlForUiWithWebp(center.cover_image);
  if (!s) return [];
  const alt = typeof center.name === "string" && center.name.trim() ? center.name.trim() : "Portada del centro";
  return [{ src: s, alt }];
}

export function adminOrderLineCoverLightboxItems(line) {
  const alt =
    typeof line?.ad_space_title === "string" && line.ad_space_title.trim()
      ? line.ad_space_title.trim()
      : line?.ad_space_code
        ? `Portada ${line.ad_space_code}`
        : "Portada del espacio publicitario";
  const out = [];
  if (Array.isArray(line?.ad_space_gallery_images) && line.ad_space_gallery_images.length > 0) {
    for (const u of line.ad_space_gallery_images) {
      if (typeof u !== "string" || !u.trim()) continue;
      const s = mediaUrlForUiWithWebp(u.trim());
      if (s) out.push({ src: s, alt, thumbnailSrc: s });
    }
  }
  if (out.length === 0 && line?.ad_space_cover_image) {
    const s = mediaUrlForUiWithWebp(line.ad_space_cover_image);
    if (s) out.push({ src: s, alt, thumbnailSrc: s });
  }
  return out;
}
