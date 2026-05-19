/** Mes libre / disponible (fondo blanco y borde zinc, como en el calendario del detalle). */
export const CATALOG_MONTH_AVAILABLE_BG = "bg-white";
export const CATALOG_MONTH_AVAILABLE_RING =
  "border border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

/** Mes pasado, en curso, ocupado o bloqueado. */
export const CATALOG_MONTH_UNAVAILABLE_BG = "bg-zinc-200";
export const CATALOG_MONTH_UNAVAILABLE_RING = "border border-zinc-300/60";

/** Vista admin «bloqueo de disponibilidad»: meses bloqueados por el admin (no la selección del registro). */
export const CATALOG_MONTH_BLOCKED_FORBIDDEN_LABEL = "Bloqueado";

export const CATALOG_MONTH_BLOCKED_FORBIDDEN_BG = "bg-red-50/95";
export const CATALOG_MONTH_BLOCKED_FORBIDDEN_RING =
  "border border-red-300/90 ring-1 ring-red-200/80";

/** Etiqueta de leyenda y tooltip para meses naranjas en catálogo / ficha (línea en carrito). */
export const CATALOG_MONTH_CART_LABEL = "En carrito";

/** Meses elegidos en formularios admin (bloqueo, picker interno). */
export const CATALOG_MONTH_SELECTION_LABEL = "Tu selección";

/** Pedido enviado o en flujo previo a activa (chip «Reservado», sky). */
export const CATALOG_MONTH_RESERVED_LABEL = "Reservado";

export const CATALOG_MONTH_RESERVED_BG = "bg-sky-50/95";
export const CATALOG_MONTH_RESERVED_RING =
  "border border-sky-200/90 ring-1 ring-sky-200/80";

/** Pedido o contrato activo (chip «Activa», verde). */
export const CATALOG_MONTH_ACTIVE_LABEL = "Activa";

export const CATALOG_MONTH_ACTIVE_BG = "bg-emerald-50/95";
export const CATALOG_MONTH_ACTIVE_RING =
  "border border-emerald-300/90 ring-1 ring-emerald-200/80";

/** Mes incluido en la selección / línea del carrito (calendario en detalle). */
export const CATALOG_MONTH_SELECTED_BG = "bg-orange-50/90";
export const CATALOG_MONTH_SELECTED_RING =
  "border border-[#d98e32]/40 ring-1 ring-[#d98e32]/35";

/** Badge superior en tarjeta de catálogo cuando el EP está en el carrito. */
export const CATALOG_CART_BADGE_CLASS = `${CATALOG_MONTH_SELECTED_BG} ${CATALOG_MONTH_SELECTED_RING} text-[#b45309]`;

/** Referencia «en carrito» sin ser la selección activa (detalle al editar fechas). */
export const CATALOG_MONTH_CART_BASELINE_BG = "bg-white";
export const CATALOG_MONTH_CART_BASELINE_RING =
  "border border-dashed border-[#d98e32]/70 ring-1 ring-[#d98e32]/25";

/** Mes libre en temporada alta (antes de seleccionar). */
export const CATALOG_MONTH_HIGH_SEASON_BG = "bg-amber-50/70";
export const CATALOG_MONTH_HIGH_SEASON_RING =
  "border border-amber-200/90 ring-1 ring-amber-100/80";
