"use client";

import { useCallback, useMemo } from "react";
import CreatableSelect from "react-select/creatable";

import { adminField, adminLabel } from "@/components/admin/adminFormStyles";
import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { authFetch } from "@/services/authApi";

const menuPortal = { menuPortal: (base) => ({ ...base, zIndex: 200 }) };

function selectStyles() {
  const r = 12;
  const focusBorder = "color-mix(in srgb, var(--mp-primary) 50%, #d4d4d8)";
  const focusRing = "0 0 0 2px color-mix(in srgb, var(--mp-primary) 15%, transparent)";
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      borderRadius: r,
      borderColor: state.isFocused ? focusBorder : "#e4e4e7",
      boxShadow: state.isFocused ? focusRing : "none",
      fontSize: "0.875rem",
    }),
    valueContainer: (b) => ({ ...b, padding: "0 8px" }),
    menu: (b) => ({
      ...b,
      borderRadius: r,
      overflow: "hidden",
      boxShadow: "0 10px 40px rgba(15, 23, 42, 0.12)",
      border: "1px solid #e4e4e7",
    }),
    menuList: (b) => ({ ...b, padding: 4 }),
    option: (b, state) => ({
      ...b,
      borderRadius: 8,
      fontSize: "0.875rem",
      backgroundColor: state.isSelected
        ? "var(--mp-primary)"
        : state.isFocused
          ? "color-mix(in srgb, var(--mp-primary) 6%, #f4f4f5)"
          : "#fff",
      color: state.isSelected ? "#fff" : "#18181b",
    }),
    singleValue: (b) => ({ ...b, color: "#18181b" }),
    placeholder: (b) => ({ ...b, color: "#71717a" }),
    input: (b) => ({ ...b, color: "#18181b" }),
    indicatorSeparator: () => ({ display: "none" }),
    ...menuPortal,
  };
}

/**
 * @param {{
 *   id: string;
 *   value: { product_type_id?: number | null; product_type_name?: string } | null;
 *   options: Array<{ id: number; name: string }>;
 *   onChange: (next: { product_type_id?: number | null; product_type_name?: string }) => void;
 *   onOptionsChange?: (options: Array<{ id: number; name: string }>) => void;
 *   disabled?: boolean;
 *   "aria-label"?: string;
 * }} props
 */
export function AdminAdSpaceProductTypeSelect({
  id,
  value,
  options,
  onChange,
  onOptionsChange,
  disabled = false,
  "aria-label": ariaLabel,
}) {
  const styles = useMemo(() => selectStyles(), []);

  const selectOptions = useMemo(
    () =>
      (Array.isArray(options) ? options : []).map((o) => ({
        value: o.id,
        label: o.name,
      })),
    [options],
  );

  const selected = useMemo(() => {
    const pid = value?.product_type_id;
    if (pid != null) {
      const hit = selectOptions.find((o) => o.value === pid);
      if (hit) return hit;
    }
    const name = (value?.product_type_name || "").trim();
    if (name) return { value: `new:${name}`, label: name };
    return null;
  }, [selectOptions, value?.product_type_id, value?.product_type_name]);

  const handleCreate = useCallback(
    async (inputValue) => {
      const name = String(inputValue || "").trim();
      if (!name) return;
      try {
        const created = await authFetch("/api/admin/ad-space-product-types/", {
          method: "POST",
          body: { name },
        });
        const row = { id: Number(created.id), name: String(created.name || name) };
        onOptionsChange?.([...(options || []), row].sort((a, b) => a.name.localeCompare(b.name)));
        onChange({ product_type_id: row.id, product_type_name: row.name });
      } catch {
        onChange({ product_type_id: null, product_type_name: name });
      }
    },
    [onChange, onOptionsChange, options],
  );

  return (
    <CreatableSelect
      inputId={id}
      instanceId={id}
      className="min-w-0 text-sm"
      classNamePrefix="admin-ad-space-type"
      styles={styles}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPlacement="auto"
      isClearable
      isDisabled={disabled}
      aria-label={ariaLabel || "Tipo de elemento"}
      placeholder="Tipo…"
      options={selectOptions}
      value={selected}
      onChange={(opt) => {
        if (!opt) {
          onChange({ product_type_id: null, product_type_name: "" });
          return;
        }
        if (typeof opt.value === "number") {
          onChange({ product_type_id: opt.value, product_type_name: String(opt.label || "") });
        } else {
          const raw = String(opt.label || "").trim();
          onChange({ product_type_id: null, product_type_name: raw });
        }
      }}
      onCreateOption={(inputValue) => handleCreate(inputValue)}
      formatCreateLabel={(inputValue) => `Crear tipo «${inputValue}»`}
    />
  );
}

