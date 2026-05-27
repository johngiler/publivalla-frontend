"use client";

import { AdminSelect } from "@/components/admin/AdminSelect";

function FilterResetIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** Etiquetas de filtros (misma jerarquía que chips de portada). */
const filterLabelClass =
  "mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400";

const searchInputClass =
  "mp-admin-field-brand mt-0 w-full min-h-[40px] rounded-xl border border-zinc-200/90 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-zinc-400 focus:bg-white focus:outline-none";

function SearchIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string} [props.placeholder]
 */
export function AdminFilterSearchInput({
  id,
  value,
  onChange,
  placeholder = "Buscar…",
  className = "",
}) {
  return (
    <div className={`min-w-0 flex-1 sm:min-w-[12rem] ${className}`.trim()}>
      <label htmlFor={id} className={filterLabelClass}>
        Buscar
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <SearchIcon className="block" />
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={searchInputClass}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.label
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {Array<{ v: string, l: string }>} props.options
 */
export function AdminFilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="w-full min-w-[min(100%,220px)] sm:w-auto sm:min-w-[220px] sm:max-w-[300px]">
      <label htmlFor={id} className={filterLabelClass}>
        {label}
      </label>
      <AdminSelect
        id={id}
        inputId={id}
        options={options}
        value={value}
        onChange={(v) => onChange(v == null ? "" : String(v))}
        placeholder="Seleccionar…"
        isSearchable={options.length > 8}
        className="[&_.admin-rs__control]:min-h-[40px] [&_.admin-rs__control]:rounded-xl"
      />
    </div>
  );
}

const filterClearActionBase =
  "mp-ring-brand group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow,background-color,color,transform] hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none active:scale-[0.98] sm:min-h-9 sm:py-1.5 sm:pl-2.5 sm:pr-3";

/**
 * Acción secundaria con icono (portada, calendario de meses, estados vacíos, admin).
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {string} [props.className]
 * @param {string} [props.label]
 */
export function FilterClearAction({ onClick, className = "", label = "Limpiar filtros" }) {
  return (
    <button type="button" onClick={onClick} className={`${filterClearActionBase} ${className}`}>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100/90 text-zinc-500 transition-colors group-hover:bg-[color-mix(in_srgb,var(--mp-primary)_12%,#f4f4f5)] group-hover:text-[color:var(--mp-primary)]"
        aria-hidden
      >
        <FilterResetIcon className="block h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Misma acción que {@link FilterClearAction}, alineada con la fila de filtros del admin.
 * Solo se muestra cuando hay filtros aplicados (`show`).
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {boolean} [props.show]
 */
export function AdminFilterClearButton({ onClick, show = true }) {
  if (!show) return null;
  return (
    <div className="flex w-full min-w-0 flex-col justify-end sm:w-auto">
      <span className={filterLabelClass} aria-hidden>
        &nbsp;
      </span>
      <FilterClearAction onClick={onClick} className="w-full justify-center sm:w-auto sm:justify-start" />
    </div>
  );
}

/**
 * Listados admin: mostrar filtros solo si hay registros o hay filtros activos (para poder limpiar).
 * @param {number} totalCount
 * @param {boolean} [filtersActive]
 */
export function shouldShowAdminListFilters(totalCount, filtersActive = false) {
  return totalCount > 0 || Boolean(filtersActive);
}

/** Contenedor de filtros encima de la tabla. */
export function AdminFiltersRow({ children, className = "" }) {
  return (
    <div
      className={`group mb-5 mt-5 flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] duration-200 hover:border-zinc-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.07)] ${className}`.trim()}
    >
      <div className="mp-admin-filters-top-accent" aria-hidden />
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4 sm:flex-row sm:flex-nowrap sm:items-end sm:gap-x-4 sm:gap-y-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {number} props.shown
 * @param {number} props.total
 * @param {string} props.noun — p. ej. «centros»
 */
export function AdminFilterResultHint({ shown, total, noun }) {
  if (shown === total) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm">
      <span className="mp-bg-dot-brand inline-block size-1.5 shrink-0 rounded-full" aria-hidden />
      Mostrando <span className="tabular-nums font-semibold text-zinc-800">{shown}</span> de{" "}
      <span className="tabular-nums font-semibold text-zinc-800">{total}</span> {noun}
    </p>
  );
}
