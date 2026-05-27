/** Temporada alta del canon de arrendamiento (alineado con backend/apps/malls/utils/high_season.py). */

import { contractMonthsInclusive, parseISODateOnly } from "@/lib/rentalDates";

/** Recargo fijo +30 % en meses de temporada alta. */
export const HIGH_SEASON_LEASE_SURCHARGE = 1.3;

export const MARGARITA_HIGH_SEASON_MONTHS = [7, 8, 11, 12];
export const DEFAULT_HIGH_SEASON_MONTHS = [11, 12];

/** @param {{ slug?: string, name?: string } | null | undefined} center */
export function isSambilMargaritaCenter(center) {
  const slug = String(center?.slug || "").trim().toLowerCase();
  const name = String(center?.name || "").trim().toLowerCase();
  if (slug === "smg" || slug === "sambil-margarita" || slug === "margarita") return true;
  if (slug.includes("margarita") || name.includes("margarita")) return true;
  return name === "sambil margarita";
}

/** @param {{ slug?: string, name?: string } | null | undefined} center */
export function leaseHighSeasonMonthsForCenter(center) {
  return isSambilMargaritaCenter(center)
    ? [...MARGARITA_HIGH_SEASON_MONTHS]
    : [...DEFAULT_HIGH_SEASON_MONTHS];
}

/** @param {unknown} raw */
export function normalizeHighSeasonMonths(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) {
    const m = Number(x);
    if (Number.isInteger(m) && m >= 1 && m <= 12 && !out.includes(m)) out.push(m);
  }
  return out.sort((a, b) => a - b);
}

/** @param {unknown} raw Valor API legado; temporada alta usa siempre +30 %. */
export function parseHighSeasonMultiplier(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return HIGH_SEASON_LEASE_SURCHARGE;
}

/**
 * @param {number} baseMonthly
 * @param {number[]} highSeasonMonths
 * @param {number} _multiplier ignorado; siempre +30 % en temporada alta
 * @param {number} month1to12
 */
export function effectiveMonthlyForMonth(baseMonthly, highSeasonMonths, _multiplier, month1to12) {
  const base = Number(baseMonthly);
  if (!Number.isFinite(base)) return 0;
  if (normalizeHighSeasonMonths(highSeasonMonths).includes(month1to12)) {
    return Math.round(base * HIGH_SEASON_LEASE_SURCHARGE * 100) / 100;
  }
  return base;
}

/**
 * @param {string} startStr
 * @param {string} endStr
 */
function* iterMonthsInIsoRange(startStr, endStr) {
  let d = parseISODateOnly(startStr);
  const end = parseISODateOnly(endStr);
  while (d <= end) {
    yield { year: d.getFullYear(), month: d.getMonth() + 1 };
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
}

/**
 * @param {number | string} monthlyUsd
 * @param {string} startStr
 * @param {string} endStr
 * @param {number[]} [highSeasonMonths]
 */
export function lineSubtotalWithHighSeason(
  monthlyUsd,
  startStr,
  endStr,
  highSeasonMonths = [],
) {
  if (!startStr || !endStr) return 0;
  const months = normalizeHighSeasonMonths(highSeasonMonths);
  if (months.length === 0) {
    const n = Number(monthlyUsd);
    const span = contractMonthsInclusive(startStr, endStr);
    if (!Number.isFinite(n) || span <= 0) return 0;
    return Math.round(n * span * 100) / 100;
  }
  let total = 0;
  for (const { month } of iterMonthsInIsoRange(startStr, endStr)) {
    total += effectiveMonthlyForMonth(monthlyUsd, months, HIGH_SEASON_LEASE_SURCHARGE, month);
  }
  return Math.round(total * 100) / 100;
}

/**
 * @param {Record<string, unknown> | null | undefined} spaceOrItem
 */
export function highSeasonFromSpace(spaceOrItem) {
  if (!spaceOrItem || typeof spaceOrItem !== "object") {
    return { months: [], multiplier: 1 };
  }
  const months = normalizeHighSeasonMonths(spaceOrItem.high_season_months);
  return {
    months,
    multiplier: months.length ? HIGH_SEASON_LEASE_SURCHARGE : 1,
  };
}

/**
 * @param {string} startStr
 * @param {string} endStr
 * @param {number[]} highSeasonMonths
 */
export function highSeasonMonthsTouchedInRange(startStr, endStr, highSeasonMonths) {
  const hs = normalizeHighSeasonMonths(highSeasonMonths);
  if (!hs.length || !startStr || !endStr) return [];
  const touched = new Set();
  for (const { month } of iterMonthsInIsoRange(startStr, endStr)) {
    if (hs.includes(month)) touched.add(month);
  }
  return [...touched].sort((a, b) => a - b);
}

export const MONTH_LABELS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Etiqueta legible de meses de temporada alta (+30 %). */
export function formatLeaseHighSeasonSummary(centerOrMonths, centerForRule) {
  const months = Array.isArray(centerOrMonths)
    ? normalizeHighSeasonMonths(centerOrMonths)
    : leaseHighSeasonMonthsForCenter(centerForRule || centerOrMonths);
  if (!months.length) return "Sin temporada alta";
  const labels = months.map((m) => MONTH_LABELS_ES[m - 1]).join(", ");
  return `${labels} (+30 %)`;
}
