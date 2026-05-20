"use client";

import { useCallback, useMemo } from "react";
import CreatableSelect from "react-select/creatable";

const menuPortal = { menuPortal: (base) => ({ ...base, zIndex: 200 }) };

function marketplaceCreatableStyles({ compact = false } = {}) {
  const r = 15;
  const minH = compact ? 34 : 40;
  const focusBorder = "color-mix(in srgb, var(--mp-primary) 50%, #d4d4d8)";
  const focusRing = "0 0 0 2px color-mix(in srgb, var(--mp-primary) 15%, transparent)";
  const optionSelectedBg = "var(--mp-primary)";
  const optionFocusedBg = "color-mix(in srgb, var(--mp-primary) 6%, #f4f4f5)";
  return {
    control: (base, state) => ({
      ...base,
      minHeight: minH,
      borderRadius: r,
      borderColor: state.isFocused ? focusBorder : "#e4e4e7",
      boxShadow: state.isFocused ? focusRing : "none",
      fontSize: compact ? "0.8125rem" : "0.875rem",
      backgroundColor: state.isDisabled ? "#f4f4f5" : "#fff",
      cursor: state.isDisabled ? "not-allowed" : "default",
    }),
    valueContainer: (b) => ({
      ...b,
      padding: compact ? "0 6px" : "0 10px",
    }),
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
      borderRadius: Math.max(0, r - 4),
      fontSize: compact ? "0.8125rem" : "0.875rem",
      backgroundColor: state.isSelected
        ? optionSelectedBg
        : state.isFocused
          ? optionFocusedBg
          : "#fff",
      color: state.isSelected ? "#fff" : "#18181b",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      opacity: state.isDisabled ? 0.55 : 1,
    }),
    singleValue: (b) => ({ ...b, color: "#18181b" }),
    placeholder: (b) => ({ ...b, color: "#71717a" }),
    input: (b) => ({ ...b, color: "#18181b" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (b, state) => ({
      ...b,
      color: state.isFocused ? "var(--mp-primary)" : "#71717a",
      padding: compact ? 4 : 6,
    }),
    ...menuPortal,
  };
}

/**
 * @param {{
 *   id: string;
 *   className?: string;
 *   value: string;
 *   onChange: (companyName: string) => void;
 *   providers: Array<Record<string, unknown>>;
 *   multiCenter: boolean;
 *   onCreate?: (companyName: string) => Promise<void>;
 *   allowCreate?: boolean;
 *   isDisabled?: boolean;
 *   isLoading?: boolean;
 *   isCreating?: boolean;
 *   "aria-label"?: string;
 * }} props
 */
export function MountingCompanyCreatableSelect({
  id,
  className,
  value,
  onChange,
  providers,
  multiCenter,
  onCreate,
  allowCreate = true,
  isDisabled = false,
  isLoading = false,
  isCreating = false,
  "aria-label": ariaLabel,
}) {
  const styles = useMemo(() => marketplaceCreatableStyles({ compact: false }), []);

  const options = useMemo(() => {
    const list = Array.isArray(providers) ? providers : [];
    return list.map((p) => {
      const name = String(p.company_name ?? "").trim() || "—";
      const scn = String(p.shopping_center_name ?? "").trim();
      const label =
        multiCenter && scn ? `${name} (${scn})` : name;
      return {
        value: `prov-${p.id}`,
        label,
        companyName: name,
        __isProvider: true,
      };
    });
  }, [providers, multiCenter]);

  const selected = useMemo(() => {
    const v = String(value ?? "").trim();
    if (!v) return null;
    const hit = options.find(
      (o) => o.companyName.toLowerCase() === v.toLowerCase(),
    );
    if (hit) return hit;
    return { value: `free-${v}`, label: v, companyName: v };
  }, [value, options]);

  const handleChange = useCallback(
    (opt) => {
      if (!opt) {
        onChange("");
        return;
      }
      onChange(String(opt.companyName ?? "").trim());
    },
    [onChange],
  );

  const handleCreate = useCallback(
    async (inputValue) => {
      const name = String(inputValue ?? "").trim();
      if (!name || !onCreate) return;
      await onCreate(name);
    },
    [onCreate],
  );

  return (
    <div className={className}>
      <CreatableSelect
        inputId={id}
        instanceId={id}
        classNamePrefix="mp-mount-rs"
        options={options}
        value={selected}
        onChange={handleChange}
        onCreateOption={allowCreate && onCreate ? handleCreate : undefined}
        isDisabled={isDisabled || isLoading || isCreating}
        isLoading={isLoading || isCreating}
        placeholder={
          isLoading
            ? "Cargando proveedores…"
            : allowCreate
              ? "Busca o escribe la empresa de instalación…"
              : "Selecciona la empresa de instalación…"
        }
        formatCreateLabel={
          allowCreate ? (input) => `Añadir «${input}» a la lista` : undefined
        }
        isValidNewOption={
          allowCreate
            ? (input) => String(input ?? "").trim().length >= 2
            : () => false
        }
        isClearable
        isSearchable
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        styles={styles}
        aria-label={ariaLabel}
        noOptionsMessage={() =>
          allowCreate
            ? "Sin coincidencias. Escribe el nombre para añadirlo."
            : "Sin coincidencias en la lista."
        }
      />
    </div>
  );
}
