"use client";

import { ROUNDED_CONTROL } from "@/lib/uiRounding";

/** Texto vacío legible en paneles de detalle del acordeón. */
export function adminDetailEmpty(text) {
  const t = text?.trim?.() ?? "";
  if (t) return t;
  return <span className="text-sm text-zinc-400">Sin información</span>;
}

/** Título de acordeón: `{clave}: Centro comercial {nombre}`. */
export function adminShoppingCenterAccordionTitle(slug, name) {
  const key = String(slug || "").trim() || "—";
  const n = String(name || "").trim();
  return n ? `${key}: Centro comercial ${n}` : `${key}: Centro comercial`;
}

/** Título genérico: `{clave}: {tipo de entidad} {nombre}`. */
export function adminAccordionEntityTitle(key, entityLabel, name) {
  const k = String(key || "").trim() || "—";
  const label = String(entityLabel || "").trim();
  const n = String(name || "").trim();
  if (!label) return n || k;
  return n ? `${k}: ${label} ${n}` : `${k}: ${label}`;
}

/** Pastilla (clave) + título sin repetir la clave. */
export function adminAccordionEntityHeader(key, entityLabel, name) {
  const badgeText = String(key || "").trim() || "—";
  const label = String(entityLabel || "").trim();
  const n = String(name || "").trim();
  const title = n ? `${label} ${n}`.trim() : label || badgeText;
  return { badgeText, title };
}

/** Cabecera de centro: pastilla slug, «Centro comercial» arriba y nombre abajo. */
export function adminShoppingCenterAccordionHeader(slug, name) {
  const badgeText = String(slug || "").trim() || "—";
  const n = String(name || "").trim();
  return {
    badgeText,
    titleLabel: "Centro comercial",
    titleLine: n || "—",
  };
}

/** Iniciales para cabecera de usuario (nombre + apellido); «N/A» si faltan ambos. */
export function userDisplayInitials(firstName, lastName) {
  const f = String(firstName ?? "").trim();
  const l = String(lastName ?? "").trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f.length >= 2) return f.slice(0, 2).toUpperCase();
  if (f) return f[0].toUpperCase();
  if (l.length >= 2) return l.slice(0, 2).toUpperCase();
  if (l) return l[0].toUpperCase();
  return "N/A";
}

/** Cabecera de empresa: pastilla RIF, «Empresa» arriba y razón social abajo. */
export function adminCompanyAccordionHeader(rif, companyName) {
  const badgeText = String(rif || "").trim() || "—";
  const n = String(companyName || "").trim();
  return {
    badgeText,
    titleLabel: "Empresa",
    titleLine: n || "—",
  };
}

/** Cabecera de usuario: pastilla iniciales, «Usuario» arriba y nombre de usuario abajo. */
export function adminUserAccordionHeader(firstName, lastName, username, { isSelf = false } = {}) {
  const uname = String(username || "").trim() || "—";
  return {
    badgeText: userDisplayInitials(firstName, lastName),
    titleLabel: "Usuario",
    titleLine: isSelf ? (
      <>
        <span className="truncate">{uname}</span>
        <span className="mp-text-brand ml-1 text-xs font-normal">(tu sesión)</span>
      </>
    ) : (
      uname
    ),
  };
}

/** Cabecera de espacio publicitario: pastilla código, etiqueta arriba y título abajo. */
export function adminAdSpaceAccordionHeader(code, title) {
  const badgeText = String(code || "").trim() || "—";
  const n = String(title || "").trim();
  return {
    badgeText,
    titleLabel: "Espacio publicitario",
    titleLine: n || "—",
  };
}

/** Cabecera de proveedor de montaje: pastilla RIF, etiqueta arriba y razón social abajo. */
export function adminMountingProviderAccordionHeader(rif, companyName) {
  const badgeText = String(rif || "").trim() || "—";
  const n = String(companyName || "").trim();
  return {
    badgeText,
    titleLabel: "Proveedor de montaje",
    titleLine: n || "—",
  };
}

