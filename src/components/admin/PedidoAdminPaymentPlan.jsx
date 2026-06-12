"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDetailSection } from "@/components/admin/AdminAccordionDetail";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { OrderPaymentInstallmentsPanel } from "@/components/orders/OrderPaymentInstallmentsPanel";
import { IconRowTrash } from "@/components/admin/rowActionIcons";
import { adminPrimaryBtn, adminSecondaryBtn } from "@/components/admin/adminFormStyles";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { orderAdminCommercialEditable } from "@/lib/orderAdminWorkflow";
import {
  formatPlanMonthLabel,
  monthKey,
  orderCalendarMonthsFromItems,
  orderUsesSplitPayment,
  parseMonthKey,
} from "@/lib/orderPaymentPlan";
import { authFetch } from "@/services/authApi";

const GROUP_COLORS = [
  "bg-violet-100 text-violet-900 ring-violet-200/80",
  "bg-sky-100 text-sky-900 ring-sky-200/80",
  "bg-amber-100 text-amber-900 ring-amber-200/80",
  "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  "bg-rose-100 text-rose-900 ring-rose-200/80",
  "bg-indigo-100 text-indigo-900 ring-indigo-200/80",
];

function groupsFromPlan(order) {
  const inst = order?.payment_plan?.installments;
  if (!Array.isArray(inst) || inst.length === 0) return [];
  return inst.map((row) =>
    (Array.isArray(row.months) ? row.months : []).map((m) => ({
      year: Number(m.year),
      month: Number(m.month),
    })),
  );
}

/**
 * @param {{
 *   order: Record<string, unknown>;
 *   panelId: string;
 *   accessToken?: string | null;
 *   onSaved?: () => void | Promise<void>;
 * }} props
 */
