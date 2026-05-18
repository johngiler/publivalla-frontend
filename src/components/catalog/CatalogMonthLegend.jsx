"use client";

import {
  CATALOG_MONTH_AVAILABLE_BG,
  CATALOG_MONTH_AVAILABLE_RING,
  CATALOG_MONTH_HIGH_SEASON_BG,
  CATALOG_MONTH_HIGH_SEASON_RING,
  CATALOG_MONTH_SELECTED_BG,
  CATALOG_MONTH_SELECTED_RING,
  CATALOG_MONTH_SELECTION_LABEL,
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
export function CatalogMonthLegend({
  showSelection = true,
  showHighSeason = false,
  stacked = false,
  title = null,
}) {
  const items = (
    <>
      <LegendItem
        swatchClass={`${CATALOG_MONTH_AVAILABLE_BG} ${CATALOG_MONTH_AVAILABLE_RING}`}
        label="Libre"
      />
      <LegendItem
        swatchClass={`${CATALOG_MONTH_UNAVAILABLE_BG} ${CATALOG_MONTH_UNAVAILABLE_RING}`}
        label="No disponible"
      />
      {showSelection ? (
        <LegendItem
          swatchClass={`${CATALOG_MONTH_SELECTED_BG} ${CATALOG_MONTH_SELECTED_RING}`}
          label={CATALOG_MONTH_SELECTION_LABEL}
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
