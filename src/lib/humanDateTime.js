/**
 * Fechas/horas legibles en español (Hoy, Ayer, hace X minutos, etc.).
 * Para fechas de negocio (solo día, periodos de alquiler) usar formatContractDay u otras utilidades.
 */

const DEFAULT_LOCALE = "es-VE";

function parseDate(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : d;
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function localDayDiff(fromDay, toDay) {
  return Math.round((toDay.getTime() - fromDay.getTime()) / 86400000);
}

function formatTimeShort(d, locale) {
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatAbsoluteDateTime(d, locale) {
  return d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

function weekdayLabel(d, locale) {
  const name = d.toLocaleDateString(locale, { weekday: "long" });
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Fecha y hora completas (tooltip, atributo title).
 *
 * @param {string | Date | null | undefined} value
 * @param {{ empty?: string; locale?: string }} [options]
 */
export function formatDateTimeFull(value, options = {}) {
  const { empty = "—", locale = DEFAULT_LOCALE } = options;
  const d = parseDate(value);
  if (!d) return value != null && value !== "" ? String(value) : empty;
  return formatAbsoluteDateTime(d, locale);
}

/**
 * @param {string | Date | null | undefined} value
 * @param {{ empty?: string; now?: Date; locale?: string }} [options]
 */
export function formatHumanDateTime(value, options = {}) {
  const { empty = "—", now = new Date(), locale = DEFAULT_LOCALE } = options;
  const d = parseDate(value);
  if (!d) return value != null && value !== "" ? String(value) : empty;

  const todayStart = startOfLocalDay(now);
  const dateStart = startOfLocalDay(d);
  const dayDiff = localDayDiff(dateStart, todayStart);
  const diffMs = now.getTime() - d.getTime();
  const time = formatTimeShort(d, locale);

  if (diffMs < 0) {
    const futureDays = -dayDiff;
    if (futureDays === 0) return `Hoy, ${time}`;
    if (futureDays === 1) return `Mañana, ${time}`;
    if (futureDays < 7) {
      const wd = weekdayLabel(d, locale);
      return wd ? `${wd}, ${time}` : formatAbsoluteDateTime(d, locale);
    }
    return formatAbsoluteDateTime(d, locale);
  }

  if (dayDiff === 0) {
    const sec = Math.floor(diffMs / 1000);
    if (sec < 45) return "Hace un momento";
    const min = Math.floor(sec / 60);
    if (min < 60) return min === 1 ? "Hace 1 minuto" : `Hace ${min} minutos`;
    const hr = Math.floor(min / 60);
    if (hr < 12) return hr === 1 ? "Hace 1 hora" : `Hace ${hr} horas`;
    return `Hoy, ${time}`;
  }

  if (dayDiff === 1) return `Ayer, ${time}`;

  if (dayDiff < 7) {
    return `Hace ${dayDiff} días`;
  }

  return formatAbsoluteDateTime(d, locale);
}

/**
 * Props para `<time>`: texto humanizado y title con fecha completa.
 *
 * @param {string | Date | null | undefined} value
 * @param {{ empty?: string; now?: Date; locale?: string }} [options]
 */
export function humanDateTimeTimeProps(value, options = {}) {
  const d = parseDate(value);
  if (!d) {
    const empty = options.empty ?? "—";
    return { dateTime: undefined, title: undefined, children: empty };
  }
  const iso =
    typeof value === "string" && value.trim()
      ? value.trim()
      : d.toISOString();
  return {
    dateTime: iso,
    title: formatDateTimeFull(d, options),
    children: formatHumanDateTime(d, options),
  };
}
