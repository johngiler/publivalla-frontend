/** Utilidades para calendario de tomas (12 meses por año; ventana multi-año en catálogo). */

/** Años de calendario si el API no envía `availability_calendar_years`. */
export const CATALOG_AVAILABILITY_YEAR_COUNT = 3;

/** @param {unknown} raw */
export function normalizeMonthsOccupied(raw) {
  if (!Array.isArray(raw) || raw.length !== 12) {
    return Array(12).fill(false);
  }
  return raw.map((x) => Boolean(x));
}

/** @param {boolean[]} occupied */
export function availableMonthsCount(occupied) {
  return occupied.filter((o) => !o).length;
}

/**
 * Meses aún elegibles en el año (excluye pasados y el mes en curso).
 * @param {number} availabilityYear
 * @param {Date} [ref]
 */
export function futureMonthsInYear(availabilityYear, ref = new Date()) {
  const cy = ref.getFullYear();
  const cm = ref.getMonth() + 1;
  if (availabilityYear < cy) return 0;
  if (availabilityYear > cy) return 12;
  return Math.max(0, 12 - cm);
}

/**
 * Meses libres entre los que aún se puede reservar (sin pasado ni ocupados).
 * @param {number} availabilityYear
 * @param {unknown} monthsOccupied
 * @param {Date} [ref]
 */
export function futureAvailableMonthsCount(availabilityYear, monthsOccupied, ref = new Date()) {
  const merged = mergeOccupiedWithPastMonths(availabilityYear, monthsOccupied, ref);
  return merged.filter((busy) => !busy).length;
}

/**
 * @param {number} year
 * @param {number} startMonth 1–12
 * @param {number} endMonth 1–12
 * @param {boolean[]} occupied
 */
export function rangeTouchesOccupiedMonth(_year, startMonth, endMonth, occupied) {
  for (let m = startMonth; m <= endMonth; m += 1) {
    if (occupied[m - 1]) return true;
  }
  return false;
}

/**
 * Mes pasado o mes en curso respecto a `ref` (mismo año calendario que `availabilityYear`).
 * @param {number} availabilityYear
 * @param {number} month1to12
 * @param {Date} [ref]
 */
export function isMonthPastOrCurrentInYear(availabilityYear, month1to12, ref = new Date()) {
  const cy = ref.getFullYear();
  const cm = ref.getMonth() + 1;
  if (availabilityYear < cy) return true;
  if (availabilityYear > cy) return false;
  return month1to12 <= cm;
}

/**
 * Combina meses ocupados/bloqueados del API con meses no elegibles (pasados o el mes actual).
 * @param {number} availabilityYear
 * @param {unknown} monthsOccupied
 * @param {Date} [ref]
 * @returns {boolean[]}
 */
export function mergeOccupiedWithPastMonths(availabilityYear, monthsOccupied, ref = new Date()) {
  const occ = normalizeMonthsOccupied(monthsOccupied);
  return occ.map((o, i) => o || isMonthPastOrCurrentInYear(availabilityYear, i + 1, ref));
}

/**
 * @param {number} availabilityYear
 * @param {unknown} monthsOccupied
 * @param {Date} [ref]
 */
export function selectableMonthsExistInYear(availabilityYear, monthsOccupied, ref = new Date()) {
  const flags = mergeOccupiedWithPastMonths(availabilityYear, monthsOccupied, ref);
  return flags.some((x) => !x);
}

/**
 * @param {number} year
 * @param {number} startMonth 1–12
 * @param {number} endMonth 1–12
 */
export function monthRangeToIsoDates(year, startMonth, endMonth) {
  const lastDay = new Date(year, endMonth, 0).getDate();
  const sm = String(startMonth).padStart(2, "0");
  const em = String(endMonth).padStart(2, "0");
  const ld = String(lastDay).padStart(2, "0");
  return {
    start_date: `${year}-${sm}-01`,
    end_date: `${year}-${em}-${ld}`,
  };
}

