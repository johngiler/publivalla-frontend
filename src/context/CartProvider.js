"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { sanitizeCartItems } from "@/lib/demoCatalog";
import { normalizeRentalBillingUnit } from "@/lib/rentalBilling";
import { defaultRentalPeriod, normalizeRentalSegments } from "@/lib/rentalDates";
import {
  adSpaceGalleryUrlsForUi,
  normalizeMediaUrlForUi,
  spaceCoverUrlForUi,
} from "@/lib/mediaUrls";
import { getSpace } from "@/services/api";
import { storageKeySuffix } from "@/lib/tenant";

function cartLineHasUsableMedia(item) {
  if (!item || typeof item !== "object") return false;
  if (normalizeMediaUrlForUi(item.cover_image)) return true;
  if (
    Array.isArray(item.gallery_images) &&
    item.gallery_images.some(
      (u) => typeof u === "string" && u.trim() && normalizeMediaUrlForUi(u),
    )
  ) {
    return true;
  }
  return false;
}

/** Portada + galería para persistir en la línea del carrito (mismas reglas WebP que el catálogo). */
function coverAndGalleryFromSpace(space) {
  const galleryNormalized = adSpaceGalleryUrlsForUi(space);
  const coverUrl = spaceCoverUrlForUi(space) || galleryNormalized[0] || "";
  return { coverUrl, galleryNormalized };
}

const LEGACY_CART = "publivalla-marketplace-cart";
const LEGACY_PERIOD = "publivalla-marketplace-rental";

function cartStorageKey() {
  return `mp_cart_${storageKeySuffix()}`;
}

function periodStorageKey() {
  return `mp_rental_${storageKeySuffix()}`;
}

function clearLegacyCartKeys() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_CART);
    localStorage.removeItem(LEGACY_PERIOD);
  } catch {
    /* ignore */
  }
}

function readStorage() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartStorageKey());
    const arr = raw ? JSON.parse(raw) : [];
    return sanitizeCartItems(arr);
  } catch {
    return [];
  }
}

function writeStorage(items) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    cartStorageKey(),
    JSON.stringify(sanitizeCartItems(items)),
  );
}

/** Período global antiguo: se copia a cada línea sin fechas y luego se deja de usar. */
function readLegacyPeriod() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(periodStorageKey());
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.start_date && p?.end_date) return p;
  } catch {
    /* fallthrough */
  }
  return null;
}

function migrateItemsWithLegacyPeriod(items, legacy) {
  const fallback =
    legacy?.start_date && legacy?.end_date ? legacy : defaultRentalPeriod();
  return items.map((i) => {
    if (typeof i.start_date === "string" && typeof i.end_date === "string") {
      const segs = normalizeRentalSegments(i);
      if (segs.length && !Array.isArray(i.rental_segments)) {
        return { ...i, rental_segments: segs };
      }
      return i;
    }
    return {
      ...i,
      start_date: fallback.start_date,
      end_date: fallback.end_date,
      rental_segments: [{ start_date: fallback.start_date, end_date: fallback.end_date }],
    };
  });
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const mediaHydrateAttemptedRef = useRef(new Set());

  useEffect(() => {
    clearLegacyCartKeys();
    const legacy = readLegacyPeriod();
    let loaded = readStorage();
    const migrated = migrateItemsWithLegacyPeriod(loaded, legacy);
    if (JSON.stringify(migrated) !== JSON.stringify(loaded)) {
      writeStorage(migrated);
    }
    try {
      localStorage.removeItem(periodStorageKey());
    } catch {
      /* ignore */
    }
    setItems(migrated);
  }, []);

  /** Líneas guardadas sin media: una petición por id para rellenar portada/galería. */
  useEffect(() => {
    if (typeof window === "undefined" || !items.length) return;

    const targets = items.filter((i) => {
      if (cartLineHasUsableMedia(i)) return false;
      const sid = String(i.id);
      if (mediaHydrateAttemptedRef.current.has(sid)) return false;
      return true;
    });
    if (!targets.length) return;

    let cancelled = false;

    (async () => {
      for (const line of targets) {
        const sid = String(line.id);
        try {
          const space = await getSpace(line.id);
          if (cancelled) return;
          const { coverUrl, galleryNormalized } =
            coverAndGalleryFromSpace(space);
          mediaHydrateAttemptedRef.current.add(sid);
          if (!coverUrl && galleryNormalized.length === 0) continue;

          setItems((prev) => {
            const next = prev.map((x) =>
              String(x.id) === sid
                ? {
                    ...x,
                    ...(coverUrl ? { cover_image: coverUrl } : {}),
                    ...(galleryNormalized.length > 0
                      ? { gallery_images: galleryNormalized }
                      : {}),
                  }
                : x,
            );
            writeStorage(next);
            return next;
          });
        } catch {
          /* sin add a ref: permite reintentar si cambia items */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const addItem = useCallback((space, range) => {
    const segs = normalizeRentalSegments(range);
    if (!segs.length) return;
    const start_date = range?.start_date ?? segs[0].start_date;
    const end_date = range?.end_date ?? segs[segs.length - 1].end_date;
    const detailLine =
      typeof space.venue_zone === "string" && space.venue_zone.trim() !== ""
        ? space.venue_zone.trim()
        : typeof space.location_description === "string" &&
            space.location_description.trim() !== ""
          ? space.location_description.trim()
          : typeof space.type === "string"
            ? space.type
            : "";
    const centerName =
      typeof space.shopping_center_name === "string"
        ? space.shopping_center_name.trim()
        : "";
    const { coverUrl, galleryNormalized } = coverAndGalleryFromSpace(space);

    setItems((prev) => {
      const base = prev.length ? prev : readStorage();
      const next = base
        .filter((x) => x.id !== space.id)
        .concat([
          {
            id: space.id,
            code: space.code,
            title: space.title,
            monthly_price_usd: String(space.monthly_price_usd),
            ...(Array.isArray(space.high_season_months)
              ? { high_season_months: space.high_season_months }
              : {}),
            ...(space.high_season_multiplier != null
              ? { high_season_multiplier: space.high_season_multiplier }
              : {}),
            rental_billing_unit: normalizeRentalBillingUnit(space.rental_billing_unit),
            start_date,
            end_date,
            rental_segments: segs,
            ...(centerName ? { shopping_center_name: centerName } : {}),
            ...(detailLine ? { detail_line: detailLine } : {}),
            ...(coverUrl ? { cover_image: coverUrl } : {}),
            ...(galleryNormalized.length > 0
              ? { gallery_images: galleryNormalized }
              : {}),
          },
        ]);
      writeStorage(next);
      return next;
    });
  }, []);

  const updateItemDates = useCallback((id, range) => {
    const segs = normalizeRentalSegments(range);
    if (!segs.length) return;
    const start_date = range?.start_date ?? segs[0].start_date;
    const end_date = range?.end_date ?? segs[segs.length - 1].end_date;
    setItems((prev) => {
      const next = prev.map((x) =>
        x.id === id
          ? { ...x, start_date, end_date, rental_segments: segs }
          : x,
      );
      writeStorage(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateItemDates,
      removeItem,
      clear,
    }),
    [items, addItem, updateItemDates, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
