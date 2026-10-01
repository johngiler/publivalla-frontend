"use client";

import { useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import {
  adminField,
  adminLabel,
  adminSecondaryBtn,
} from "@/components/admin/adminFormStyles";
import { authFetch } from "@/services/authApi";

const finishBtn =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[15px] bg-gradient-to-r from-red-600 via-red-600 to-red-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * @param {{
 *   open: boolean;
 *   order: { id?: number|string, split_payment_enabled?: boolean } | null;
 *   accessToken?: string | null;
 *   onClose: () => void;
 *   onDone: (order: Record<string, unknown>) => void | Promise<void>;
 * }} props
 */
export function FinishContractDialog({ open, order, accessToken, onClose, onDone }) {
  const split = order?.split_payment_enabled === true;
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setRefund("");
    setErr("");
    setBusy(false);
  }, [open, order?.id]);

  async function submit() {
    const cleaned = note.trim();
    if (!cleaned) {
      setErr("Escribe el motivo de la finalización.");
      return;
    }
    if (!order?.id) return;
    setBusy(true);
    setErr("");
    try {
      const body = { note: cleaned };
      if (!split && refund.trim() !== "") body.refund_amount = refund.trim();
      const updated = await authFetch(`/api/orders/${order.id}/finish-contract/`, {
        method: "POST",
        body,
        token: accessToken,
      });
      await onDone(updated);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo finalizar el contrato.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Finalizar contrato"
      canClose={!busy}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={adminSecondaryBtn}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={finishBtn}
            disabled={busy}
            aria-busy={busy}
            onClick={() => void submit()}
          >
            {busy ? "Finalizando…" : "Finalizar contrato"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {err ? (
          <p className="rounded-[12px] bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {err}
          </p>
        ) : null}
        <div>
          <label className={adminLabel} htmlFor="finish-contract-note">
            Observaciones
          </label>
          <textarea
            id="finish-contract-note"
            className={`${adminField} mt-1.5 min-h-24`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
        </div>
        {split ? null : (
          <div>
            <label className={adminLabel} htmlFor="finish-contract-refund">
              Reembolso (USD)
            </label>
            <input
              id="finish-contract-refund"
              className={`${adminField} mt-1.5`}
              inputMode="decimal"
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              placeholder="0.00"
            />
          </div>
        )}
      </div>
    </AdminModal>
  );
}
