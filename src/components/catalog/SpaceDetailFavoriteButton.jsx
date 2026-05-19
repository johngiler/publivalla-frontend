"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { IconHeart } from "@/components/layout/navIcons";
import { useAuth } from "@/context/AuthContext";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { deleteFavorite, MY_FAVORITES_PATH, postFavorite } from "@/services/clientAccountApi";

/**
 * Solo cliente marketplace autenticado. SWR en `/api/me/favorites/` (catálogo: filtro «Mis favoritos»).
 * @param {{ spaceId: number|string; variant?: "overlay"; overlayAlign?: "left" | "right" }} props
 */
export function SpaceDetailFavoriteButton({ spaceId, variant, overlayAlign = "right" }) {
  const { authReady, isClient, accessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const sid = Number(spaceId);
  const key = authReady && isClient && accessToken && Number.isFinite(sid) ? MY_FAVORITES_PATH : null;
  const { data, isLoading, mutate } = useSWR(key, authJsonFetcher);

  const ids = useMemo(
    () => (Array.isArray(data?.favorite_space_ids) ? data.favorite_space_ids.map(Number) : []),
    [data],
  );
  const isFav = Number.isFinite(sid) && ids.includes(sid);

  const toggle = useCallback(async () => {
    if (!Number.isFinite(sid) || !accessToken) return;
    setLocalErr("");
    setBusy(true);
    try {
      if (isFav) {
        await deleteFavorite({ adSpaceId: sid, token: accessToken });
      } else {
        await postFavorite({ ad_space: sid, token: accessToken });
      }
      await mutate();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "No se pudo actualizar favoritos.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, isFav, mutate, sid]);

  if (!authReady || !isClient) {
    return null;
  }

  const label = busy
    ? "Guardando en favoritos…"
    : isFav
      ? "Quitar de favoritos"
      : "Guardar en favoritos";

  const alignEnd = overlayAlign !== "left";
  const inner = (
    <div className={`flex flex-col gap-1 ${alignEnd ? "items-end" : "items-start"}`}>
      <button
        type="button"
        disabled={busy || isLoading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        title={label}
        className={`${ROUNDED_CONTROL} inline-flex min-h-11 min-w-11 items-center justify-center border border-white/25 bg-black/45 p-2.5 text-white shadow-md backdrop-blur-sm transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 ${
          isFav ? "border-rose-300/50 bg-rose-950/55 hover:bg-rose-950/70" : ""
        }`}
        aria-pressed={isFav}
        aria-label={label}
      >
        <IconHeart
          className={`h-6 w-6 shrink-0 ${
            isFav ? "text-rose-300 [&_path]:fill-rose-400 [&_path]:stroke-rose-200" : "text-white [&_path]:stroke-white"
          }`}
        />
      </button>
      {localErr ? (
        <p
          className={`max-w-[min(100%,14rem)] text-xs text-red-200 drop-shadow ${alignEnd ? "text-right" : "text-left"}`}
          role="alert"
        >
          {localErr}
        </p>
      ) : null}
    </div>
  );

  if (variant === "overlay") {
    const pos = overlayAlign === "left" ? "left-3 top-3" : "right-3 top-3";
    return (
      <div className={`pointer-events-auto absolute z-10 ${pos}`}>
        {inner}
      </div>
    );
  }

  return inner;
}
