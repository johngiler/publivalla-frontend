"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { adminLabel } from "@/components/admin/adminFormStyles";
import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import { squareListImagePreviewFrameClass, squareListImagePreviewImgClass } from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { mediaAbsoluteUrl } from "@/services/authApi";

const MAX_ITEMS = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function UploadIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3M17 8l-5-5-5 5M12 3v12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function validateImageFile(file) {
  if (file.size > MAX_BYTES) return "Cada imagen no puede superar 10 MB.";
  const okType =
    (file.type && ACCEPT.split(",").some((t) => t.trim() === file.type)) ||
    /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (!okType) return "Usa JPG, PNG, WebP o GIF.";
  return "";
}

/**
 * Galería de imágenes de toma (admin): varias imágenes, arrastrar para ordenar, drop y selección múltiple.
 * Expone `getPayload()` → `{ plan: string[][], newFiles: File[] }` para `gallery_plan` + `gallery_add`.
 */
export const AdminAdSpaceGalleryField = forwardRef(function AdminAdSpaceGalleryField(
  { readOnly = false, initialServerImages = [] },
  ref,
) {
  const [items, setItems] = useState([]);
  const [dragKey, setDragKey] = useState(null);
  const dragKeyRef = useRef(null);
  const [zoneDrag, setZoneDrag] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const sorted = [...(initialServerImages || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    setItems(
      sorted.map((row) => ({
        kind: "server",
        key: `s-${row.id}`,
        id: row.id,
        rawImage: row.image,
        src: mediaAbsoluteUrl(row.image),
      })),
    );
    setErr("");
  }, [initialServerImages]);

  const getPayload = useCallback(() => {
    const plan = [];
    const newFiles = [];
    for (const it of items) {
      if (it.kind === "server") {
        plan.push(["e", it.id]);
      } else {
        plan.push(["n", newFiles.length]);
        newFiles.push(it.file);
      }
    }
    return { plan, newFiles };
  }, [items]);

  useImperativeHandle(ref, () => ({ getPayload }), [getPayload]);

  const addFiles = useCallback(
    (fileList) => {
      const arr = Array.from(fileList || []).filter(Boolean);
      if (!arr.length) return;
      setErr("");
      setItems((prev) => {
        let next = [...prev];
        for (const file of arr) {
          if (next.length >= MAX_ITEMS) {
            setErr(`Máximo ${MAX_ITEMS} imágenes.`);
            break;
          }
          const msg = validateImageFile(file);
          if (msg) {
            setErr(msg);
            continue;
          }
          next.push({
            kind: "local",
            key: `l-${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            src: URL.createObjectURL(file),
          });
        }
        return next;
      });
    },
    [],
  );

  const removeAt = useCallback((key) => {
    setItems((prev) => {
      const it = prev.find((x) => x.key === key);
      if (it?.kind === "local" && it.src) URL.revokeObjectURL(it.src);
      return prev.filter((x) => x.key !== key);
    });
  }, []);

  const reorderToKey = useCallback((fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setItems((prev) => {
      const i = prev.findIndex((x) => x.key === fromKey);
      const j = prev.findIndex((x) => x.key === toKey);
      if (i < 0 || j < 0) return prev;
      const copy = [...prev];
      const [row] = copy.splice(i, 1);
      copy.splice(j, 0, row);
      return copy;
    });
  }, []);

  const onDropZone = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setZoneDrag(false);
      if (readOnly) return;
      addFiles(e.dataTransfer.files);
    },
    [readOnly, addFiles],
  );

  const thumbTileClass = squareListImagePreviewFrameClass;
  const hasItems = items.length > 0;
  const showDropZone = !readOnly && items.length < MAX_ITEMS;

  return (
    <div>
      {!readOnly ? (
        <>
          <p className={adminLabel}>Imágenes de portada</p>
          <p className="mt-1 text-xs text-zinc-500">
            Una o varias imágenes. La primera es la portada principal en catálogo y pedidos. JPG, PNG, WebP o GIF ·
            máx. 10 MB c/u · hasta {MAX_ITEMS} archivos. Recomendado cuadrado (p. ej. 1200×1200 px).
          </p>
        </>
      ) : null}

      {readOnly && items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Sin imágenes de portada.</p>
      ) : null}

      {err ? (
        <p className={`mt-2 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-xs text-red-800`} role="alert">
          {err}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-4">
        {hasItems ? (
          <div>
            <ul
              className="flex flex-wrap gap-3"
              role="list"
              aria-label="Imágenes de portada, orden de izquierda a derecha"
            >
              {items.map((it) => (
                <li key={it.key} className="list-none">
                  <div
                    draggable={!readOnly}
                    title={!readOnly ? "Arrastra sobre otra miniatura para cambiar el orden" : undefined}
                    onDragStart={() => {
                      dragKeyRef.current = it.key;
                      setDragKey(it.key);
                    }}
                    onDragEnd={() => {
                      dragKeyRef.current = null;
                      setDragKey(null);
                    }}
                    onDragOver={(e) => {
                      if (readOnly) return;
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragKeyRef.current;
                      if (from) reorderToKey(from, it.key);
                      dragKeyRef.current = null;
                      setDragKey(null);
                    }}
                    className={`${thumbTileClass} ${!readOnly ? "cursor-grab active:cursor-grabbing" : ""} ${
                      dragKey === it.key ? "ring-2 ring-[color-mix(in_srgb,var(--mp-primary)_45%,transparent)]" : ""
                    }`}
                  >
                    {it.kind === "server" && it.rawImage ? (
                      <RasterFromApiUrl
                        url={it.rawImage}
                        alt=""
                        width={100}
                        height={100}
                        className={squareListImagePreviewImgClass}
                        draggable={false}
                        {...catalogRasterImgAttrs}
                      />
                    ) : (
                      <img
                        src={it.src}
                        alt=""
                        width={100}
                        height={100}
                        className={squareListImagePreviewImgClass}
                        draggable={false}
                        {...catalogRasterImgAttrs}
                      />
                    )}
                    {!readOnly ? (
                      <button
                        type="button"
                        className="absolute right-1 top-1 z-10 rounded-md bg-white/95 p-1 text-red-600 shadow-sm ring-1 ring-zinc-200/80 transition hover:bg-white"
                        aria-label="Quitar imagen"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAt(it.key);
                        }}
                      >
                        <IconRowTrash className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {!readOnly && items.length > 1 ? (
              <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                La primera imagen es la portada en catálogo y pedidos. Arrastra una miniatura sobre otra para reordenar.
              </p>
            ) : null}
          </div>
        ) : null}

        {showDropZone ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setZoneDrag(true);
            }}
            onDragLeave={() => setZoneDrag(false)}
            onDrop={onDropZone}
            className={`flex w-full flex-col items-center justify-center border-2 border-dashed px-4 transition-colors rounded-md ${
              hasItems ? "py-5" : "min-h-[200px] py-10"
            } ${
              zoneDrag
                ? "border-[color-mix(in_srgb,var(--mp-primary)_55%,#a1a1aa)] bg-[color-mix(in_srgb,var(--mp-primary)_8%,#fff)]"
                : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300"
            }`}
          >
            <div className="flex max-w-md flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200">
                <UploadIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">
                {hasItems ? (
                  <>
                    Añadir más: arrastra aquí o{" "}
                    <button
                      type="button"
                      className="mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_85%,transparent)]"
                      onClick={() => inputRef.current?.click()}
                    >
                      elige archivos
                    </button>
                  </>
                ) : (
                  <>
                    Arrastra imágenes aquí o{" "}
                    <button
                      type="button"
                      className="mp-text-brand no-underline underline-offset-2 transition-colors hover:underline hover:decoration-[color-mix(in_srgb,var(--mp-primary)_85%,transparent)]"
                      onClick={() => inputRef.current?.click()}
                    >
                      elige archivos
                    </button>
                  </>
                )}
              </p>
              <p className="text-xs text-zinc-500">Puedes seleccionar varias a la vez · máx. {MAX_ITEMS} archivos</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});

AdminAdSpaceGalleryField.displayName = "AdminAdSpaceGalleryField";
