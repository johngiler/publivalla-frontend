"use client";

import { useCallback, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/AdminModal";
import { OrderAttachmentAdminPreview } from "@/components/admin/PedidoDocumentosNegociacionAdmin";
import { adminPrimaryBtn, adminSecondaryBtn } from "@/components/admin/adminFormStyles";
import {
  marketplacePrimaryBtn,
  marketplaceSecondaryBtn,
} from "@/lib/marketplaceActionButtons";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import {
  formatPlanMonthLabel,
  installmentStatusPillClass,
  orderUsesSplitPayment,
} from "@/lib/orderPaymentPlan";
import { mediaAbsoluteUrl } from "@/lib/mediaUrls";
import { ROUNDED_CONTROL } from "@/lib/uiRounding";
import { authFetch, authFetchForm } from "@/services/authApi";

const tableActionBtn =
  "text-left text-xs font-semibold text-zinc-700 underline-offset-2 transition hover:text-zinc-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline";

function installmentPeriodLabel(inst) {
  if (inst.months_label) return String(inst.months_label);
  if (Array.isArray(inst.months)) {
    return inst.months.map((m) => formatPlanMonthLabel(m.year, m.month)).join(", ");
  }
  return "—";
}

/**
 * Tabla de cuotas del plan de pago (admin o cliente).
 * @param {{
 *   order: Record<string, unknown>;
 *   mode: "admin" | "client";
 *   accessToken?: string | null;
 *   onSaved?: () => void | Promise<void>;
 * }} props
 */
export function OrderPaymentInstallmentsPanel({ order, mode, accessToken, onSaved }) {
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const [invoiceModalInst, setInvoiceModalInst] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [receiptModalInst, setReceiptModalInst] = useState(
    /** @type {Record<string, unknown> | null} */ (null),
  );
  const [invoiceFile, setInvoiceFile] = useState(/** @type {File | null} */ (null));
  const [receiptFile, setReceiptFile] = useState(/** @type {File | null} */ (null));

  const installments = useMemo(() => {
    const rows = order?.payment_plan?.installments;
    return Array.isArray(rows) ? rows : [];
  }, [order?.payment_plan?.installments]);

  const orderId = order?.id;
  const isAdmin = mode === "admin";
  const canClientReceipt =
    !isAdmin && (order?.status === "invoiced" || order?.status === "paid");

  const closeInvoiceModal = useCallback(() => {
    setInvoiceModalInst(null);
    setInvoiceFile(null);
  }, []);

  const closeReceiptModal = useCallback(() => {
    setReceiptModalInst(null);
    setReceiptFile(null);
  }, []);

  const generateInvoice = useCallback(
    async (inst) => {
      if (!orderId || !inst?.id) return;
      setErr("");
      setBusyId(inst.id);
      try {
        await authFetch(
          `/api/orders/${orderId}/payment-plan/installments/${inst.id}/generate-invoice/`,
          { method: "POST", token: accessToken },
        );
        closeInvoiceModal();
        await onSaved?.();
      } catch (e) {
        setErr(
          e instanceof Error ? e.message : "No se pudo generar la factura de la cuota.",
        );
      } finally {
        setBusyId(null);
      }
    },
    [accessToken, closeInvoiceModal, onSaved, orderId],
  );

  const saveInvoiceDigital = useCallback(
    async (inst) => {
      if (!invoiceFile || !orderId || !inst?.id) return;
      setErr("");
      setBusyId(inst.id);
      try {
        const fd = new FormData();
        fd.append("invoice_digital", invoiceFile);
        await authFetchForm(
          `/api/orders/${orderId}/payment-plan/installments/${inst.id}/invoice-digital/`,
          { method: "POST", formData: fd, token: accessToken },
        );
        closeInvoiceModal();
        await onSaved?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "No se pudo guardar la factura.");
      } finally {
        setBusyId(null);
      }
    },
    [accessToken, closeInvoiceModal, invoiceFile, onSaved, orderId],
  );

  const saveReceipt = useCallback(
    async (inst) => {
      if (!receiptFile || !orderId || !inst?.id) return;
      setErr("");
      setBusyId(inst.id);
      try {
        const fd = new FormData();
        fd.append("payment_receipt", receiptFile);
        await authFetchForm(
          `/api/orders/${orderId}/payment-plan/installments/${inst.id}/payment-receipt/`,
          { method: "PATCH", formData: fd, token: accessToken },
        );
        closeReceiptModal();
        await onSaved?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "No se pudo guardar el comprobante.");
      } finally {
        setBusyId(null);
      }
    },
    [accessToken, closeReceiptModal, onSaved, orderId, receiptFile],
  );

  if (!orderUsesSplitPayment(order)) return null;

  const invoiceModalUrl = invoiceModalInst?.invoice_file_url
    ? mediaAbsoluteUrl(String(invoiceModalInst.invoice_file_url))
    : "";
  const receiptModalUrl = receiptModalInst?.payment_receipt_url
    ? mediaAbsoluteUrl(String(receiptModalInst.payment_receipt_url))
    : "";

  return (
    <div className="space-y-4">
      {err ? (
        <p className={`${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
          {err}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-[12px] border border-zinc-200/90">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2.5">Cuota</th>
              <th className="px-3 py-2.5">Periodo</th>
              <th className="px-3 py-2.5">Vence</th>
              <th className="px-3 py-2.5">Monto (sin IVA)</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Factura</th>
              <th className="px-3 py-2.5">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => {
              const invoiceUrl = inst.invoice_file_url
                ? mediaAbsoluteUrl(String(inst.invoice_file_url))
                : "";
              const receiptUrl = inst.payment_receipt_url
                ? mediaAbsoluteUrl(String(inst.payment_receipt_url))
                : "";
              const statusLbl = inst.status_label || inst.status || "—";
              const canGenerateInvoice =
                isAdmin &&
                (inst.can_generate_invoice === true ||
                  (!invoiceUrl && String(inst.status ?? "") === "pending"));
              const canUploadReceipt = !isAdmin && canClientReceipt && !receiptUrl;
              return (
                <tr key={inst.id} className="border-b border-zinc-100 align-middle">
                  <td className="px-3 py-3 tabular-nums">
                    {inst.sequence}
                    {inst.activates_contract ? (
                      <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">
                        Activa contrato
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-zinc-800">{installmentPeriodLabel(inst)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-zinc-700">
                    {inst.due_date || "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-zinc-900">
                    {inst.amount != null ? `$${inst.amount}` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${installmentStatusPillClass(inst.status)}`}
                    >
                      {statusLbl}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {invoiceUrl ? (
                        <button
                          type="button"
                          className={tableActionBtn}
                          onClick={() => setInvoiceModalInst(inst)}
                        >
                          Ver factura
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Pendiente</span>
                      )}
                      {canGenerateInvoice ? (
                        <button
                          type="button"
                          className={tableActionBtn}
                          disabled={busyId === inst.id}
                          onClick={() => generateInvoice(inst)}
                        >
                          {busyId === inst.id ? "Generando…" : "Generar factura"}
                        </button>
                      ) : null}
                      {isAdmin ? (
                        <button
                          type="button"
                          className={tableActionBtn}
                          onClick={() => {
                            setInvoiceFile(null);
                            setInvoiceModalInst(inst);
                          }}
                        >
                          {invoiceUrl ? "Reemplazar factura" : "Subir factura"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {receiptUrl ? (
                        <button
                          type="button"
                          className={tableActionBtn}
                          onClick={() => setReceiptModalInst(inst)}
                        >
                          Ver comprobante
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Sin comprobante</span>
                      )}
                      {canUploadReceipt ? (
                        <button
                          type="button"
                          className={tableActionBtn}
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptModalInst(inst);
                          }}
                        >
                          Subir comprobante
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={Boolean(invoiceModalInst)}
        onClose={closeInvoiceModal}
        title={
          invoiceModalInst
            ? `Factura — cuota ${invoiceModalInst.sequence}`
            : "Factura"
        }
        subtitle={
          invoiceModalInst ? installmentPeriodLabel(invoiceModalInst) : undefined
        }
        maxWidthClass="max-w-xl"
        canClose={busyId !== invoiceModalInst?.id}
        footer={
          isAdmin ? (
            <div className="flex flex-wrap justify-end gap-2">
              {invoiceModalInst &&
              !invoiceModalUrl &&
              (invoiceModalInst.can_generate_invoice === true ||
                String(invoiceModalInst.status ?? "") === "pending") ? (
                <button
                  type="button"
                  className={adminSecondaryBtn}
                  disabled={busyId === invoiceModalInst.id || !accessToken}
                  onClick={() => generateInvoice(invoiceModalInst)}
                >
                  {busyId === invoiceModalInst.id
                    ? "Generando…"
                    : "Generar factura del sistema"}
                </button>
              ) : null}
              <button
                type="button"
                className={adminSecondaryBtn}
                disabled={busyId === invoiceModalInst?.id}
                onClick={closeInvoiceModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={adminPrimaryBtn}
                disabled={
                  !invoiceFile ||
                  busyId === invoiceModalInst?.id ||
                  !accessToken ||
                  !invoiceModalInst
                }
                onClick={() => invoiceModalInst && saveInvoiceDigital(invoiceModalInst)}
              >
                {busyId === invoiceModalInst?.id ? "Guardando…" : "Guardar factura"}
              </button>
            </div>
          ) : null
        }
      >
        {invoiceModalInst ? (
          <div className="space-y-4">
            {invoiceModalUrl ? (
              <OrderAttachmentAdminPreview
                order={order}
                title={`Factura cuota ${invoiceModalInst.sequence}`}
                downloadBase={`factura-cuota-${invoiceModalInst.sequence}`}
                fileUrl={invoiceModalUrl}
                emptyHint=""
              />
            ) : (
              <p className="text-sm text-zinc-600">
                Aún no hay factura para esta cuota. Puedes adjuntar una cuando el equipo la
                emita o reemplazar la del sistema.
              </p>
            )}
            {isAdmin ? (
              <FileDropZoneField
                id={`inv-cuota-modal-${invoiceModalInst.id}`}
                label={invoiceModalUrl ? "Reemplazar factura" : "Adjuntar factura"}
                value={invoiceFile}
                onChange={setInvoiceFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatsHint="JPG, PNG, WebP o PDF"
                dropZoneAriaLabel={`Factura cuota ${invoiceModalInst.sequence}`}
              />
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(receiptModalInst)}
        onClose={closeReceiptModal}
        title={
          receiptModalInst
            ? `Comprobante — cuota ${receiptModalInst.sequence}`
            : "Comprobante"
        }
        subtitle={
          receiptModalInst ? installmentPeriodLabel(receiptModalInst) : undefined
        }
        maxWidthClass="max-w-xl"
        canClose={busyId !== receiptModalInst?.id}
        footer={
          !isAdmin && receiptModalInst && !receiptModalUrl ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={marketplaceSecondaryBtn}
                disabled={busyId === receiptModalInst?.id}
                onClick={closeReceiptModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={marketplacePrimaryBtn}
                disabled={!receiptFile || busyId === receiptModalInst?.id}
                onClick={() => saveReceipt(receiptModalInst)}
              >
                {busyId === receiptModalInst?.id ? "Enviando…" : "Enviar comprobante"}
              </button>
            </div>
          ) : null
        }
      >
        {receiptModalInst ? (
          <div className="space-y-4">
            {receiptModalUrl ? (
              <OrderAttachmentAdminPreview
                order={order}
                title={`Comprobante cuota ${receiptModalInst.sequence}`}
                downloadBase={`comprobante-cuota-${receiptModalInst.sequence}`}
                fileUrl={receiptModalUrl}
                emptyHint=""
                imageFit="cover"
              />
            ) : (
              <p className="text-sm text-zinc-600">
                Adjunta el comprobante de pago de esta cuota.
              </p>
            )}
            {!isAdmin && canClientReceipt && !receiptModalUrl ? (
              <FileDropZoneField
                id={`rec-cuota-modal-${receiptModalInst.id}`}
                label="Adjuntar comprobante"
                value={receiptFile}
                onChange={setReceiptFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatsHint="JPG, PNG, WebP o PDF"
                dropZoneAriaLabel={`Comprobante cuota ${receiptModalInst.sequence}`}
              />
            ) : null}
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
