import {
  lineShoppingCenterSubtitle,
  lineSpaceCode,
  lineSpaceTitle,
  orderLineItemPk,
} from "@/components/catalog/MarketplaceLineSpaceHeading";
import { normalizeRentalSegments } from "@/lib/rentalDates";
import { cartLineMonthsByYear } from "@/lib/rentalMonthPills";

/**
 * Agrupa líneas del pedido por código de toma (EP). Varias filas con el mismo código
 * (p. ej. salto de mes) cuentan como una sola toma para subir artes.
 *
 * @param {Array<Record<string, unknown>>} lineItems
 * @returns {Array<{
 *   code: string;
 *   title: string;
 *   centerSubtitle: string;
 *   orderItemPk: number | null;
 *   items: Array<Record<string, unknown>>;
 *   periodGroups: Array<{ year: number; months: string[] }>;
 *   multiPeriod: boolean;
 * }>}
 */
export function groupOrderLinesBySpaceCode(lineItems) {
  const list = Array.isArray(lineItems) ? lineItems : [];
  /** @type {Map<string, { code: string; title: string; centerSubtitle: string; orderItemPk: number | null; items: Array<Record<string, unknown>> }>} */
  const map = new Map();

  for (const it of list) {
    const code = lineSpaceCode(it);
    const key = code.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        code,
        title: lineSpaceTitle(it),
        centerSubtitle: lineShoppingCenterSubtitle(it),
        orderItemPk: orderLineItemPk(it),
        items: [],
      });
    }
    const g = map.get(key);
    g.items.push(it);
    const pk = orderLineItemPk(it);
    if (pk != null && g.orderItemPk == null) {
      g.orderItemPk = pk;
    }
    if (!g.title) {
      const t = lineSpaceTitle(it);
      if (t) g.title = t;
    }
    if (!g.centerSubtitle) {
      const c = lineShoppingCenterSubtitle(it);
      if (c) g.centerSubtitle = c;
    }
  }

  return [...map.values()].map((g) => {
    const mergedSegments = g.items.flatMap((it) => normalizeRentalSegments(it));
    const periodGroups = cartLineMonthsByYear({
      rental_segments: mergedSegments,
    });
    return {
      ...g,
      periodGroups,
      multiPeriod: g.items.length > 1,
    };
  });
}

/** Título de bloque / tarjeta (sin meses; los meses van en píldoras). */
export function artUploadGroupHeading(group) {
  return group.title ? `${group.code} — ${group.title}` : group.code;
}

/** Portada de la toma (primera línea del grupo con imagen). */
export function artLineGroupCoverUrl(group) {
  const items = Array.isArray(group?.items) ? group.items : [];
  for (const it of items) {
    const raw = it?.ad_space_cover_image;
    if (raw != null && String(raw).trim()) return String(raw).trim();
  }
  return "";
}

/** Etiqueta del selector (código + meses de esa fila, sin fusionar líneas). */
export function artUploadGroupSelectLabel(group) {
  const base = artUploadGroupHeading(group);
  const months = (
    Array.isArray(group.periodGroups) ? group.periodGroups : []
  ).flatMap((y) => y.months);
  const uniq = [...new Set(months)];
  if (uniq.length) {
    return `${base} (${uniq.join(", ")})`;
  }
  return base;
}

/**
 * Una entrada por línea del pedido (modal de artes: no fusionar el mismo código).
 *
 * @param {Array<Record<string, unknown>>} lineItems
 */
export function groupOrderLinesForArtPicker(lineItems) {
  const list = Array.isArray(lineItems) ? lineItems : [];
  return list.map((it) => {
    const periodGroups = cartLineMonthsByYear(it);
    return {
      code: lineSpaceCode(it),
      title: lineSpaceTitle(it),
      centerSubtitle: lineShoppingCenterSubtitle(it),
      orderItemPk: orderLineItemPk(it),
      items: [it],
      periodGroups,
      multiPeriod: false,
    };
  });
}

/** Códigos EP distintos en el pedido (varias líneas con el mismo código cuentan como uno). */
export function distinctSpaceCodeCount(lineItems) {
  return groupOrderLinesBySpaceCode(lineItems).length;
}

/**
 * Subida inline: una sola línea y un solo código (sin meses saltados en otra fila).
 */
export function orderHasSingleSpaceCodeForArt(lineItems) {
  const list = Array.isArray(lineItems) ? lineItems : [];
  if (list.length <= 1) return true;
  const codeGroups = groupOrderLinesBySpaceCode(list);
  if (codeGroups.length > 1) return false;
  return codeGroups[0].items.length === 1;
}

/**
 * Modal + tarjetas por línea: 2+ códigos distintos o el mismo código en 2+ filas (meses saltados).
 */
