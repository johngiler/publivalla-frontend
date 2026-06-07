"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AdminDetailField,
  AdminDetailInset,
  AdminDetailSection,
} from "@/components/admin/AdminAccordionDetail";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import {
  adminField,
  adminLabel,
  adminPrimaryBtn,
} from "@/components/admin/adminFormStyles";
import { formatUsdMoney } from "@/lib/marketplacePricing";
import {
  customRentalStartDayBounds,
  monthShortEs,
  reservationMonthAnchor,
} from "@/lib/orderLineRentalStart";
import { orderLinePricingEditable, parseUsdInput } from "@/lib/orderLinePricing";
import { orderAdminCommercialEditable } from "@/lib/orderAdminWorkflow";
import { authFetch } from "@/services/authApi";

/**
 * @param {{
 *   order: Record<string, unknown>;
 *   panelId: string;
 *   onSaved?: (updated?: Record<string, unknown>) => void | Promise<void>;
 * }} props
 */
export function PedidoAdminLineRentalStart({ order, panelId, onSaved }) {
  const orderId = order?.id;
  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items],
  );
  const editable = orderLinePricingEditable(order);

  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const itemsSignature = useMemo(
    () =>
      items
        .map(
          (it) =>
            `${it.id}:${it.custom_rental_start_enabled}:${it.custom_rental_start_date}:${it.first_month_agreed_subtotal}:${it.start_date}`,
        )
        .join("|"),
    [items],
  );

  useEffect(() => {
    const anyEnabled = items.some((it) => it.custom_rental_start_enabled);
    setOpen(anyEnabled);
    const next = {};
    for (const it of items) {
      const bounds = customRentalStartDayBounds(it.start_date);
      const defaultDate =
        it.custom_rental_start_date ??
        (bounds?.min && it.custom_rental_start_enabled ? bounds.min : "");
      next[it.id] = {
        enabled: Boolean(it.custom_rental_start_enabled),
        startDate: defaultDate ? String(defaultDate) : "",
        firstMonthPrice:
          it.first_month_agreed_subtotal != null
            ? String(it.first_month_agreed_subtotal)
            : "",
      };
    }
    setDrafts(next);
    setErr("");
    setMsg("");
  }, [orderId, itemsSignature, items]);

  const save = useCallback(async () => {
    setErr("");
    setMsg("");
    const payloadItems = [];
    const refNow = new Date();

    for (const it of items) {
      const d = drafts[it.id] ?? {};
      if (!d.enabled) {
        payloadItems.push({
          id: it.id,
          subtotal: String(it.subtotal ?? "0"),
          custom_rental_start_enabled: false,
        });
        continue;
      }
      const bounds = customRentalStartDayBounds(it.start_date, refNow);
      if (!bounds) {
        setErr(
          `El mes inicial de ${it.ad_space_code || "la toma"} ya no admite ajuste de inicio.`,
        );
        return;
      }
      if (!d.startDate) {
        setErr(
          `Indica el día de inicio de alquiler para ${it.ad_space_code || "la toma"}.`,
        );
        return;
      }
      if (d.startDate < bounds.min || d.startDate > bounds.max) {
        setErr(
          `La fecha de inicio de ${it.ad_space_code || "la toma"} debe estar entre ${bounds.min} y ${bounds.max}.`,
        );
        return;
      }
      const firstMonth = parseUsdInput(d.firstMonthPrice);
      if (!Number.isFinite(firstMonth) || firstMonth < 0) {
        setErr(
          `Indica un importe válido para el mes inicial de ${it.ad_space_code || "la toma"}.`,
        );
        return;
      }
      payloadItems.push({
        id: it.id,
        custom_rental_start_enabled: true,
        custom_rental_start_date: d.startDate,
        first_month_agreed_subtotal: firstMonth.toFixed(2),
      });
    }

    setSaving(true);
    try {
      const updated = await authFetch(`/api/orders/${orderId}/line-pricing/`, {
        method: "PATCH",
        body: { items: payloadItems },
      });
      const regenSheet = Boolean(
        updated?.negotiation_sheet_pdf_url ??
          order?.negotiation_sheet_pdf_url ??
          ["client_approved", "art_approved"].includes(String(order?.status ?? "")),
      );
      const hadSignedSheet = Boolean(order?.negotiation_sheet_signed_url);
      const signedCleared = hadSignedSheet && !updated?.negotiation_sheet_signed_url;
      setMsg(
        regenSheet
          ? signedCleared || hadSignedSheet
            ? "Fecha de inicio guardada. La hoja de negociación se actualizó; el cliente debe descargarla y firmarla de nuevo."
            : "Fecha de inicio guardada. La hoja de negociación se actualizó; revisa la vista previa en Documentos."
          : "Fecha de inicio de alquiler guardada.",
      );
      await onSaved?.(updated);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "No se pudo guardar la fecha de inicio.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    drafts,
    items,
    onSaved,
    order?.negotiation_sheet_signed_url,
    order?.negotiation_sheet_pdf_url,
    order?.status,
    orderId,
  ]);

  if (!orderAdminCommercialEditable(order)) {
    return null;
  }

  const toggleLabel = "Establecer fecha de inicio de alquiler";
  const hasSignedSheet = Boolean(order?.negotiation_sheet_signed_url);

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-zinc-200/90 bg-zinc-50/60 px-4 py-3 ring-1 ring-zinc-100/80">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-[color:var(--mp-primary)] focus:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
        />
        <span className="min-w-0 text-sm leading-snug text-zinc-800">
          <span className="font-semibold text-zinc-900">{toggleLabel}</span>
          <span className="mt-0.5 block text-zinc-600">
            {hasSignedSheet
              ? "Ajusta el día de inicio dentro del mes inicial de cada toma. Al guardar, se actualizan precios, PDFs y la hoja de negociación."
              : "Define desde qué día del mes inicial comienza el alquiler y el importe acordado de ese mes."}
          </span>
        </span>
      </label>

      {open ? (
        <AdminDetailSection
          panelId={panelId}
          sectionId="rental-start"
          title="Inicio de alquiler"
        >
          <AdminDetailInset className="space-y-4">
            {msg ? (
              <AdminInlineAlert variant="success" onDismiss={() => setMsg("")}>
                {msg}
              </AdminInlineAlert>
            ) : null}
            {err ? (
              <AdminInlineAlert variant="error" onDismiss={() => setErr("")}>
                {err}
              </AdminInlineAlert>
            ) : null}

            {!editable ? (
              <p className="text-sm text-zinc-600">
                El inicio de alquiler de este pedido ya no se puede modificar.
              </p>
            ) : null}

            <ul className="space-y-4">
              {items.map((it) => {
                const d = drafts[it.id] ?? {
                  enabled: false,
                  startDate: "",
                  firstMonthPrice: "",
                };
                const anchor = reservationMonthAnchor(it.start_date);
                const bounds = customRentalStartDayBounds(it.start_date);
                const monthLabel = anchor
                  ? `${monthShortEs(anchor.month)} ${anchor.year}`
                  : "—";

                return (
                  <li
                    key={it.id}
                    className="rounded-[12px] border border-zinc-200/90 bg-white p-4 ring-1 ring-zinc-100/80"
                  >
                    <p className="font-mono text-xs font-semibold text-zinc-500">
                      {it.ad_space_code}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-zinc-900 line-clamp-2">
                      {it.ad_space_title}
                    </p>
                    <AdminDetailField label="Mes inicial de la reserva">
                      {monthLabel}
                    </AdminDetailField>

                    {editable ? (
                      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-[color:var(--mp-primary)] focus:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
                          checked={d.enabled}
                          disabled={!bounds}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [it.id]: {
                                ...d,
                                enabled: e.target.checked,
                                startDate:
                                  e.target.checked && bounds
                                    ? prev[it.id]?.startDate || bounds.min
                                    : d.startDate,
                              },
                            }))
                          }
                        />
                        <span className="text-sm text-zinc-700">
                          Usar inicio personalizado en {monthLabel}
                        </span>
                      </label>
                    ) : it.custom_rental_start_enabled ? (
                      <AdminDetailField label="Inicio de alquiler">
                        {it.custom_rental_start_date
                          ? String(it.custom_rental_start_date)
                          : "—"}
                      </AdminDetailField>
                    ) : null}

                    {editable && d.enabled && bounds ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={adminLabel} htmlFor={`rental-day-${it.id}`}>
                            Día de inicio ({monthLabel})
                          </label>
                          <input
                            id={`rental-day-${it.id}`}
                            type="date"
                            className={adminField}
                            min={bounds.min}
                            max={bounds.max}
                            value={d.startDate}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.id]: { ...d, startDate: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            className={adminLabel}
                            htmlFor={`rental-first-month-${it.id}`}
                          >
                            Importe mes inicial (sin IVA)
                          </label>
                          <input
                            id={`rental-first-month-${it.id}`}
                            type="text"
                            inputMode="decimal"
                            className={adminField}
                            value={d.firstMonthPrice}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.id]: { ...d, firstMonthPrice: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : null}

                    {editable && !bounds ? (
                      <p className="mt-2 text-sm text-amber-800">
                        El mes inicial de esta línea ya pasó; no se puede ajustar el día de
                        inicio.
                      </p>
                    ) : null}

                    {it.custom_rental_start_enabled && it.first_month_agreed_subtotal != null ? (
                      <p className="mt-2 text-sm text-zinc-600">
                        Mes inicial acordado:{" "}
                        <span className="font-medium text-zinc-900">
                          {formatUsdMoney(Number(it.first_month_agreed_subtotal))}
                        </span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {editable ? (
              <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  className={adminPrimaryBtn}
                  disabled={saving || items.length === 0}
                  onClick={() => void save()}
                >
                  {saving ? "Guardando…" : "Guardar inicio de alquiler"}
                </button>
              </div>
            ) : null}
          </AdminDetailInset>
        </AdminDetailSection>
      ) : null}
    </div>
  );
}
