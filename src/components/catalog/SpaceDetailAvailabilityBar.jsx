"use client";

import { useMemo } from "react";

import { SpaceMultiYearAvailabilityBar } from "@/components/catalog/SpaceMultiYearAvailabilityBar";
import { useCart } from "@/context/CartProvider";
import { normalizeRentalSegments } from "@/lib/rentalDates";

/**
 * Calendario multi-año en ficha de detalle (meses en carrito resaltados).
 * @param {{ space: Record<string, unknown>, spaceId?: number | string }} props
 */
export function SpaceDetailAvailabilityBar({ space, spaceId }) {
  const { items } = useCart();
  const id = spaceId ?? space?.id;

  const cartLine = useMemo(
    () => items.find((i) => String(i.id) === String(id)),
    [items, id],
  );

  const cartStartIso =
    cartLine && typeof cartLine.start_date === "string" ? cartLine.start_date : null;
  const cartEndIso = cartLine && typeof cartLine.end_date === "string" ? cartLine.end_date : null;
  const cartRentalSegments = useMemo(
    () => (cartLine ? normalizeRentalSegments(cartLine) : null),
    [cartLine],
  );

  return (
    <div className="relative z-30 min-w-0">
      <SpaceMultiYearAvailabilityBar
        space={space}
        cartStartIso={cartStartIso}
        cartEndIso={cartEndIso}
        cartRentalSegments={cartRentalSegments}
        variant="summary"
        showYearTitle={false}
      />
    </div>
  );
}
