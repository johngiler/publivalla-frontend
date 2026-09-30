/**
 * URLs de medios: resolver con `apiBase`, opción HTTPS, y **`/media/…` en el origen del portal**
 * (Next reescribe a `NEXT_PUBLIC_API_URL` en `next.config.mjs`) para que `<img>` no dependa de CORS al API.
 *
 * Candidatos WebP: `rasterDisplayCandidates` / `RasterFromApiUrl` / `CatalogRasterImage` (backend puede servir `.webp`).
 * Rutas **incorrectas en disco o en la BD** se corrigen en el servidor (`ensure_imagefields_webp`, `fix_doubled_media_paths`);
 * aquí solo se normaliza cómo se pide la URL al navegador.
 */

import { apiBase } from "@/lib/apiBase";

function upgradeMediaUrlToHttpsIfNeeded(absoluteUrl) {
  const base = apiBase().replace(/\/$/, "");
  if (
    !absoluteUrl ||
    !base.startsWith("https://") ||
    !absoluteUrl.startsWith("http://")
  ) {
    return absoluteUrl;
  }
  try {
    const bu = new URL(base);
    const u = new URL(absoluteUrl);
    if (
      u.hostname === bu.hostname &&
      String(u.port || "") === String(bu.port || "")
    ) {
      u.protocol = "https:";
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return absoluteUrl;
}

/** ¿`https://api…/media/…` es el API de este despliegue? (incl. dev localhost vs 127.0.0.1 y `api.{tenant}` sin env duplicado.) */
function isApiHostMediaUrl(u) {
  if (!(u.pathname === "/media" || u.pathname.startsWith("/media/"))) return false;
  const b = apiBase().replace(/\/$/, "");
  if (b) {
    try {
      const api = new URL(/^https?:\/\//i.test(b) ? b : `http://${b}`);
      if (u.origin === api.origin) return true;
      if (process.env.NODE_ENV === "development") {
        const local = new Set(["localhost", "127.0.0.1"]);
        if (
          local.has(u.hostname) &&
          local.has(api.hostname) &&
          String(u.port || "") === String(api.port || "")
        ) {
          return true;
        }
      }
    } catch {
      /* ignore */
    }
  }
  const tenant = (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || "").trim().toLowerCase();
  if (tenant && u.hostname.toLowerCase() === `api.${tenant}`) return true;
  return false;
}

/** `https://api…/media/…` → `/media/…` para el proxy de Next (`rewrites`). */
function apiMediaUrlToRelativePortalPath(abs) {
  if (!abs || typeof abs !== "string") return abs;
  const s = abs.trim();
  if (s === "/media" || s.startsWith("/media/")) return s;
  try {
    const u = new URL(s);
    if (!isApiHostMediaUrl(u)) return abs;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return abs;
  }
}

/** Ruta absoluta hacia el host del API (p. ej. `/media/…` → `https://api…/media/…`). */
export function mediaAbsoluteUrl(maybeRelative) {
  if (maybeRelative == null || maybeRelative === "") return "";
  const s = String(maybeRelative);
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return upgradeMediaUrlToHttpsIfNeeded(s);
  }
  const b = apiBase().replace(/\/$/, "");
  const p = s.startsWith("/") ? s : `/${s}`;
  const out = b ? `${b}${p}` : p;
  return upgradeMediaUrlToHttpsIfNeeded(out);
}

/** Alineado a `ad_space_effective_cover_url` (Django): galería primero, luego portada. Pedidos, contratos y carrito. */
export function primaryAdSpaceMediaRawFromOrderLike(line) {
  if (!line || typeof line !== "object") return "";
  const gallery = line.ad_space_gallery_images ?? line.gallery_images;
  if (Array.isArray(gallery)) {
    for (const u of gallery) {
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }
  const cover = line.ad_space_cover_image ?? line.cover_image;
  if (cover == null) return "";
  if (typeof cover === "string" && cover.trim()) return cover.trim();
  if (typeof cover === "object" && typeof cover.url === "string" && cover.url.trim()) {
    return cover.url.trim();
  }
  return "";
}

/**
 * Extrae una ruta de imagen usable por `RasterFromApiUrl` desde un campo del API
 * (string, `{ url }`, o galería admin `{ image }`).
 */
export function rawMediaUrlFromApiField(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value != null) {
    if (typeof value.url === "string") return value.url.trim();
    if (typeof value.image === "string") return value.image.trim();
  }
  return "";
}

/** URL final para `<img>`: absoluta coherente con el API y, si aplica, `/media/…` same-origin. */
export function normalizeMediaUrlForUi(url) {
  let abs = mediaAbsoluteUrl(url);
  if (!abs) return "";
  if (process.env.NODE_ENV === "development") {
    abs = abs.replace(
      /^http:\/\/localhost(?::\d+)?(?=\/|$)/i,
      apiBase().replace(/\/$/, ""),
    );
  }
  return apiMediaUrlToRelativePortalPath(abs);
}

/**
 * Ruta ``/media/…`` para ``authFetchBlob`` / ``apiUrl`` a partir de ``file_url`` del API (relativa o absoluta).
 * El iframe del navegador no envía ``Authorization``; para PDFs protegidos hay que obtener un blob con JWT.
 */
export function apiBlobPathFromMediaField(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  const n = normalizeMediaUrlForUi(s);
  if (n && n.startsWith("/media/")) return n;
  try {
    const u = new URL(s);
    if (u.pathname.startsWith("/media/")) return `${u.pathname}${u.search}`;
  } catch {
    /* ignore */
  }
  return "";
}

/**
 * Rutas donde no se genera compañero `.webp` en servidor (p. ej. artes de pedido subidos por el cliente).
 * Evita un 404 previo innecesario en ``<img>`` / lightbox.
 */
function mediaPathSkipsWebpFirst(url) {
  const s = String(url || "");
  return /\/media\/orders\//i.test(s);
}

/**
 * Si la URL es raster (.jpg/.png/.gif), devuelve la misma ruta con extensión `.webp` (migración en disco).
 */
export function rasterUrlTryWebpVariant(url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  if (/\.webp(\?|#|$)/i.test(t)) return "";
  if (!/\.(jpe?g|png|gif)(\?|#|$)/i.test(t)) return "";
  try {
    const u = new URL(t);
    const path = u.pathname;
    if (!/\.(jpe?g|png|gif)$/i.test(path)) return "";
    u.pathname = path.replace(/\.(jpe?g|png|gif)$/i, ".webp");
    return u.toString();
  } catch {
    return t.replace(/\.(jpe?g|png|gif)(?=(\?|#|$))/i, ".webp");
  }
}

/** @param {unknown} coverImage */
export function rawSpaceCoverSrc(coverImage) {
  if (typeof coverImage === "string" && coverImage.trim() !== "") return coverImage;
  if (
    coverImage &&
    typeof coverImage === "object" &&
    typeof coverImage.url === "string" &&
    coverImage.url.trim() !== ""
  ) {
    return coverImage.url;
  }
  return "";
}

/** Normaliza y, si la ruta es raster (.jpg/.png/.gif), prueba la variante `.webp` (catálogo con reintento en `CatalogRasterImage`). */
export function mediaUrlForUiWithWebp(rawUrl) {
  if (rawUrl == null || typeof rawUrl !== "string" || rawUrl.trim() === "") return "";
  const n = normalizeMediaUrlForUi(rawUrl.trim());
  if (!n) return "";
  if (mediaPathSkipsWebpFirst(n)) return n;
  return rasterUrlTryWebpVariant(n) || n;
}

/**
 * Candidatos para `<CatalogRasterImage>` / `RasterFromApiUrl`: **.webp primero**, luego URL normalizada (jpg/png…).
 * Así la red pide WebP antes que el raster legacy.
 */
export function rasterDisplayCandidates(rawUrl) {
  if (rawUrl == null || rawUrl === "") return [];
  const s = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!s) return [];
  const normalized = normalizeMediaUrlForUi(s);
  if (!normalized) return [];
  if (mediaPathSkipsWebpFirst(normalized)) return [normalized];
  const webp = rasterUrlTryWebpVariant(normalized);
  if (webp && webp !== normalized) return [webp, normalized];
  return [normalized];
}

/**
 * Candidatos para portada (galería en orden, luego `cover_image` si aporta otra ruta).
 */
export function spaceCoverCandidatesForUi(space) {
  if (!space) return [];
  const seen = new Set();
  const out = [];
  const addCandidates = (raw) => {
    if (raw == null || typeof raw !== "string" || !raw.trim()) return;
    for (const u of rasterDisplayCandidates(raw.trim())) {
      const identity = normalizeMediaUrlForUi(u) || u;
      if (seen.has(identity)) continue;
      seen.add(identity);
      out.push(u);
    }
  };
  const gallery = Array.isArray(space.gallery_images) ? space.gallery_images : [];
  for (const g of gallery) {
    addCandidates(g);
  }
  addCandidates(rawSpaceCoverSrc(space.cover_image));
  return out;
}

export function spaceCoverUrlForUi(space) {
  return spaceCoverCandidatesForUi(space)[0] ?? "";
}

/** Galería del espacio como URLs finales (para carrito / lightbox). */
export function adSpaceGalleryUrlsForUi(space) {
  if (!space || !Array.isArray(space.gallery_images)) return [];
  const seen = new Set();
  const out = [];
  for (const g of space.gallery_images) {
    if (typeof g !== "string" || !g.trim()) continue;
    const u = mediaUrlForUiWithWebp(g.trim());
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
