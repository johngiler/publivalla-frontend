"use client";

import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_HIGH_SEASON_BG,
  CATALOG_MONTH_HIGH_SEASON_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_ACTIVE_BG,
  CATALOG_MONTH_ACTIVE_LABEL,
  CATALOG_MONTH_ACTIVE_RING,
  CATALOG_MONTH_RESERVED_BG,
  CATALOG_MONTH_RESERVED_LABEL,
  CATALOG_MONTH_RESERVED_RING,
  CATALOG_MONTH_SELECTION_LABEL,
  CATALOG_MONTH_BLOCKED_FORBIDDEN_BG,
  CATALOG_MONTH_BLOCKED_FORBIDDEN_LABEL,
  CATALOG_MONTH_BLOCKED_FORBIDDEN_RING,
  CATALOG_MONTH_UNAVAILABLE_BG,
  CATALOG_MONTH_UNAVAILABLE_RING,
} from "@/lib/catalogMonthColors";

const SWATCH = "box-border h-2.5 w-3 shrink-0 rounded-md";

function LegendItem({ swatchClass, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${SWATCH} ${swatchClass}`} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Leyenda unificada de meses (catálogo / reserva).
 * Si cambias ítems o estilos, actualiza todos los consumidores:
 * - SpaceMultiYearMonthRangePicker
 * - SpaceMonthRangePicker
 * - SpaceMonthAvailabilityBar (tooltip apilado)
 */
function ForbiddenLegendIcon({ className = "h-2.5 w-2.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CatalogMonthLegend({
  showSelection = true,
  showReserved = false,
  showActive = false,
  showHighSeason = false,
  showBlockedForbidden = false,
  selectionLabel = CATALOG_MONTH_SELECTION_LABEL,
  stacked = false,
  title = null,
}) {
  const items = (
    <>
      <LegendItem
        swatchClass={`${CATALOG_MONTH_AVAILABLE_BG} ${CATALOG_MONTH_AVAILABLE_RING}`}
        label="Libre"
      />
      {showBlockedForbidden ? (
        <>
          <LegendItem
            swatchClass={`${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING}`}
            label="No disponible"
          />
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`${SWATCH} inline-flex items-center justify-center text-red-700 ${CATALOG_MONTH_BLOCKED_FORBIDDEN_BG} ${CATALOG_MONTH_BLOCKED_FORBIDDEN_RING}`}
              aria-hidden
            >
              <ForbiddenLegendIcon />
            </span>
            {CATALOG_MONTH_BLOCKED_FORBIDDEN_LABEL}
          </span>
        </>
      ) : (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING}`}
          label="No disponible"
        />
      )}
      {showReserved ? (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_RESERVED_BG} ${CATALOG_MONTH_RESERVED_RING}`}
          label={CATALOG_MONTH_RESERVED_LABEL}
        />
      ) : null}
      {showActive ? (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_ACTIVE_BG} ${CATALOG_MONTH_ACTIVE_RING}`}
          label={CATALOG_MONTH_ACTIVE_LABEL}
        />
      ) : null}
      {showSelection ? (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_SELECTED_BG} ${CATALOG_MONTH_SELECTED_RING}`}
          label={selectionLabel}
        />
      ) : null}
      {showHighSeason ? (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_HIGH_SEASON_BG} ${CATALOG_MONTH_HIGH_SEASON_RING}`}
          label="Temporada alta"
        />
      ) : null}
    </>
  );

  if (stacked) {
    return (
      <div>
        {title ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {title}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5 text-xs leading-snug text-zinc-600 sm:text-[13px]">
          {items}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-zinc-500">
      {items}
    </div>
  );
}
