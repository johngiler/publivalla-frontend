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
  orderCatalogSubtotal,
  orderDiscountTotal,
  orderHasDiscount,
  orderLineDiscountAmount,
  orderLineOriginalSubtotal,
  orderLinePricingEditable,
  parseUsdInput,
} from "@/lib/orderLinePricing";
import { orderAdminIsBeforeInvoice } from "@/lib/orderAdminWorkflow";
import { authFetch } from "@/services/authApi";

/**
 * @param {{
 *   order: Record<string, unknown>;
 *   panelId: string;
 *   onSaved?: () => void | Promise<void>;
 * }} props
 */
export function PedidoAdminLinePricing({ order, panelId, onSaved }) {
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

  const discountActive = orderHasDiscount(order);
  const itemsSignature = useMemo(
    () => items.map((it) => `${it.id}:${it.subtotal}`).join("|"),
    [items],
  );

  useEffect(() => {
    setOpen(discountActive);
    const next = {};
    for (const it of items) {
      next[it.id] = String(it.subtotal ?? "");
    }
    setDrafts(next);
    setErr("");
    setMsg("");
  }, [orderId, itemsSignature, discountActive, items]);

  const previewCatalog = useMemo(() => orderCatalogSubtotal(order), [order, items]);
  const previewDiscount = useMemo(() => {
    let d = 0;
    for (const it of items) {
      const orig = orderLineOriginalSubtotal(it);
      const sub = parseUsdInput(drafts[it.id]);
      if (Number.isFinite(sub) && sub < orig) d += orig - sub;
    }
    return d;
  }, [items, drafts]);
  const previewTotal = useMemo(() => {
    let t = 0;
    for (const it of items) {
      const sub = parseUsdInput(drafts[it.id]);
      if (Number.isFinite(sub)) t += sub;
    }
    return t;
  }, [items, drafts]);

  const save = useCallback(async () => {
    setErr("");
    setMsg("");
    const payloadItems = [];
    for (const it of items) {
      const sub = parseUsdInput(drafts[it.id]);
      const orig = orderLineOriginalSubtotal(it);
      if (!Number.isFinite(sub)) {
        setErr(`Indica un importe válido para ${it.ad_space_code || "la toma"}.`);
        return;
      }
      if (sub > orig + 0.004) {
        setErr(
          `El importe de ${it.ad_space_code || "la toma"} no puede superar el subtotal de catálogo (${formatUsdMoney(orig)}).`,
        );
        return;
      }
      payloadItems.push({ id: it.id, subtotal: sub.toFixed(2) });
    }
    setSaving(true);
    try {
      await authFetch(`/api/orders/${orderId}/line-pricing/`, {
        method: "PATCH",
        body: { items: payloadItems },
      });
      const regenSheet = ["client_approved", "art_approved"].includes(
        String(order?.status ?? ""),
      );
      const hadSignedSheet = Boolean(order?.negotiation_sheet_signed_url);
      setMsg(
        regenSheet
          ? hadSignedSheet
            ? "Precios guardados. La hoja de negociación se regeneró; el cliente debe descargarla y firmarla de nuevo."
            : "Precios guardados. La hoja de negociación se regeneró; revisa la vista previa en Documentos."
          : "Precios acordados guardados.",
      );
      await onSaved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudieron guardar los precios.");
    } finally {
      setSaving(false);
    }
  }, [drafts, items, onSaved, order?.negotiation_sheet_signed_url, order?.status, orderId]);

  if (!orderAdminIsBeforeInvoice(order)) {
    return null;
  }

  const toggleLabel = "Ajustar precios acordados por toma";
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
              ? "Puedes renegociar importes hasta facturar. Al guardar, se regenera la hoja de negociación y el cliente debe firmarla de nuevo."
              : "Puedes aplicar descuentos por toma hasta facturar el pedido."}
          </span>
        </span>
      </label>

      {open ? (
        <AdminDetailSection panelId={panelId} sectionId="pricing" title="Precios acordados">
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
            Los precios de este pedido ya no se pueden modificar.
          </p>
        ) : null}

        <ul className="space-y-4">
          {items.map((it) => {
            const orig = orderLineOriginalSubtotal(it);
            const currentDisc = orderLineDiscountAmount(it);
            const draftSub = parseUsdInput(drafts[it.id]);
            const draftDisc =
              Number.isFinite(draftSub) && draftSub < orig ? orig - draftSub : 0;
            return (
              <li
                key={it.id}
                className="rounded-[12px] border border-zinc-200/90 bg-white p-4 ring-1 ring-zinc-100/80"
              >
                <p className="font-mono text-xs font-semibold text-zinc-500">{it.ad_space_code}</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900 line-clamp-2">
                  {it.ad_space_title}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <AdminDetailField label="Subtotal catálogo (sin IVA)">
                    {formatUsdMoney(orig)}
                  </AdminDetailField>
                  {editable ? (
                    <div>
                      <label className={adminLabel} htmlFor={`line-sub-${it.id}`}>
                        Subtotal acordado (sin IVA)
                      </label>
                      <input
                        id={`line-sub-${it.id}`}
                        type="text"
                        inputMode="decimal"
                        className={adminField}
                        value={drafts[it.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                      />
                    </div>
                  ) : (
                    <AdminDetailField label="Subtotal acordado (sin IVA)">
                      {formatUsdMoney(Number(it.subtotal))}
                    </AdminDetailField>
                  )}
                </div>
                {(editable ? draftDisc : currentDisc) > 0.004 ? (
                  <p className="mt-2 text-sm font-medium text-emerald-800">
                    Descuento en esta toma: −
                    {formatUsdMoney(editable ? draftDisc : currentDisc)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3">
          <AdminDetailField label="Subtotal catálogo">
            {formatUsdMoney(editable ? previewCatalog : orderCatalogSubtotal(order))}
          </AdminDetailField>
          <AdminDetailField label="Descuento total">
            {(editable ? previewDiscount : orderDiscountTotal(order)) > 0.004 ? (
              <span className="font-semibold text-emerald-800">
                −{formatUsdMoney(editable ? previewDiscount : orderDiscountTotal(order))}
              </span>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </AdminDetailField>
          <AdminDetailField label="Total acordado (sin IVA)">
            <span className="text-lg font-bold tabular-nums text-zinc-900">
              {formatUsdMoney(editable ? previewTotal : Number(order.total_amount))}
            </span>
          </AdminDetailField>
        </div>

        {editable ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              className={adminPrimaryBtn}
              disabled={saving || items.length === 0}
              onClick={() => void save()}
            >
              {saving ? "Guardando…" : "Guardar precios acordados"}
            </button>
          </div>
        ) : null}
          </AdminDetailInset>
        </AdminDetailSection>
      ) : null}
    </div>
  );
}
