"use client";

import { useEffect, useRef } from "react";

import { IconClose } from "@/components/layout/navIcons";

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  /** Ancho máximo Tailwind (p. ej. `max-w-6xl`); sustituye `wide` si se indica. */
  maxWidthClass,
  labelledById = "admin-modal-title",
  /** Si es false, no se cierra con Escape, clic fuera ni botón X (p. ej. operación en curso). */
  canClose = true,
}) {
  const panelRef = useRef(null);

  const tryClose = () => {
    if (canClose) onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && canClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, canClose]);

  useEffect(() => {
    if (open && panelRef.current) {
      const el = panelRef.current.querySelector("input, select, textarea, button");
      el?.focus?.();
    }
  }, [open]);

  if (!open) return null;

  const widthClass = maxWidthClass ?? (wide ? "max-w-2xl" : "max-w-lg");

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        className={`mp-admin-modal relative z-10 flex max-h-[min(92dvh,880px)] w-full flex-col overflow-hidden rounded-[10px] border border-zinc-200/90 bg-white shadow-2xl shadow-slate-900/15 ${widthClass}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 py-4 pl-5 pr-1.5">
          <div className="min-w-0">
            <h2 id={labelledById} className="text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="-mr-0.5 shrink-0 rounded-[10px] p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Cerrar ventana"
            onClick={tryClose}
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