export const MONTH_SHORT_ES = [
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

/**
 * Límites de mes (1–12) si ambas fechas caen en `year`.
 * @param {string} isoStart
 * @param {string} isoEnd
 * @param {number} year
 * @returns {{ lo: number, hi: number } | null}
 */
export function monthBoundsFromIsoInYear(isoStart, isoEnd, year) {
  if (typeof isoStart !== "string" || typeof isoEnd !== "string" || !isoStart || !isoEnd) return null;
  const ys = Number(isoStart.slice(0, 4));
  const ye = Number(isoEnd.slice(0, 4));
  const sm = Number(isoStart.slice(5, 7));
  const em = Number(isoEnd.slice(5, 7));
  if (!Number.isFinite(ys) || !Number.isFinite(ye) || !Number.isFinite(sm) || !Number.isFinite(em)) return null;
  if (ys !== year || ye !== year) return null;
  const lo = Math.min(sm, em);
  const hi = Math.max(sm, em);
  return { lo, hi };
}

/**
 * Años del calendario de catálogo (API o ventana por defecto).
 * @param {Date} [ref]
 * @param {Record<string, unknown> | null} [space]
 */
export function catalogAvailabilityYears(ref = new Date(), space = null) {
  const fromApi = space?.availability_calendar_years;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    return fromApi.map((y) => Number(y)).filter((y) => Number.isFinite(y));
  }
  const y0 = ref.getFullYear();
  return Array.from({ length: CATALOG_AVAILABILITY_YEAR_COUNT }, (_, i) => y0 + i);
}

/**
 * Año mostrado en tarjetas de catálogo y resumen de ficha (solo el actual).
 * @param {Date} [ref]
 * @param {Record<string, unknown> | null} [space]
 */
export function catalogSummaryAvailabilityYear(ref = new Date(), space = null) {
  const fromApi = Number(space?.availability_year);
  const cy = ref.getFullYear();
  if (Number.isFinite(fromApi) && fromApi === cy) return fromApi;
  return cy;
}

/**
 * Una sola franja anual en listados (catálogo / resumen de detalle).
 * @param {Date} [ref]
 * @param {Record<string, unknown> | null} [space]
 */
export function catalogSummaryAvailabilityYears(ref = new Date(), space = null) {
  return [catalogSummaryAvailabilityYear(ref, space)];
}

/**
 * @param {Record<string, unknown> | null | undefined} space
 * @param {Date} [ref]
 * @returns {Record<number, boolean[]>}
 */
export function resolveMonthsOccupiedByYear(space, ref = new Date(), yearsOverride = null) {
  const years =
    yearsOverride && yearsOverride.length > 0
      ? yearsOverride
      : catalogAvailabilityYears(ref, space);
  const byRaw = space?.months_occupied_by_year;
  /** @type {Record<number, boolean[]>} */
  const out = {};
  for (const y of years) {
    if (byRaw && typeof byRaw === "object" && !Array.isArray(byRaw)) {
      out[y] = normalizeMonthsOccupied(byRaw[String(y)] ?? byRaw[y]);
    } else if (y === years[0]) {
      out[y] = normalizeMonthsOccupied(space?.months_occupied);
    } else {
      out[y] = Array(12).fill(false);
    }
  }
  return out;
}

/** @param {number} year @param {number} month1to12 */
export function monthLinearIndex(year, month1to12) {
  return year * 12 + month1to12;
}

/** @param {number} idx */
export function monthFromLinearIndex(idx) {
  const month = ((idx - 1) % 12) + 1;
  const year = Math.floor((idx - 1) / 12);
  return { year, month };
}

/**
 * @param {string} isoStart
 * @param {string} isoEnd
 * @returns {{ startYear: number, startMonth: number, endYear: number, endMonth: number } | null}
 */
export function isoMonthBounds(isoStart, isoEnd) {
  if (typeof isoStart !== "string" || typeof isoEnd !== "string" || !isoStart || !isoEnd) return null;
  const startYear = Number(isoStart.slice(0, 4));
  const startMonth = Number(isoStart.slice(5, 7));
  const endYear = Number(isoEnd.slice(0, 4));
  const endMonth = Number(isoEnd.slice(5, 7));
  if (
    !Number.isFinite(startYear) ||
    !Number.isFinite(startMonth) ||
    !Number.isFinite(endYear) ||
    !Number.isFinite(endMonth)
  ) {
    return null;
  }
  return { startYear, startMonth, endYear, endMonth };
}

