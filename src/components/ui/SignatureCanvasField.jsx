"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

/**
 * @typedef {object} SignatureCanvasHandle
 * @property {() => boolean} isEmpty
 * @property {() => void} clear
 * @property {() => Promise<Blob | null>} toBlob
 */

/**
 * @param {{
 *   id: string;
 *   onEmptyChange?: (empty: boolean) => void;
 * }} props
 * @param {React.Ref<SignatureCanvasHandle>} ref
 */
export const SignatureCanvasField = forwardRef(function SignatureCanvasField(
  { id, onEmptyChange },
  ref,
) {
  const padRef = useRef(/** @type {SignatureCanvas | null} */ (null));

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    clear: () => {
      padRef.current?.clear();
      onEmptyChange?.(true);
    },
    toBlob: () =>
      new Promise((resolve) => {
        const canvas = padRef.current?.getCanvas();
        if (!canvas) {
          resolve(null);
          return;
        }
        canvas.toBlob((blob) => resolve(blob), "image/png");
      }),
  }));

  const syncEmpty = () => {
    onEmptyChange?.(padRef.current?.isEmpty() ?? true);
  };

  return (
    <div className="space-y-2">
      <label className={labelClass} htmlFor={id}>
        Dibuja tu firma
      </label>
      <div
        className={`relative overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200 bg-white ring-1 ring-zinc-100/80`}
      >
        <SignatureCanvas
          ref={padRef}
          canvasProps={{
            id,
            className: "block h-40 w-full touch-none cursor-crosshair",
            "aria-label": "Área para dibujar tu firma",
          }}
          penColor="#111827"
          minWidth={1.2}
          maxWidth={2.4}
          onBegin={syncEmpty}
          onEnd={syncEmpty}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-8 mx-6 border-b border-zinc-300" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-snug text-zinc-500">
          Usa el mouse o el dedo sobre el recuadro. Al confirmar, tu firma se
          incorporará a la hoja de negociación.
        </p>
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            onEmptyChange?.(true);
          }}
          className="shrink-0 text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
});
