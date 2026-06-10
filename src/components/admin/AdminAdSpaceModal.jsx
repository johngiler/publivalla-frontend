"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import { AdminAdSpaceGalleryField } from "@/components/admin/AdminAdSpaceGalleryField";
import {
  AdminAdSpaceFormatList,
  emptyFormatRow,
  formatsFromApi,
  formatsToApiPayload,
} from "@/components/admin/AdminAdSpaceFormatList";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { CoverImageField } from "@/components/admin/CoverImageField";
import {
  adminField,
  adminLabel,
  adminPrimaryBtn,
  adminSecondaryBtn,
} from "@/components/admin/adminFormStyles";
import { SPACE_AVAILABILITY } from "@/components/admin/adminConstants";
import { authJsonFetcher } from "@/lib/swr/fetchers";
import { authFetch, authFetchForm } from "@/services/authApi";

function validateTomaCodeFormat(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "Indica el código del espacio publicitario.";
  if (c.length > 32) return "El código no puede superar 32 caracteres.";
  if (!/^[A-Z0-9][A-Z0-9_-]*-T[0-9]+[A-Z]*$/.test(c)) {
    return "Usa un prefijo, luego «-T», un número y, si aplica, letras (ej. DEMO-T1, CC-T2A).";
  }
  return null;
}

function buildSpaceFormData(values, extras) {
  const fd = new FormData();
  fd.append("code", values.code.trim());
  fd.append("shopping_center", String(values.shopping_center));
  fd.append("name", values.name.trim());
  fd.append("description", values.description.trim());
  fd.append("monthly_price_usd", String(values.monthly_price_usd).trim());
  fd.append("availability", values.availability);
  fd.append("is_active", values.is_active ? "true" : "false");
  fd.append("formats_json", JSON.stringify(extras.formats));
  fd.append("gallery_plan", JSON.stringify(extras.galleryPlan));
  extras.galleryFiles.forEach((f) => fd.append("gallery_add", f));
  if (extras.locationFile) fd.append("location_image", extras.locationFile);
  else if (extras.clearLocation) fd.append("location_image", "");
  if (extras.productionFile) fd.append("production_image", extras.productionFile);
  else if (extras.clearProduction) fd.append("production_image", "");
  return fd;
}

function SectionTitle({ children }) {
  return (
    <h3 className="border-b border-zinc-100 pb-2 text-sm font-semibold text-zinc-900">{children}</h3>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   mode: "create" | "edit";
 *   space: Record<string, unknown> | null;
 *   centers: Array<Record<string, unknown>>;
 *   onClose: () => void;
 *   onSaved: () => void | Promise<void>;
 * }} props
 */
