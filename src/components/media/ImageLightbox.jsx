"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { rasterUrlTryWebpVariant } from "@/lib/mediaUrls";

/** `<img>` con un reintento a `.webp` si la URL raster del API falla (migración de medios). */
function RasterImageWithWebpFallback({ initialSrc, onGiveUp, ...imgProps }) {
  const [src, setSrc] = useState(initialSrc);
  useEffect(() => {
    setSrc(initialSrc);
  }, [initialSrc]);
  return (
    <img
      key={src}
      {...imgProps}
      src={src}
      onError={() => {
        const w = rasterUrlTryWebpVariant(src);
        if (w && w !== src) {
          setSrc(w);
          return;
        }
        onGiveUp();
      }}
    />
  );
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/** Evita acumulación de error flotante en pasos de zoom. */
function snapZoom(s) {
  return clamp(Number(s.toFixed(2)), MIN_ZOOM, MAX_ZOOM);
}

function IcClose({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IcChevronLeft({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcChevronRight({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcZoomIn({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35M11 8v6M8 11h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcZoomOut({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35M8 11h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcResetView({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8V4h4M20 16v4h-4M4 4l5 5m10 10l-5-5m5 5l5-5M4 20l5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcDownload({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0l4-4m-4 4L8 12M4 20h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolbarIconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-500/80 bg-zinc-800/90 text-zinc-100 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** Misma URL que la vista principal (evita WebP inexistente en artes de pedido). */
function lightboxThumbUrl(it) {
  if (!it || typeof it.src !== "string" || !it.src) return "";
  return it.src;
}

/** Oculta la entrada solo si falló la imagen principal (no la miniatura del carril). */
function lightboxItemExcluded(it, failedUrls) {
  if (!it?.src) return true;
  return failedUrls.has(it.src);
}

/**
 * Visor modal de una o varias imágenes: zoom, desplazamiento, anterior/siguiente, miniaturas y descarga opcionales.
 *
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   items: Array<{ src: string; alt?: string; thumbnailSrc?: string; downloadFileName?: string }>;
 *   initialIndex?: number;
 *   showDownload?: boolean;
 *   showThumbnails?: boolean;
 *   loop?: boolean;
 *   ariaLabel?: string;
 * }} props
 */
export function ImageLightbox({
  open,
  onClose,
  items,
  initialIndex = 0,
  showDownload = false,
  showThumbnails = false,
  loop = true,
  ariaLabel = "Visor de imágenes",
}) {
  const safeItems = useMemo(
    () => (Array.isArray(items) ? items.filter((it) => it && typeof it.src === "string" && it.src) : []),
    [items],
  );
  const itemsSignature = useMemo(
    () => (Array.isArray(items) ? items.map((x) => (x && x.src) || "").join("\u0001") : ""),
    [items],
  );

  const [failedUrls, setFailedUrls] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [panning, setPanning] = useState(false);
  const panRef = useRef(null);

  const visibleItems = useMemo(
    () => safeItems.filter((it) => !lightboxItemExcluded(it, failedUrls)),
    [safeItems, failedUrls],
  );
  const count = visibleItems.length;

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  useEffect(() => {
    setFailedUrls(new Set());
  }, [open, itemsSignature]);

  useEffect(() => {
    if (!open) return;
    const i = clamp(initialIndex, 0, Math.max(0, safeItems.length - 1));
    setIndex(i);
    resetView();
  }, [open, initialIndex, safeItems.length, resetView]);

  useLayoutEffect(() => {
    if (!open || visibleItems.length === 0) return;
    const d = clamp(index, 0, visibleItems.length - 1);
    if (d !== index) setIndex(d);
  }, [open, visibleItems.length, index]);

  useEffect(() => {
    if (!open) return;
    resetView();
  }, [index, open, resetView]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => {
      const ci = clamp(i, 0, Math.max(0, count - 1));
      if (ci <= 0) return loop ? count - 1 : 0;
      return ci - 1;
    });
  }, [count, loop]);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setIndex((i) => {
      const ci = clamp(i, 0, Math.max(0, count - 1));
      if (ci >= count - 1) return loop ? 0 : count - 1;
      return ci + 1;
    });
  }, [count, loop]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (count <= 1) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, count, goPrev, goNext]);

  const markUrlFailed = useCallback((url) => {
    if (!url) return;
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const n = new Set(prev);
      n.add(url);
      return n;
    });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => snapZoom(s + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => snapZoom(s - ZOOM_STEP));
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((s) => snapZoom(s + delta));
  }, []);

  const onPointerDownViewport = useCallback(
    (e) => {
      if (e.button !== 0) return;
      const t = e.target;
      if (t instanceof Element && t.closest("[data-lightbox-toolbar]")) return;
      if (scale <= 1) return;
      setPanning(true);
      panRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origTx: tx,
        origTy: ty,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [scale, tx, ty],
  );

  const onPointerMoveViewport = useCallback((e) => {
    const p = panRef.current;
    if (!p || p.id !== e.pointerId) return;
    setTx(p.origTx + (e.clientX - p.startX));
    setTy(p.origTy + (e.clientY - p.startY));
  }, []);

  const onPointerUpViewport = useCallback((e) => {
    const p = panRef.current;
    if (p && p.id === e.pointerId) {
      panRef.current = null;
      setPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!open || count === 0) return null;

  /** Índice acotado: el estado puede quedar fuera de rango un frame al reabrir o si `items` se filtra distinto. */
  const displayIndex = clamp(index, 0, count - 1);
  const current = visibleItems[displayIndex];
  if (!current || typeof current.src !== "string" || !current.src) return null;
  const atStart = displayIndex <= 0;
  const atEnd = displayIndex >= count - 1;
  const prevDisabled = !loop && atStart;
  const nextDisabled = !loop && atEnd;
  const canPan = scale > 1;
  const viewIsDefault =
    Math.abs(scale - 1) < 0.001 && Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5;

  const overlay = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar visor"
        onClick={onClose}
      />

      <div
        className="relative z-[81] flex max-h-[min(94vh,920px)] w-full max-w-5xl flex-col overflow-hidden bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3">
          <ToolbarIconButton label="Cerrar visor" onClick={onClose}>
            <IcClose />
          </ToolbarIconButton>
        </div>

        <div
          className={`relative min-h-[min(52vh,420px)] flex-1 touch-none overflow-hidden bg-zinc-900/95 sm:min-h-[min(60vh,520px)] ${
            canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          onWheel={onWheel}
          onPointerDown={onPointerDownViewport}
          onPointerMove={onPointerMoveViewport}
          onPointerUp={onPointerUpViewport}
          onPointerCancel={onPointerUpViewport}
        >
          <div className="flex h-full w-full items-center justify-center p-4 pt-12 sm:pt-5">
            <div
              className="will-change-transform"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transition: panning ? "none" : "transform 0.1s ease-out",
              }}
            >
              <RasterImageWithWebpFallback
                initialSrc={current.src}
                onGiveUp={() => markUrlFailed(current.src)}
                alt={current.alt || `Imagen ${displayIndex + 1} de ${count}`}
                className="max-h-[min(70vh,640px)] max-w-full select-none object-contain"
                draggable={false}
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4">
            <div
              data-lightbox-toolbar
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-zinc-600/80 bg-zinc-950/95 px-2 py-1.5 shadow-xl backdrop-blur-md sm:gap-2 sm:px-3"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              {count > 1 ? (
                <>
                  <ToolbarIconButton label="Imagen anterior" onClick={goPrev} disabled={prevDisabled}>
                    <IcChevronLeft />
                  </ToolbarIconButton>
                  {!showThumbnails ? (
                    <div
                      className="mx-0.5 flex max-w-[min(12rem,40vw)] items-center justify-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      role="tablist"
                      aria-label="Seleccionar imagen"
                    >
                      {visibleItems.map((_, i) => (
                        <button
                          key={`dot-${i}`}
                          type="button"
                          role="tab"
                          aria-selected={i === displayIndex}
                          aria-label={`Imagen ${i + 1} de ${count}`}
                          onClick={() => setIndex(i)}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full transition ${
                            i === displayIndex
                              ? "scale-110 bg-[color-mix(in_srgb,var(--mp-primary)_88%,#171717)] ring-2 ring-[color-mix(in_srgb,var(--mp-primary)_55%,transparent)]"
                              : "bg-zinc-600 hover:bg-zinc-500"
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              <ToolbarIconButton label="Alejar" onClick={zoomOut} disabled={scale <= MIN_ZOOM + 0.001}>
                <IcZoomOut />
              </ToolbarIconButton>
              <ToolbarIconButton label="Acercar" onClick={zoomIn} disabled={scale >= MAX_ZOOM - 0.001}>
                <IcZoomIn />
              </ToolbarIconButton>
              <ToolbarIconButton
                label="Ajustar vista"
                onClick={resetView}
                disabled={viewIsDefault}
              >
                <IcResetView />
              </ToolbarIconButton>
              {count > 1 ? (
                <ToolbarIconButton label="Imagen siguiente" onClick={goNext} disabled={nextDisabled}>
                  <IcChevronRight />
                </ToolbarIconButton>
              ) : null}
              {showDownload ? (
                <a
                  href={current.src}
                  download={current.downloadFileName || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Descargar imagen"
                  title="Descargar imagen"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-500/80 bg-zinc-800/90 text-zinc-100 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-700"
                >
                  <IcDownload />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {showThumbnails && count > 1 ? (
          <div className="bg-zinc-900 px-2 py-2 sm:px-3" data-lightbox-toolbar>
            {/* Padding extra: el ring + ring-offset quedan fuera del botón; sin esto el overflow-x del carril los recorta. */}
            <div className="flex gap-2 overflow-x-auto px-2.5 py-2 [scrollbar-width:thin]">
              {visibleItems.map((it, i) => (
                <button
                  key={`${it.src}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Mostrar imagen ${i + 1}`}
                  aria-current={i === displayIndex ? "true" : undefined}
                  className={`relative h-[100px] w-[100px] shrink-0 rounded-[10px] transition outline-none ${
                    i === displayIndex
                      ? "z-[1] ring-2 ring-[color-mix(in_srgb,var(--mp-primary)_88%,#171717)] ring-offset-2 ring-offset-zinc-900 opacity-100"
                      : "opacity-75 hover:opacity-100"
                  }`}
                >
                  <span className="block h-full w-full overflow-hidden rounded-[10px]">
                    {/* Sin reintento WebP: misma URL raster que la imagen grande. */}
                    <img
                      src={lightboxThumbUrl(it)}
                      alt=""
                      width={100}
                      height={100}
                      className="h-full w-full object-cover"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