export function orderNeedsPerCodeArtUpload(lineItems) {
  return !orderHasSingleSpaceCodeForArt(lineItems);
}

/** Grupo de líneas para un `order_item` (pk de línea representativa). */
export function artLineGroupForOrderItemPk(groups, orderItemPk) {
  const pk = Number(orderItemPk);
  if (!Number.isFinite(pk)) return null;
  const list = Array.isArray(groups) ? groups : [];
  return list.find((g) => g.orderItemPk === pk) ?? null;
}

/** Línea destino al subir cuando todas las filas comparten el mismo código. */
export function defaultArtUploadOrderItemPk(lineItems) {
  const groups = groupOrderLinesBySpaceCode(lineItems);
  if (groups.length !== 1) return null;
  return groups[0].orderItemPk;
}

const ORPHAN_ART_CODE_KEY = "__sin_codigo__";

function spaceCodeKeyFromString(code) {
  const c = String(code || "").trim();
  return c ? c.toLowerCase() : ORPHAN_ART_CODE_KEY;
}

/** Título de bloque en tarjetas agrupadas (sin repetir meses del selector). */
export function artDisplayGroupHeading(group) {
  return artUploadGroupHeading(group);
}

/**
 * Agrupa adjuntos de arte por código EP (alineado con líneas del pedido).
 *
 * @param {Array<{ spaceCode?: string }>} artEntries
 * @param {Array<Record<string, unknown>>} lineItems
 */
export function groupArtEntriesBySpaceCode(artEntries, lineItems) {
  const lineGroups = groupOrderLinesBySpaceCode(lineItems);
  /** @type {Map<string, ReturnType<typeof groupOrderLinesBySpaceCode>[number] & { entries: unknown[] }>} */
  const bucketMap = new Map();

  for (const g of lineGroups) {
    bucketMap.set(spaceCodeKeyFromString(g.code), { ...g, entries: [] });
  }

  for (const e of artEntries) {
    const key = spaceCodeKeyFromString(e.spaceCode);
    if (!bucketMap.has(key)) {
      const code = String(e.spaceCode || "").trim();
      bucketMap.set(key, {
        code: code || "Sin toma indicada",
        title: "",
        centerSubtitle: "",
        orderItemPk: null,
        items: [],
        periodGroups: [],
        multiPeriod: false,
        entries: [],
      });
    }
    bucketMap.get(key).entries.push(e);
  }

  const ordered = [];
  for (const lg of lineGroups) {
    const b = bucketMap.get(spaceCodeKeyFromString(lg.code));
    if (b?.entries.length) ordered.push(b);
  }
  const orphan = bucketMap.get(ORPHAN_ART_CODE_KEY);
  if (orphan?.entries.length) ordered.push(orphan);

  for (const [key, b] of bucketMap) {
    if (key === ORPHAN_ART_CODE_KEY) continue;
    if (lineGroups.some((lg) => spaceCodeKeyFromString(lg.code) === key)) continue;
    if (b.entries.length) ordered.push(b);
  }

  return ordered;
}

/**
 * Agrupa adjuntos por línea del pedido (cuando aplica flujo modal).
 *
 * @param {Array<{ spaceCode?: string; orderItemPk?: number | null }>} artEntries
 * @param {Array<Record<string, unknown>>} lineItems
 */
export function groupArtEntriesByOrderLine(artEntries, lineItems) {
  const lineGroups = groupOrderLinesForArtPicker(lineItems);
  /** @type {Map<number, ReturnType<typeof groupOrderLinesForArtPicker>[number] & { entries: unknown[] }>} */
  const bucketMap = new Map();

  for (const g of lineGroups) {
    const pk = g.orderItemPk;
    if (pk == null) continue;
    bucketMap.set(pk, { ...g, entries: [] });
  }

  const orphanEntries = [];

  for (const e of artEntries) {
    const pk = e.orderItemPk != null ? Number(e.orderItemPk) : NaN;
    if (Number.isFinite(pk) && bucketMap.has(pk)) {
      bucketMap.get(pk).entries.push(e);
    } else {
      orphanEntries.push(e);
    }
  }

  const ordered = [];
  for (const lg of lineGroups) {
    const pk = lg.orderItemPk;
    if (pk == null) continue;
    const b = bucketMap.get(pk);
    if (b?.entries.length) ordered.push(b);
  }
  if (orphanEntries.length) {
    ordered.push({
      code: "Sin línea indicada",
      title: "",
      centerSubtitle: "",
      orderItemPk: null,
      items: [],
      periodGroups: [],
      multiPeriod: false,
      entries: orphanEntries,
    });
  }

  return ordered;
}