export function AdminAdSpaceModal({ open, mode, space, centers, onClose, onSaved }) {
  const galleryRef = useRef(null);
  const locationInputRef = useRef(null);
  const productionInputRef = useRef(null);

  const [modalErr, setModalErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [shoppingCenter, setShoppingCenter] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [availability, setAvailability] = useState("available");
  const [isActive, setIsActive] = useState(true);
  const [formatRows, setFormatRows] = useState([emptyFormatRow()]);
  const [productTypes, setProductTypes] = useState([]);
  const [locationFile, setLocationFile] = useState(null);
  const [productionFile, setProductionFile] = useState(null);
  const [pendingClearLocation, setPendingClearLocation] = useState(false);
  const [pendingClearProduction, setPendingClearProduction] = useState(false);

  const typesKey = open ? "/api/admin/ad-space-product-types/?page_size=200" : null;
  const { data: typesData } = useSWR(typesKey, authJsonFetcher);
  useEffect(() => {
    const results = typesData?.results;
    if (Array.isArray(results)) {
      setProductTypes(
        results.map((r) => ({ id: Number(r.id), name: String(r.name || "") })).filter((r) => r.id),
      );
    }
  }, [typesData]);

  const resetForm = useCallback(() => {
    setShoppingCenter("");
    setCode("");
    setName("");
    setDescription("");
    setMonthlyPrice("");
    setAvailability("available");
    setIsActive(true);
    setFormatRows([emptyFormatRow()]);
    setLocationFile(null);
    setProductionFile(null);
    setPendingClearLocation(false);
    setPendingClearProduction(false);
    setModalErr("");
    setFieldErrors({});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && space) {
      setShoppingCenter(String(space.shopping_center ?? ""));
      setCode(String(space.code ?? ""));
      setName(String(space.name ?? space.title ?? ""));
      setDescription(String(space.description ?? ""));
      setMonthlyPrice(String(space.monthly_price_usd ?? ""));
      setAvailability(String(space.availability ?? "available"));
      setIsActive(space.is_active !== false);
      setFormatRows(formatsFromApi(space.formats));
      setLocationFile(null);
      setProductionFile(null);
      setPendingClearLocation(false);
      setPendingClearProduction(false);
    } else {
      resetForm();
    }
    setModalErr("");
    setFieldErrors({});
  }, [open, mode, space, resetForm]);

  const fieldClass = (key) =>
    `${adminField} ${fieldErrors?.[key] ? "mp-admin-field-error" : ""}`;

  const existingLocationUrl =
    space?.location_image_url || space?.location_image
      ? String(space.location_image_url || space.location_image)
      : null;
  const existingProductionUrl =
    space?.production_image_url || space?.production_image
      ? String(space.production_image_url || space.production_image)
      : null;

  const locationPreview = useMemo(
    () => (locationFile ? URL.createObjectURL(locationFile) : ""),
    [locationFile],
  );
  const productionPreview = useMemo(
    () => (productionFile ? URL.createObjectURL(productionFile) : ""),
    [productionFile],
  );

  useEffect(() => {
    return () => {
      if (locationPreview) URL.revokeObjectURL(locationPreview);
    };
  }, [locationPreview]);
  useEffect(() => {
    return () => {
      if (productionPreview) URL.revokeObjectURL(productionPreview);
    };
  }, [productionPreview]);

  async function suggestNextCode() {
    if (!shoppingCenter) return;
    setModalErr("");
    try {
      const data = await authFetch(
        `/api/admin/spaces/next-code/?shopping_center=${encodeURIComponent(shoppingCenter)}`,
      );
      if (data?.suggested_code) setCode(String(data.suggested_code));
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "No se pudo sugerir el código.");
    }
  }

  async function submitSave() {
    setModalErr("");
    setFieldErrors({});
    const centerId = parseInt(shoppingCenter, 10);
    const nextFe = {};
    if (!centerId) nextFe.shopping_center = "Campo obligatorio.";
    if (mode === "create") {
      const codeErr = validateTomaCodeFormat(code);
      if (codeErr) nextFe.code = codeErr;
    }
    if (!name.trim()) nextFe.name = "Campo obligatorio.";
    if (!String(monthlyPrice || "").trim()) nextFe.monthly_price_usd = "Campo obligatorio.";
    const apiFormats = formatsToApiPayload(formatRows);
    const hasType = apiFormats.some(
      (r) => r.product_type_id || (r.product_type_name && r.product_type_name.trim()),
    );
    if (!hasType) nextFe.formats = "Indica al menos un tipo de elemento.";
    if (Object.keys(nextFe).length) {
      setFieldErrors(nextFe);
      setModalErr("Revisa los campos marcados.");
      return;
    }
    try {
      const payload = galleryRef.current?.getPayload?.() ?? { plan: [], newFiles: [] };
      const fd = buildSpaceFormData(
        {
          code: mode === "create" ? code.trim().toUpperCase() : code,
          shopping_center: centerId,
          name,
          description,
          monthly_price_usd: monthlyPrice,
          availability,
          is_active: isActive,
        },
        {
          formats: apiFormats,
          galleryPlan: payload.plan,
          galleryFiles: payload.newFiles,
          locationFile,
          productionFile,
          clearLocation: pendingClearLocation,
          clearProduction: pendingClearProduction,
        },
      );
      if (mode === "create") {
        await authFetchForm("/api/admin/spaces/", { method: "POST", formData: fd });
      } else if (space?.id != null) {
        await authFetchForm(`/api/admin/spaces/${space.id}/`, { method: "PATCH", formData: fd });
      }
      await onSaved();
      onClose();
    } catch (e) {
      if (e && typeof e === "object" && e.data && typeof e.data === "object") {
        const fe = {};
        for (const [k, v] of Object.entries(e.data)) {
          if (v == null) continue;
          fe[k] = Array.isArray(v) ? v.map(String).join("\n") : String(v);
        }
        if (Object.keys(fe).length) {
          setFieldErrors(fe);
          setModalErr("Revisa los campos marcados.");
          return;
        }
      }
      setModalErr(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Nuevo espacio publicitario" : "Editar espacio publicitario"}
      maxWidthClass="max-w-6xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={adminSecondaryBtn} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={adminPrimaryBtn} onClick={submitSave}>
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {modalErr ? <AdminInlineAlert variant="error">{modalErr}</AdminInlineAlert> : null}

        <section className="space-y-4">
          <SectionTitle>Datos principales</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={adminLabel} htmlFor="ep-center">
                Centro comercial
              </label>
              <AdminSelect
                id="ep-center"
                options={centers.map((c) => ({ v: c.id, l: `${c.slug} — ${c.name}` }))}
                value={shoppingCenter}
                onChange={(v) => setShoppingCenter(v === "" || v == null ? "" : String(v))}
                placeholder="Selecciona un centro comercial…"
                inModal
                aria-label="Centro comercial"
              />
              {fieldErrors?.shopping_center ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.shopping_center}</p>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className={adminLabel} htmlFor="ep-code">
                  Código del espacio
                </label>
                {mode === "create" ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                    onClick={suggestNextCode}
                    disabled={!shoppingCenter}
                  >
                    Generar
                  </button>
                ) : null}
              </div>
              <input
                id="ep-code"
                className={fieldClass("code")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={mode === "edit"}
                autoComplete="off"
                spellCheck={false}
              />
              {fieldErrors?.code ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.code}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="ep-price">
                Precio USD / mes
              </label>
              <input
                id="ep-price"
                className={fieldClass("monthly_price_usd")}
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
              {fieldErrors?.monthly_price_usd ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.monthly_price_usd}</p>
              ) : null}
            </div>
            <div>
              <label className={adminLabel} htmlFor="ep-availability">
                Disponibilidad
              </label>
              <AdminSelect
                id="ep-availability"
                options={SPACE_AVAILABILITY}
                value={availability}
                onChange={(v) => setAvailability(v || "available")}
                inModal
                aria-label="Disponibilidad"
              />
            </div>
            <div className="flex items-end pb-1 sm:col-span-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  id="ep-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Espacio activo?
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="ep-name">
                Nombre
              </label>
              <input
                id="ep-name"
                className={fieldClass("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {fieldErrors?.name ? (
                <p className="mt-1 text-xs text-rose-700">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={adminLabel} htmlFor="ep-desc">
                Descripción
              </label>
              <textarea
                id="ep-desc"
                className={adminField}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Imágenes</SectionTitle>
          <div className="space-y-6">
            <AdminAdSpaceGalleryField
              ref={galleryRef}
              key={mode === "edit" && space ? `edit-${space.id}` : "create"}
              readOnly={false}
              initialServerImages={
                mode === "edit" && space && Array.isArray(space.gallery_images)
                  ? space.gallery_images
                  : []
              }
            />
            <CoverImageField
              label="Imagen de ubicación"
              existingUrl={
                pendingClearLocation ? null : mode === "edit" ? existingLocationUrl : null
              }
              filePreviewUrl={locationPreview}
              onFileChange={(f) => {
                setLocationFile(f);
                setPendingClearLocation(false);
              }}
              onClearExisting={() => {
                setLocationFile(null);
                setPendingClearLocation(true);
                if (locationInputRef.current) locationInputRef.current.value = "";
              }}
              fileInputRef={locationInputRef}
            />
            <CoverImageField
              label="Imagen de arte y producción"
              existingUrl={
                pendingClearProduction ? null : mode === "edit" ? existingProductionUrl : null
              }
              filePreviewUrl={productionPreview}
              onFileChange={(f) => {
                setProductionFile(f);
                setPendingClearProduction(false);
              }}
              onClearExisting={() => {
                setProductionFile(null);
                setPendingClearProduction(true);
                if (productionInputRef.current) productionInputRef.current.value = "";
              }}
              fileInputRef={productionInputRef}
            />
          </div>
        </section>

        <section>
          <AdminAdSpaceFormatList
            rows={formatRows}
            onChange={setFormatRows}
            productTypes={productTypes}
            onProductTypesChange={setProductTypes}
            fieldErrors={fieldErrors}
          />
        </section>
      </div>
    </AdminModal>
  );
}
