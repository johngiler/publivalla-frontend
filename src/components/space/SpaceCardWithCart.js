"use client";

import { useMemo } from "react";

import { useCart } from "@/context/CartProvider";
import { normalizeRentalSegments } from "@/lib/rentalDates";

import { SpaceCard } from "./SpaceCard";

/**
 * Misma API que `SpaceCard`; marca `inCart` y resalta meses del carrito en el calendario multi-año.
 */
export function SpaceCardWithCart(props) {
  const { items } = useCart();
  const cartIds = useMemo(() => new Set(items.map((i) => String(i.id))), [items]);
  const sid = props.space?.id != null ? String(props.space.id) : "";
  const inCart = sid !== "" && cartIds.has(sid);

  const cartLine = useMemo(
    () => (inCart ? items.find((i) => String(i.id) === sid) : null),
    [inCart, items, sid],
  );

  const cartStartIso =
    cartLine && typeof cartLine.start_date === "string" ? cartLine.start_date : null;
  const cartEndIso = cartLine && typeof cartLine.end_date === "string" ? cartLine.end_date : null;
  const cartRentalSegments = useMemo(
    () => (cartLine ? normalizeRentalSegments(cartLine) : null),
    [cartLine],
  );

  return (
    <SpaceCard
      {...props}
      inCart={inCart}
      cartStartIso={cartStartIso}
      cartEndIso={cartEndIso}
      cartRentalSegments={cartRentalSegments}
    />
  );
}
