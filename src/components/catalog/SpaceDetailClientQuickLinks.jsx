"use client";

import Link from "next/link";
import { useMemo } from "react";

import { IconCart, IconLock, IconPay } from "@/components/layout/navIcons";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartProvider";
import { useCatalogSpaceWithClientMonths } from "@/hooks/useCatalogSpaceWithClientMonths";
import {
  cartHrefForSpaceCode,
  contratosHrefForSpaceCode,
  pedidosHrefForSpaceCode,
  spaceClientMonthsHasAny,
  spaceCodeForAccountLinks,
} from "@/lib/marketplaceSpaceAccountLinks";
const linkClass =
  "inline-flex min-h-7 shrink-0 items-center gap-1 rounded-[5px] border border-zinc-200 bg-white px-1.5 py-0.5 text-xs font-semibold leading-tight text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_32%,transparent)]";

/**
 * Accesos desde la ficha de toma a pedidos, contratos o carrito filtrados por código.
 * @param {{ space: Record<string, unknown> }} props
 */
export function SpaceDetailClientQuickLinks({ space }) {
  const { authReady, isClient } = useAuth();
  const { items } = useCart();
  const spaceWithMonths = useCatalogSpaceWithClientMonths(space);

  const code = useMemo(() => spaceCodeForAccountLinks(spaceWithMonths), [spaceWithMonths]);

  const hasReserved = useMemo(
    () => spaceClientMonthsHasAny(spaceWithMonths?.client_months_reserved_by_year),
    [spaceWithMonths],
  );
  const hasActive = useMemo(
    () => spaceClientMonthsHasAny(spaceWithMonths?.client_months_active_by_year),
    [spaceWithMonths],
  );
  const inCart = useMemo(
    () => items.some((i) => String(i.id) === String(spaceWithMonths?.id)),
    [items, spaceWithMonths?.id],
  );

  if (!authReady || !isClient || (!hasReserved && !hasActive && !inCart)) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tu relación con este espacio
      </p>
      <div className="mt-2 flex flex-row flex-wrap gap-1">
        {hasReserved ? (
          <Link href={pedidosHrefForSpaceCode(code)} className={linkClass}>
            <IconPay className="h-3 w-3 shrink-0" aria-hidden />
            Ver en mis pedidos
          </Link>
        ) : null}
        {hasActive ? (
          <Link href={contratosHrefForSpaceCode(code)} className={linkClass}>
            <IconLock className="h-3 w-3 shrink-0" aria-hidden />
            Ver en mis contratos
          </Link>
        ) : null}
        {inCart ? (
          <Link href={cartHrefForSpaceCode(code)} className={linkClass}>
            <IconCart className="h-3 w-3 shrink-0" aria-hidden />
            Ver en el carrito
          </Link>
        ) : null}
      </div>
    </div>
  );
}