function newRowKey() {
  return `fmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFormatRow() {
  return {
    key: newRowKey(),
    product_type_id: null,
    product_type_name: "",
    width: "",
    height: "",
    quantity: "1",
    location: "",
    double_sided: false,
  };
}

export function formatsFromApi(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [emptyFormatRow()];
  return list.map((r) => ({
    key: `fmt-${r.id}`,
    product_type_id: r.product_type_id ?? null,
    product_type_name: r.product_type_name || "",
    width: r.width != null ? String(r.width) : "",
    height: r.height != null ? String(r.height) : "",
    quantity: r.quantity != null ? String(r.quantity) : "1",
    location: r.location || "",
    double_sided: Boolean(r.double_sided),
  }));
}

export function formatsToApiPayload(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    product_type_id: r.product_type_id ?? undefined,
    product_type_name: r.product_type_name?.trim() || undefined,
    width: r.width?.trim() || undefined,
    height: r.height?.trim() || undefined,
    quantity: r.quantity?.trim() || "1",
    location: r.location?.trim() || "",
    double_sided: Boolean(r.double_sided),
  }));
}

/**
 * @param {{
 *   rows: Array<Record<string, unknown>>;
 *   onChange: (rows: Array<Record<string, unknown>>) => void;
 *   productTypes: Array<{ id: number; name: string }>;
 *   onProductTypesChange: (next: Array<{ id: number; name: string }>) => void;
 *   fieldErrors?: Record<string, string>;
 * }} props
 */
export function AdminAdSpaceFormatList({
  rows,
  onChange,
  productTypes,
  onProductTypesChange,
  fieldErrors,
}) {
  const updateRow = (key, patch) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key) => {
    const next = rows.filter((r) => r.key !== key);
    onChange(next.length ? next : [emptyFormatRow()]);
  };

  const addRow = () => {
    onChange([...rows, emptyFormatRow()]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">Tipos de elemento</p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-9 items-center gap-1 rounded-[12px] border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          Agregar tipo
        </button>
      </div>
      {fieldErrors?.formats ? (
        <p className="text-xs text-rose-700">{fieldErrors.formats}</p>
      ) : null}
      <ul className="space-y-2">
        {rows.map((row, idx) => (
          <li
            key={row.key}
            className="grid grid-cols-1 gap-2 rounded-[12px] border border-zinc-200/90 bg-zinc-50/50 p-3 ring-1 ring-zinc-100/80 lg:grid-cols-[minmax(9rem,1.2fr)_5rem_5rem_4.5rem_minmax(6rem,1fr)_auto_auto]"
          >
            <div className="min-w-0">
              <label className={`${adminLabel} mb-1 block`} htmlFor={`fmt-type-${row.key}`}>
                Tipo
              </label>
              <AdminAdSpaceProductTypeSelect
                id={`fmt-type-${row.key}`}
                value={{
                  product_type_id: row.product_type_id,
                  product_type_name: row.product_type_name,
                }}
                options={productTypes}
                onOptionsChange={onProductTypesChange}
                onChange={(next) =>
                  updateRow(row.key, {
                    product_type_id: next.product_type_id,
                    product_type_name: next.product_type_name,
                  })
                }
              />
            </div>
            <div className="min-w-0">
              <label className={`${adminLabel} mb-1 block`} htmlFor={`fmt-w-${row.key}`}>
                Ancho
              </label>
              <input
                id={`fmt-w-${row.key}`}
                className={adminField}
                value={row.width}
                onChange={(e) => updateRow(row.key, { width: e.target.value })}
                placeholder="m"
              />
            </div>
            <div className="min-w-0">
              <label className={`${adminLabel} mb-1 block`} htmlFor={`fmt-h-${row.key}`}>
                Alto
              </label>
              <input
                id={`fmt-h-${row.key}`}
                className={adminField}
                value={row.height}
                onChange={(e) => updateRow(row.key, { height: e.target.value })}
                placeholder="m"
              />
            </div>
            <div className="min-w-0">
              <label className={`${adminLabel} mb-1 block`} htmlFor={`fmt-q-${row.key}`}>
                Cant.
              </label>
              <input
                id={`fmt-q-${row.key}`}
                className={adminField}
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                inputMode="numeric"
              />
            </div>
            <div className="min-w-0 lg:col-span-1">
              <label className={`${adminLabel} mb-1 block`} htmlFor={`fmt-loc-${row.key}`}>
                Ubicación
              </label>
              <input
                id={`fmt-loc-${row.key}`}
                className={adminField}
                value={row.location}
                onChange={(e) => updateRow(row.key, { location: e.target.value })}
                placeholder="Pasillo, nivel…"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium text-zinc-800">
                <input
                  type="checkbox"
                  className="size-4 shrink-0 rounded border-zinc-300 accent-[var(--mp-primary)]"
                  checked={Boolean(row.double_sided)}
                  onChange={(e) => updateRow(row.key, { double_sided: e.target.checked })}
                />
                Doble cara
              </label>
            </div>
            <div className="flex items-end justify-end pb-0.5">
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length <= 1 && idx === 0}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-zinc-200/90 bg-white text-zinc-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Quitar tipo"
                title="Quitar tipo"
              >
                <IconRowTrash className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
