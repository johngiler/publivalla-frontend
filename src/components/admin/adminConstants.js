import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
} from "@/lib/catalogMonthColors";

/** Tipos de toma: genéricos + formatos de catálogo PDF (espacios publicitarios en CC). */
export const SPACE_TYPES = [
  { v: "billboard", l: "Valla (genérico)" },
  { v: "banner", l: "Banner / pendón (genérico)" },
  { v: "elevator", l: "Ascensor" },
  { v: "other", l: "Otro" },
  { v: "valla_vertical", l: "Valla vertical / gigantografía vertical" },
  { v: "valla_horizontal", l: "Valla horizontal / gigantografía horizontal" },
  { v: "gigantografia_fachada", l: "Gigantografía en fachada" },
  { v: "pendon_balcon", l: "Pendón de balcón" },
  { v: "pendon_atrio", l: "Pendón de atrio / colgante central" },
  { v: "pendon_pasillo", l: "Pendón de pasillo" },
  { v: "pendon_plaza", l: "Pendón de plaza" },
  { v: "pendon_columna", l: "Pendón de columna" },
];

/** Estados de bloqueo de disponibilidad (solo fechas ocupadas en calendario). */
export const AVAILABILITY_BLOCK_TYPES = [
  { v: "occupied", l: "Ocupado" },
  { v: "expired", l: "Caducado" },
];

export const AVAILABILITY_BLOCK_TYPE_FILTER_OPTIONS = [
  { v: "all", l: "Todos los estados" },
  ...AVAILABILITY_BLOCK_TYPES,
];

export function availabilityBlockTypeLabel(type, typeLabelFromApi) {
  if (typeof typeLabelFromApi === "string" && typeLabelFromApi.trim() !== "") {
    return typeLabelFromApi.trim();
  }
  const s = String(type ?? "");
  if (s === "blocked" || s === "reserved") return "Ocupado";
  const o = AVAILABILITY_BLOCK_TYPES.find((x) => String(x.v) === s);
  return o ? o.l : type ? String(type) : "—";
}

export function availabilityBlockTypePillClassName(type) {
  const s = String(type ?? "");
  if (s === "occupied") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (s === "expired") return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
  return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

export const SPACE_AVAILABILITY = [
  { v: "available", l: "Disponible" },
  { v: "occupied", l: "Ocupado" },
  { v: "blocked", l: "Bloqueado" },
];

export const SPACE_AVAILABILITY_FILTER_OPTIONS = [
  { v: "all", l: "Todas las disponibilidades" },
  ...SPACE_AVAILABILITY,
];

export const SPACE_ACTIVE_FILTERS = [
  { v: "all", l: "Todos (estado)" },
  { v: "active", l: "Activos" },
  { v: "inactive", l: "Inactivos" },
];

export const CLIENT_STATUS = [
  { v: "active", l: "Activo" },
  { v: "suspended", l: "Suspendido" },
];

/** Texto en español para el código de estado de cliente (API puede enviar `status_label`). */
export function clientStatusLabel(status, statusLabelFromApi) {
  if (typeof statusLabelFromApi === "string" && statusLabelFromApi.trim() !== "") {
    return statusLabelFromApi.trim();
  }
  const o = CLIENT_STATUS.find((x) => String(x.v) === String(status ?? ""));
  return o ? o.l : status ? String(status) : "—";
}

/** Píldora tipo listado Centros / Activo: verde activo, ámbar suspendido. */
export function clientStatusPillClassName(status) {
  const s = String(status ?? "");
  if (s === "active") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80";
  if (s === "suspended") return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80";
  return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

/** Texto en español; el API puede enviar `availability_label` (get_availability_display). */
export function spaceAvailabilityLabel(availability, availabilityLabelFromApi) {
  const s = String(availability ?? "");
  if (s === "reserved") return "Ocupado";
  if (typeof availabilityLabelFromApi === "string" && availabilityLabelFromApi.trim() !== "") {
    return availabilityLabelFromApi.trim();
  }
  const o = SPACE_AVAILABILITY.find((x) => String(x.v) === s);
  return o ? o.l : availability ? String(availability) : "—";
}

export function spaceAvailabilityPillClassName(availability) {
  const s = String(availability ?? "");
  if (s === "available") {
    return `${CATALOG_MONTH_AVAILABLE_BG} text-zinc-800 ${CATALOG_MONTH_AVAILABLE_RING}`;
  }
  if (s === "occupied") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (s === "reserved") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (s === "blocked") return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80";
  return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

export function recordActiveLabel(isActive) {
  return isActive !== false ? "Activo" : "Inactivo";
}

export function recordActivePillClassName(isActive) {
  return isActive !== false
    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"
    : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
}

/**
 * Estados de pedido (API `status`); orden = flujo admin (`ORDER_HAPPY_PATH_ADMIN`):
 * solicitud aprobada → arte aprobado → facturada → pagada → permiso → instalación → activa.
 */
export const ORDER_STATUS = [
  { v: "draft", l: "Borrador" },
  { v: "submitted", l: "Enviada" },
  { v: "client_approved", l: "Solicitud aprobada" },
  { v: "art_approved", l: "Arte aprobado" },
  { v: "invoiced", l: "Facturada" },
  { v: "paid", l: "Pagada" },
  { v: "permit_pending", l: "Permiso alcaldía" },
  { v: "installation", l: "Instalación" },
  { v: "active", l: "Activa" },
  { v: "expired", l: "Vencida" },
  { v: "cancelled", l: "Rechazada" },
];

export const ORDER_STATUS_FILTER_OPTIONS = [{ v: "all", l: "Todos los estados" }, ...ORDER_STATUS];

export function orderStatusLabel(status, statusLabelFromApi) {
  if (typeof statusLabelFromApi === "string" && statusLabelFromApi.trim() !== "") {
    return statusLabelFromApi.trim();
  }
  const o = ORDER_STATUS.find((x) => String(x.v) === String(status ?? ""));
  return o ? o.l : status ? String(status) : "—";
}

/** Píldora de estado de pedido (listados cliente y admin). */
export function orderStatusPillClassName(status) {
  const s = String(status ?? "");
  if (s === "draft") return "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300/80";
  if (s === "submitted") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80";
  if (s === "client_approved") return "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200/80";
  if (s === "art_approved") return "bg-violet-50 text-violet-900 ring-1 ring-violet-200/80";
  if (s === "invoiced") return "bg-amber-50 text-amber-950 ring-1 ring-amber-200/80";
  if (s === "paid") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80";
  if (s === "permit_pending") return "bg-orange-50 text-orange-950 ring-1 ring-orange-200/80";
  if (s === "installation") return "bg-teal-50 text-teal-900 ring-1 ring-teal-200/80";
  if (s === "active") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300/90";
  if (s === "expired") return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80";
  if (s === "cancelled") return "bg-rose-50 text-rose-900 ring-1 ring-rose-200/80";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80";
}