/** Cabecera de bloqueo: pastilla código EPS, etiqueta arriba y título del espacio abajo. */
export function adminAvailabilityBlockAccordionHeader(code, spaceTitle) {
  const badgeText = String(code || "").trim() || "—";
  const n = String(spaceTitle || "").trim();
  return {
    badgeText,
    titleLabel: "Bloqueo de disponibilidad",
    titleLine: n || "—",
  };
}

/** Cabecera de pedido: pastilla referencia, etiqueta arriba y empresa abajo. */
export function adminOrderAccordionHeader(orderRef, clientName) {
  const badgeText = String(orderRef || "").trim() || "—";
  const n = String(clientName || "").trim();
  return {
    badgeText,
    titleLabel: "Pedido",
    titleLine: n || "—",
  };
}

/** Cabecera de línea de contrato: pastilla código EPS, etiqueta arriba y título abajo. */
export function adminContractAccordionHeader(spaceCode, spaceTitle) {
  const badgeText = String(spaceCode || "").trim() || "—";
  const n = String(spaceTitle || "").trim();
  return {
    badgeText,
    titleLabel: "Línea de contrato",
    titleLine: n || "—",
  };
}

/** Fila de tabla: panel expandido a todo el ancho de la tabla (`colSpan` = número de columnas). */
export function AdminAccordionRowPanel({ colSpan, panelId, children }) {
  return (
    <tr className="border-b border-zinc-100">
      <td
        colSpan={colSpan}
        className="bg-zinc-50/90 p-4 sm:p-5"
        id={panelId}
        role="region"
      >
        <div
          className={`w-full ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-100/70 sm:p-6`}
        >
          {children}
        </div>
      </td>
    </tr>
  );
}

/**
 * Cabecera del acordeón: pastilla con clave + título (`Centro comercial …`).
 * @param {{
 *   badgeText?: string,
 *   title?: string | React.ReactNode,
 *   titleLine?: React.ReactNode,
 *   titleLabel?: string,
 *   embedded?: boolean,
 * }} props
 */
export function AdminAccordionDetailHeader({
  badgeText,
  title,
  titleLine,
  titleLabel,
  embedded = false,
}) {
  const showBadge = badgeText != null && String(badgeText).trim() !== "";
  const line = titleLine ?? title;
  if (!showBadge && line == null && !titleLabel) return null;

  return (
    <header
      className={`flex w-full max-w-none items-center gap-3 ${embedded ? "" : "border-b border-zinc-100 pb-4"}`}
    >
      {showBadge ? (
        <span className="inline-flex shrink-0 items-center rounded-[10px] bg-zinc-900 px-3 py-1.5 font-mono text-sm font-semibold text-white tabular-nums">
          {String(badgeText).trim()}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        {titleLabel ? (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {titleLabel}
          </p>
        ) : null}
        {line != null ? (
          typeof line === "string" ? (
            <p className="truncate text-sm font-medium text-zinc-900">{line}</p>
          ) : (
            line
          )
        ) : null}
      </div>
    </header>
  );
}

export function AdminDetailSection({ panelId, sectionId, title, children }) {
  const sid = `${panelId}-${sectionId}`;
  return (
    <section className="space-y-4" aria-labelledby={sid}>
      <h3
        id={sid}
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0b7aa8]"
      >
        <span className="mp-bg-dot-brand h-2 w-2 shrink-0 rounded-full" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function AdminDetailInset({ className = "", children }) {
  return (
    <div className={`space-y-4 rounded-[12px] bg-zinc-50/80 p-4 ring-1 ring-zinc-100/80 ${className}`}>
      {children}
    </div>
  );
}

export function AdminDetailField({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-zinc-800">{children}</div>
    </div>
  );
}

/** Caja ancha para párrafos largos (descripción, notas). */
export function AdminDetailProse({ text, emptyHint }) {
  const t = text?.trim();
  return (
    <div className="mt-3 min-h-[3rem] rounded-[12px] bg-zinc-50/60 p-4 text-sm leading-relaxed text-zinc-700 ring-1 ring-zinc-100/80">
      {t ? <p className="whitespace-pre-wrap">{t}</p> : <p className="text-zinc-400">{emptyHint}</p>}
    </div>
  );
}
