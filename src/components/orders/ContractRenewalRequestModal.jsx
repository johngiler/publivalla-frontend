"use client";

import { useMemo, useState } from "react";

import {
  AdminAvailabilityBlockMonthPicker,
  monthsFromSelectionPick,
} from "@/components/admin/AdminAvailabilityBlockMonthPicker";
import { AdminModal } from "@/components/admin/AdminModal";
import {
  adminField,
  adminLabel,
  adminPrimaryBtn,
  adminSecondaryBtn,
} from "@/components/admin/adminFormStyles";
import { AdminInlineAlert } from "@/components/admin/AdminInlineAlert";
import { authFetch } from "@/services/authApi";

function nextMonthAfterEnd(endDateIso) {
  const s = String(endDateIso || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m] = s.split("-").map(Number);
  if (m === 12) return { year: y + 1, month: 1 };
  return { year: y, month: m + 1 };
}

/**
 * @param {{
 *   open: boolean;
 *   contract: Record<string, unknown> | null;
 *   onClose: () => void;
 *   onSubmitted: () => void | Promise<void>;
 * }} props
 */
export function ContractRenewalRequestModal({ open, contract, onClose, onSubmitted }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const [pick, setPick] = useState(null);

  const minMonth = useMemo(
    () => (contract?.end_date ? nextMonthAfterEnd(contract.end_date) : null),
    [contract?.end_date],
  );

  const months = useMemo(() => monthsFromSelectionPick(pick), [pick]);
  const canSubmit = months.length > 0 && Boolean(contract?.ad_space_id);

  async function submit() {
    if (!contract?.id || !canSubmit) return;
    setErr("");
    setPending(true);
    try {
      await authFetch(`/api/me/contracts/${contract.id}/renewal/`, {
        method: "POST",
        body: {
          months,
          client_note: note.trim(),
        },
      });
      await onSubmitted();
      onClose();
      setNote("");
      setPick(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={() => {
        if (pending) return;
        onClose();
        setErr("");
        setPick(null);
      }}
      title="Solicitar renovación"
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={adminSecondaryBtn}
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={adminPrimaryBtn}
            onClick={() => void submit()}
            disabled={pending || !canSubmit}
            aria-busy={pending}
          >
            {pending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {err ? <AdminInlineAlert variant="error">{err}</AdminInlineAlert> : null}
        <p className="text-sm text-zinc-700">
          {contract?.ad_space_code ? (
            <>
              Extiende <span className="font-semibold">{String(contract.ad_space_code)}</span> a
              partir del mes siguiente al fin del contrato.
            </>
          ) : (
            "Extiende el contrato a partir del mes siguiente al fin del periodo actual."
          )}
        </p>
        {contract?.ad_space_id && minMonth ? (
          <AdminAvailabilityBlockMonthPicker
            key={`renewal-${contract.id}`}
            adSpaceId={contract.ad_space_id}
            title="Meses a renovar"
            idleHint={null}
            minSelectableMonth={minMonth}
            contiguousFromMin
            onSelectionChange={setPick}
          />
        ) : (
          <p className="text-sm text-zinc-500">No se pudo determinar el periodo de renovación.</p>
        )}
        <div>
          <label className={adminLabel} htmlFor="renewal-note">
            Nota (opcional)
          </label>
          <textarea
            id="renewal-note"
            className={adminField}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
    </AdminModal>
  );
}
