"use client";

import { CatalogSpaceLink } from "@/components/catalog/CatalogSpaceLink";

/** @param {Record<string, unknown> | null | undefined} item */
export function lineSpaceId(item) {
  if (item?.ad_space != null && item.ad_space !== "") return item.ad_space;
  if (item?.id != null && item.id !== "") return item.id;
  return null;
}

/** @param {Record<string, unknown> | null | undefined} item */
export function lineSpaceTitle(item) {
  const raw = item?.ad_space_title ?? item?.title ?? "";
  return typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
}

/** @param {Record<string, unknown> | null | undefined} item */
export function lineSpaceCode(item) {
  if (typeof item?.ad_space_code === "string" && item.ad_space_code.trim()) {
    return item.ad_space_code.trim();
  }
  if (typeof item?.code === "string" && item.code.trim()) {
    return item.code.trim();
  }
  const sid = lineSpaceId(item);
  if (sid != null && sid !== "") return `#${sid}`;
  return "Toma";
}

/** @param {Record<string, unknown> | null | undefined} item */
export function lineShoppingCenterName(item) {
  const raw = item?.shopping_center_name ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

/** @param {Record<string, unknown> | null | undefined} item */
export function lineShoppingCenterSubtitle(item) {
  const center = lineShoppingCenterName(item);
  const cityRaw = item?.shopping_center_city ?? "";
  const city = typeof cityRaw === "string" ? cityRaw.trim() : "";
  if (!center && !city) return "";
  if (!city) return center;
  if (!center) return city;
  return `${center} · ${city}`;
}

/**
 * Nombre del EP (enlace), código sin enlace y centro comercial debajo.
 * Sirve para carrito (`title`, `code`, `id`) y pedidos (`ad_space_*`).
 *
 * @param {{ item: Record<string, unknown>; stopPropagation?: boolean }} props
 */
export function MarketplaceLineSpaceHeading({ item, stopPropagation = false }) {
  const title = lineSpaceTitle(item);
  const code = lineSpaceCode(item);
  const centerLine = lineShoppingCenterSubtitle(item);
  const spaceId = lineSpaceId(item);

  return (
    <div className="min-w-0">
      {title ? (
        spaceId != null && spaceId !== "" ? (
          <CatalogSpaceLink
            spaceId={spaceId}
            stopPropagation={stopPropagation}
            className="block text-sm font-semibold leading-snug text-zinc-900"
          >
            {title}
          </CatalogSpaceLink>
        ) : (
          <p className="text-sm font-semibold leading-snug text-zinc-900">{title}</p>
        )
      ) : null}
      <p
        className={`mt-0.5 font-mono text-[13px] font-semibold tabular-nums ${
          title ? "text-zinc-500" : "text-zinc-800"
        }`}
      >
        {code}
      </p>
      {centerLine ? (
        <p className="mt-0.5 text-xs leading-snug text-zinc-500">{centerLine}</p>
      ) : null}
    </div>
  );
}
