/**
 * Miniaturas cuadradas compartidas: radio **10px** en todos los marcos de esta lib.
 * - 100×100: lightbox, galería admin de toma, comprobante checkout (`squareListImagePreview*`).
 * - 60×60: columna Portada en tablas admin CC y tomas (`squareAdminTablePortada*`).
 * - 120×120: carrito y tarjetas de línea en Mis pedidos (`squareMarketplaceLinePreview*`).
 * - Líneas de pedido (panel admin Pedidos): miniatura **120×120** (`squareOrderLinePreview*`).
 * No usar en portadas hero del catálogo ni en avatares circulares de persona.
 */
export const squareListImagePreviewFrameClass =
  "relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm";

export const squareListImagePreviewImgClass = "h-full w-full object-cover";

/** Carrito y listado Mis pedidos (cliente). */
export const squareMarketplaceLinePreviewFrameClass =
  "relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm";

export const squareMarketplaceLinePreviewImgClass = "h-full w-full object-cover";

/** Columna «Portada» en tablas admin (centros, tomas). */
export const squareAdminTablePortadaFrameClass =
  "relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm";

export const squareAdminTablePortadaImgClass = "h-full w-full object-cover";

/** Tarjetas de línea en pedido (panel): portada cuadrada fija. */
export const squareOrderLinePreviewFrameClass =
  "relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm";

export const squareOrderLinePreviewImgClass = "absolute inset-0 h-full w-full object-cover";

/** Anillos hover/focus para botones que abren lightbox (Mis pedidos, etc.). */
export const squareListImagePreviewButtonRingClass =
  "group transition hover:ring-2 hover:ring-[color-mix(in_srgb,var(--mp-primary)_38%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_45%,transparent)]";
