import { normalizeRentalSegments, parseISODateOnly } from "@/lib/rentalDates";
import { MONTH_SHORT_ES } from "@/lib/spaceCalendar";

/**
 * Etiquetas cortas de meses de calendario cubiertos por [start, end] (inclusive).
 * @param {string} startStr
 * @param {string} endStr
 * @returns {string[]}
 */
export function contractMonthShortLabels(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const s = parseISODateOnly(startStr);
  const e = parseISODateOnly(endStr);
  if (e < s) return [];
  const out = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  const endM = new Date(e.getFullYear(), e.getMonth(), 1);
  while (cur <= endM) {
    const label = MONTH_SHORT_ES[cur.getMonth()];
    if (!out.length || out[out.length - 1] !== label) out.push(label);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/**
 * Meses de una línea de carrito agrupados por año (título = año, pastillas = mes).
 * @param {Record<string, unknown>} item
 * @returns {Array<{ year: number, months: string[] }>}
 */
export function cartLineMonthsByYear(item) {
  const segs = normalizeRentalSegments(item);
  if (!segs.length) return [];
  /** @type {Map<number, string[]>} */
  const byYear = new Map();
  for (const seg of segs) {
    if (!seg.start_date || !seg.end_date) continue;
    const s = parseISODateOnly(seg.start_date);
    const e = parseISODateOnly(seg.end_date);
    if (e < s) continue;
    const cur = new Date(s.getFullYear(), s.getMonth(), 1);
    const endM = new Date(e.getFullYear(), e.getMonth(), 1);
    while (cur <= endM) {
      const y = cur.getFullYear();
      const label = MONTH_SHORT_ES[cur.getMonth()];
      let list = byYear.get(y);
      if (!list) {
        list = [];
        byYear.set(y, list);
      }
      if (!list.includes(label)) list.push(label);
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, months]) => ({ year, months }));
}