/**
 * @param {number} startYear
 * @param {number} startMonth
 * @param {number} endYear
 * @param {number} endMonth
 */
export function monthRangeToIsoDatesCrossYear(startYear, startMonth, endYear, endMonth) {
  const loY = startYear;
  const loM = startMonth;
  const hiY = endYear;
  const hiM = endMonth;
  const lastDay = new Date(hiY, hiM, 0).getDate();
  return {
    start_date: `${loY}-${String(loM).padStart(2, "0")}-01`,
    end_date: `${hiY}-${String(hiM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * @param {number} startYear
 * @param {number} startMonth
 * @param {number} endYear
 * @param {number} endMonth
 */
export function* iterMonthsInRange(startYear, startMonth, endYear, endMonth) {
  let y = startYear;
  let m = startMonth;
  const endIdx = monthLinearIndex(endYear, endMonth);
  while (monthLinearIndex(y, m) <= endIdx) {
    yield { year: y, month: m };
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

/**
 * @param {Record<number, boolean[]>} disabledByYear
 * @param {number} startYear
 * @param {number} startMonth
 * @param {number} endYear
 * @param {number} endMonth
 */
export function rangeTouchesOccupiedAcrossYears(
  disabledByYear,
  startYear,
  startMonth,
  endYear,
  endMonth,
) {
  for (const { year, month } of iterMonthsInRange(startYear, startMonth, endYear, endMonth)) {
    const flags = disabledByYear[year];
    if (!flags || flags[month - 1]) return true;
  }
  return false;
}

/**
 * @param {Record<number, boolean[]>} byYear
 * @param {number[]} years
 * @param {Date} [ref]
 */
export function buildDisabledMonthsByYear(byYear, years, ref = new Date()) {
  /** @type {Record<number, boolean[]>} */
  const out = {};
  for (const y of years) {
    out[y] = mergeOccupiedWithPastMonths(y, byYear[y], ref);
  }
  return out;
}

/**
 * @param {number[]} years
 * @param {Record<number, boolean[]>} byYear
 * @param {Date} [ref]
 */
export function anySelectableMonthInCalendar(years, byYear, ref = new Date()) {
  return years.some((y) => selectableMonthsExistInYear(y, byYear[y], ref));
}

/**
 * @param {number} startYear
 * @param {number} startMonth
 * @param {number} endYear
 * @param {number} endMonth
 */
export function formatMonthRangeLabel(startYear, startMonth, endYear, endMonth) {
  const s = MONTH_SHORT_ES[startMonth - 1];
  const e = MONTH_SHORT_ES[endMonth - 1];
  if (startYear === endYear) return `${s} – ${e} ${startYear}`;
  return `${s} ${startYear} – ${e} ${endYear}`;
}

/**
 * @param {string | null | undefined} cartStartIso
 * @param {string | null | undefined} cartEndIso
 * @param {number} year
 * @param {number} month1to12
 */
export function isMonthInCartIsoRange(cartStartIso, cartEndIso, year, month1to12) {
  if (!cartStartIso || !cartEndIso) return false;
  const { start_date, end_date } = monthRangeToIsoDates(year, month1to12, month1to12);
  return cartStartIso <= end_date && cartEndIso >= start_date;
}

/**
 * @param {Array<{ start_date?: string, end_date?: string }> | null | undefined} rentalSegments
 * @param {number} year
 * @param {number} month1to12
 */
export function isMonthInRentalSegments(rentalSegments, year, month1to12) {
  if (!Array.isArray(rentalSegments) || !rentalSegments.length) return false;
  const idx = monthLinearIndex(year, month1to12);
  for (const seg of rentalSegments) {
    const b = isoMonthBounds(seg?.start_date, seg?.end_date);
    if (!b) continue;
    const lo = monthLinearIndex(b.startYear, b.startMonth);
    const hi = monthLinearIndex(b.endYear, b.endMonth);
    if (idx >= lo && idx <= hi) return true;
  }
  return false;
}

/**
 * @param {number[]} indices
 * @returns {Array<{ startYear: number, startMonth: number, endYear: number, endMonth: number }>}
 */
export function linearIndicesToContiguousSegments(indices) {
  if (!Array.isArray(indices) || !indices.length) return [];
  const sorted = [...new Set(indices)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  /** @type {Array<{ startYear: number, startMonth: number, endYear: number, endMonth: number }>} */
  const out = [];
  let segStart = sorted[0];
  let segEnd = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === segEnd + 1) {
      segEnd = sorted[i];
    } else {
      const s = monthFromLinearIndex(segStart);
      const e = monthFromLinearIndex(segEnd);
      out.push({ startYear: s.year, startMonth: s.month, endYear: e.year, endMonth: e.month });
      segStart = sorted[i];
      segEnd = sorted[i];
    }
  }
  const s = monthFromLinearIndex(segStart);
  const e = monthFromLinearIndex(segEnd);
  out.push({ startYear: s.year, startMonth: s.month, endYear: e.year, endMonth: e.month });
  return out;
}

/**
 * @param {Array<{ startYear: number, startMonth: number, endYear: number, endMonth: number }>} segments
 * @returns {Array<{ start_date: string, end_date: string }>}
 */
export function contiguousSegmentsToRentalSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.map((seg) =>
    monthRangeToIsoDatesCrossYear(seg.startYear, seg.startMonth, seg.endYear, seg.endMonth),
  );
}

/**
 * @param {Array<{ start_date?: string, end_date?: string }>} rentalSegments
 * @returns {number[]}
 */
export function rentalSegmentsToLinearIndices(rentalSegments) {
  if (!Array.isArray(rentalSegments)) return [];
  const out = [];
  for (const seg of rentalSegments) {
    const b = isoMonthBounds(seg?.start_date, seg?.end_date);
    if (!b) continue;
    const lo = monthLinearIndex(b.startYear, b.startMonth);
    const hi = monthLinearIndex(b.endYear, b.endMonth);
    for (let idx = lo; idx <= hi; idx += 1) {
      if (!out.includes(idx)) out.push(idx);
    }
  }
  return out.sort((a, b) => a - b);
}

/**
 * @param {number[]} indices
 */
export function formatSelectedMonthsLabel(indices) {
  const segments = linearIndicesToContiguousSegments(indices);
  if (!segments.length) return null;
  return segments
    .map((seg) => formatMonthRangeLabel(seg.startYear, seg.startMonth, seg.endYear, seg.endMonth))
    .join(" · ");
}

/**
 * @param {Record<number, boolean[]>} disabledByYear
 * @param {number[]} indices
 */
export function selectedMonthsTouchOccupied(disabledByYear, indices) {
  if (!Array.isArray(indices)) return false;
  for (const idx of indices) {
    const { year, month } = monthFromLinearIndex(idx);
    if (disabledByYear[year]?.[month - 1]) return true;
  }
  return false;
}

/**
 * Selección → payload para carrito/API (tramos contiguos + sobre de fechas solo informativo).
 * @param {number[]} indices
 */
export function selectionFromLinearIndices(indices) {
  const segments = linearIndicesToContiguousSegments(indices);
  if (!segments.length) return null;
  const rental_segments = contiguousSegmentsToRentalSegments(segments);
  const first = rental_segments[0];
  const last = rental_segments[rental_segments.length - 1];
  return {
    rental_segments,
    start_date: first.start_date,
    end_date: last.end_date,
    selected_month_count: indices.length,
  };
}

/**
 * @param {{ rental_segments?: Array<{ start_date?: string, end_date?: string }>, start_date?: string, end_date?: string } | null | undefined} pick
 * @returns {number[]}
 */
export function linearIndicesFromPick(pick) {
  if (!pick) return [];
  if (Array.isArray(pick.rental_segments) && pick.rental_segments.length) {
    return rentalSegmentsToLinearIndices(pick.rental_segments);
  }
  const b = isoMonthBounds(pick.start_date, pick.end_date);
  if (!b) return [];
  const lo = monthLinearIndex(b.startYear, b.startMonth);
  const hi = monthLinearIndex(b.endYear, b.endMonth);
  const out = [];
  for (let idx = lo; idx <= hi; idx += 1) out.push(idx);
  return out;
}