export function PedidoAdminPaymentPlan({ order, panelId, accessToken, onSaved }) {
  const orderId = order?.id;
  const commerciallyEditable = orderAdminCommercialEditable(order);
  const planLocked = order?.payment_plan?.editable === false;
  const editable = commerciallyEditable && !planLocked;
  const calendarMonths = useMemo(() => {
    const fromApi = order?.payment_plan?.calendar_months;
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      return fromApi.map((m) => ({
        year: Number(m.year),
        month: Number(m.month),
        label: m.label || formatPlanMonthLabel(m.year, m.month),
      }));
    }
    return orderCalendarMonthsFromItems(order);
  }, [order, order?.payment_plan?.calendar_months]);

  const [open, setOpen] = useState(orderUsesSplitPayment(order));
  const [groups, setGroups] = useState(() => groupsFromPlan(order));
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setOpen(orderUsesSplitPayment(order));
    setGroups(groupsFromPlan(order));
    setSelected(new Set());
    setErr("");
    setMsg("");
  }, [orderId, order?.split_payment_enabled, order?.payment_plan?.installments]);

  const assignedMap = useMemo(() => {
    const map = new Map();
    groups.forEach((g, gi) => {
      for (const m of g) {
        map.set(monthKey(m.year, m.month), gi);
      }
    });
    return map;
  }, [groups]);

  const unassigned = useMemo(
    () =>
      calendarMonths.filter((m) => !assignedMap.has(monthKey(m.year, m.month))),
    [calendarMonths, assignedMap],
  );

  const toggleMonth = useCallback((year, month) => {
    const k = monthKey(year, month);
    if (assignedMap.has(k)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, [assignedMap]);

  const addGroupFromSelection = useCallback(() => {
    if (selected.size === 0) {
      setErr("Selecciona al menos un mes para agrupar en una cuota.");
      return;
    }
    const months = [...selected].map(parseMonthKey).sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );
    for (let i = 1; i < months.length; i += 1) {
      const prev = months[i - 1];
      const cur = months[i];
      const expectedM = prev.month === 12 ? 1 : prev.month + 1;
      const expectedY = prev.month === 12 ? prev.year + 1 : prev.year;
      if (cur.year !== expectedY || cur.month !== expectedM) {
        setErr("Los meses de una cuota deben ser consecutivos.");
        return;
      }
    }
    setGroups((g) => [...g, months]);
    setSelected(new Set());
    setErr("");
  }, [selected]);

  const removeGroup = useCallback((index) => {
    setGroups((g) => g.filter((_, i) => i !== index));
  }, []);

  const save = useCallback(async () => {
    setErr("");
    setMsg("");
    if (!orderId) return;
    if (!open) {
      setSaving(true);
      try {
        await authFetch(`/api/orders/${orderId}/payment-plan/`, {
          method: "PATCH",
          body: { enabled: false, installments: [] },
          token: accessToken,
        });
        setMsg("Plan de pago desactivado.");
        await onSaved?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "No se pudo guardar.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (groups.length === 0) {
      setErr("Agrupa todos los meses del pedido en al menos una cuota.");
      return;
    }
    const assigned = new Set();
    for (const g of groups) {
      for (const m of g) assigned.add(monthKey(m.year, m.month));
    }
    for (const m of calendarMonths) {
      if (!assigned.has(monthKey(m.year, m.month))) {
        setErr("Debes asignar todos los meses del pedido a una cuota.");
        return;
      }
    }
    setSaving(true);
    try {
      await authFetch(`/api/orders/${orderId}/payment-plan/`, {
        method: "PATCH",
        body: {
          enabled: true,
          installments: groups.map((g) => ({ months: g })),
        },
        token: accessToken,
      });
      setMsg("Plan de pago guardado.");
      await onSaved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  }, [open, groups, calendarMonths, orderId, onSaved, accessToken]);

  if (!editable && !orderUsesSplitPayment(order)) return null;

  return (
    <div className="space-y-4">
      {editable ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-zinc-200/90 bg-zinc-50/60 px-4 py-3 ring-1 ring-zinc-100/80">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-[color:var(--mp-primary)] focus:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]"
            checked={open}
            onChange={(e) => {
              setOpen(e.target.checked);
              if (!e.target.checked) {
                setGroups([]);
                setSelected(new Set());
              }
            }}
          />
          <span className="min-w-0 text-sm leading-snug text-zinc-800">
            <span className="font-semibold text-zinc-900">Pago por partes</span>
            <span className="mt-0.5 block text-zinc-600">
              Divide el pedido en cuotas; la primera activa el contrato; el resto se cobra según
              el calendario acordado. Aparecerá en la hoja de negociación y en las facturas.
            </span>
          </span>
        </label>
      ) : null}

      {open ? (
        <AdminDetailSection panelId={panelId} sectionId="payment-plan" title="Plan de pagos">
          {err ? <AdminInlineAlert variant="error">{err}</AdminInlineAlert> : null}
          {msg ? <AdminInlineAlert variant="success">{msg}</AdminInlineAlert> : null}

          {editable ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Meses del pedido
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {calendarMonths.map((m) => {
                    const k = monthKey(m.year, m.month);
                    const gi = assignedMap.get(k);
                    const isSelected = selected.has(k);
                    const color =
                      gi != null
                        ? GROUP_COLORS[gi % GROUP_COLORS.length]
                        : isSelected
                          ? "bg-zinc-800 text-white ring-zinc-700"
                          : "bg-white text-zinc-800 ring-zinc-200/90 hover:bg-zinc-50";
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={gi != null}
                        onClick={() => toggleMonth(m.year, m.month)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${color} disabled:cursor-default`}
                      >
                        {m.label}
                        {gi != null ? ` · Cuota ${gi + 1}` : ""}
                      </button>
                    );
                  })}
                </div>
                {unassigned.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Selecciona meses consecutivos y pulsa «Nueva cuota».
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={adminSecondaryBtn}
                  disabled={selected.size === 0}
                  onClick={addGroupFromSelection}
                >
                  Nueva cuota con selección
                </button>
              </div>

              {groups.length > 0 ? (
                <ul className="space-y-2 text-sm text-zinc-800">
                  {groups.map((g, i) => (
                    <li
                      key={`g-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-zinc-200/90 bg-white px-3 py-2"
                    >
                      <span>
                        <strong>Cuota {i + 1}:</strong>{" "}
                        {g.map((m) => formatPlanMonthLabel(m.year, m.month)).join(", ")}
                        {i === 0 ? (
                          <span className="ml-2 text-xs text-zinc-500">(activa contrato)</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className={`${ROUNDED_CONTROL} shrink-0 p-2 text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_30%,transparent)]`}
                        onClick={() => removeGroup(i)}
                        aria-label={`Eliminar cuota ${i + 1}`}
                        title={`Eliminar cuota ${i + 1}`}
                      >
                        <IconRowTrash className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button
                type="button"
                className={adminPrimaryBtn}
                disabled={saving || !accessToken}
                onClick={save}
              >
                {saving ? "Guardando…" : "Guardar plan de pago"}
              </button>
            </div>
          ) : null}

          {orderUsesSplitPayment(order) ? (
            <div className={editable ? "mt-6 border-t border-zinc-100 pt-6" : ""}>
              <OrderPaymentInstallmentsPanel
                order={order}
                mode="admin"
                accessToken={accessToken}
                onSaved={onSaved}
              />
            </div>
          ) : null}
        </AdminDetailSection>
      ) : null}
    </div>
  );
}
