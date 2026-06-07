import { CURRENT_MONTH_SELECTABLE_UNTIL_DAY } from "@/lib/spaceCalendar";

/**
 * @param {string | undefined | null} isoDate YYYY-MM-DD
 */
export function reservationMonthAnchor(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return null;
  const [y, m] = isoDate.split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m };
}

/**
 * @param {string | undefined | null} isoDate
 * @param {Date} [ref]
 * @returns {{ min: string; max: string } | null}
 */
export function customRentalStartDayBounds(isoDate, ref = new Date()) {
  const anchor = reservationMonthAnchor(isoDate);
  if (!anchor) return null;
  const { year, month } = anchor;
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  const max = `${year}-${pad(month)}-${pad(lastDay)}`;

  const cy = ref.getFullYear();
  const cm = ref.getMonth() + 1;
  const cd = ref.getDate();

  if (year < cy || (year === cy && month < cm)) {
    return null;
  }
  if (year === cy && month === cm) {
    return { min: `${year}-${pad(month)}-${pad(cd)}`, max };
  }
  return { min: `${year}-${pad(month)}-01`, max };
}

/**
 * @param {number} month1to12
 */
export function monthShortEs(month1to12) {
  const labels = [
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
  return labels[month1to12 - 1] ?? "";
}

export { CURRENT_MONTH_SELECTABLE_UNTIL_DAY };
