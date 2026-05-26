"use client";

import { useCallback, useMemo, useState } from "react";

import { AdminDetailInset, AdminDetailSection } from "@/components/admin/AdminAccordionDetail";
import { PedidoInformacionAdicionalAdmin } from "@/components/admin/PedidoInformacionAdicionalAdmin";
import { adminPrimaryBtn } from "@/components/admin/adminFormStyles";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import {
  IcDownload,
  IcExternal,
  PdfPreview,
  pdfPreviewCompactIconButtonClass,
} from "@/components/media/PdfPreview";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import { isPdfReceiptUrl } from "@/lib/orderPaymentMethods";
import { ROUNDED_CONTROL, ROUNDED_PDF_GRID_CARD } from "@/lib/uiRounding";
import { normalizeMediaUrlForUi } from "@/lib/mediaUrls";
import { authFetchBlob, authFetchForm, mediaAbsoluteUrl } from "@/services/authApi";

function orderDocFilename(order, base) {
  const ref = String(order?.code || order?.id || "pedido")
    .replace(/#/g, "")
    .replace(/\//g, "-");
  return `${base}-${ref}.pdf`;
}

const orderPdfGridPreviewProps = {
  compact: true,
  className: "min-w-0",
  previewMinHeightClass: "min-h-[112px] h-[min(18vh,168px)]",
};

/**
 * Vista previa admin alineada con ``PdfPreview`` de la rejilla (PDF en iframe; imagen con la misma barra de acciones).
 */
export function OrderAttachmentAdminPreview({
  title,
  fileUrl,
  emptyHint,
  order,
  downloadBase,
  imageFit = "contain",
}) {
  const raw = fileUrl != null ? String(fileUrl).trim() : "";
  const abs = raw ? mediaAbsoluteUrl(raw) : "";
  const direct = raw ? normalizeMediaUrlForUi(raw) : "";
  const kind = raw ? orderArtKindFromUrls(raw, abs) : "other";
  const orderId = order?.id ?? "";
  const loadKey = `${orderId}-${downloadBase}-${raw}`;
  const downloadFileName = orderDocFilename(order, downloadBase);

  if (!raw) {
    return (
      <PdfPreview
        {...orderPdfGridPreviewProps}
        title={title}
        downloadFileName={downloadFileName}
        disabled
        emptyHint={emptyHint}
        loadKey={`${orderId}-${downloadBase}-empty`}
      />
    );
  }

  if (kind === "image") {
    return (
      <div
        className={`min-w-0 ${ROUNDED_PDF_GRID_CARD} border border-zinc-200/90 bg-white shadow-sm`}
        aria-label={title}
      >
        <div className="flex flex-row items-center gap-2 border-b border-zinc-100 bg-zinc-50/90 px-2 py-2">
          <h4 className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-zinc-900">
            {title}
          </h4>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={abs}
              download={downloadFileName}
              className={pdfPreviewCompactIconButtonClass}
              aria-label="Descargar"
              title="Descargar"
            >
              <IcDownload className="h-4 w-4" />
            </a>
            <a
              href={abs}
              target="_blank"
              rel="noopener noreferrer"
              className={pdfPreviewCompactIconButtonClass}
              aria-label="Abrir en pestaña nueva"
              title="Abrir en pestaña nueva"
            >
              <IcExternal className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="p-1.5">
          <div
            className={
              imageFit === "cover"
                ? "relative min-h-[112px] h-[min(18vh,168px)] w-full overflow-hidden border border-zinc-200 bg-zinc-100 shadow-sm"
                : ""
            }
          >
            <RasterFromApiUrl
              url={raw}
              alt={title}
              className={
                imageFit === "cover"
                  ? "absolute inset-0 h-full w-full object-cover"
                  : "max-h-[min(10rem,32vh)] w-auto max-w-full rounded-none border border-zinc-200 object-contain shadow-sm"
              }
              {...catalogRasterImgAttrs}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <PdfPreview
      {...orderPdfGridPreviewProps}
      title={title}
      downloadFileName={downloadFileName}
      disabled={false}
      emptyHint="No se pudo cargar la vista previa del documento."
      loadKey={loadKey}
      directUrl={direct || abs}
      embedHideSidebar
    />
  );
}

/** @param {string} raw @param {string} abs */
function orderArtKindFromUrls(raw, abs) {
  const r = String(raw || "");
  const a = String(abs || "");
  if (isPdfReceiptUrl(r) || isPdfReceiptUrl(a)) return "pdf";
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(r) || /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(a)) {
    return "image";
  }
  return "other";
}

/**
 * @param {{
 *   order: Record<string, unknown>;
 *   panelId: string;
 *   accessToken: string | null | undefined;
 *   onSaved: () => Promise<void> | void;
 * }} props
 */
export function PedidoDocumentosNegociacionAdmin({ order, panelId, accessToken, onSaved }) {
  const id = order?.id;
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [invoiceDigitalFile, setInvoiceDigitalFile] = useState(null);

  const fetchNegotiationPdf = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-negotiation-sheet/`, { token: accessToken });
  }, [accessToken, id]);

  const fetchMunicipalityPdf = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-municipality-letter/`, { token: accessToken });
  }, [accessToken, id]);

  const fetchInvoicePdf = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-invoice/`, { token: accessToken });
  }, [accessToken, id]);

  const fetchInstallationPermitRequestPdf = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-installation-permit-request/`, {
      token: accessToken,
    });
  }, [accessToken, id]);

  const fetchNegotiationSignedBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-negotiation-sheet-signed/`, { token: accessToken });
  }, [accessToken, id]);

  const negotiationPdfPreviewLoadKey = useMemo(
    () => (id != null ? `negotiation-${id}` : "negotiation"),
    [id],
  );

  const uploadInvoiceDigital = useCallback(
    async (file) => {
      if (!id || !accessToken || !file) return;
      setErr("");
      setBusy("invoice-digital");
      try {
        const fd = new FormData();
        fd.append("invoice_digital", file);
        await authFetchForm(`/api/orders/${id}/`, {
          method: "PATCH",
          formData: fd,
          token: accessToken,
        });
        setInvoiceDigitalFile(null);
        await onSaved();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "No se pudo adjuntar la factura.");
      } finally {
        setBusy("");
      }
    },
    [accessToken, id, onSaved],
  );

  const handleInvoiceDigitalChange = useCallback((file) => {
    setInvoiceDigitalFile(file);
  }, []);

  const saveInvoiceDigital = useCallback(() => {
    if (!invoiceDigitalFile) return;
    void uploadInvoiceDigital(invoiceDigitalFile);
  }, [invoiceDigitalFile, uploadInvoiceDigital]);

  const signedUrl = order?.negotiation_sheet_signed_url
    ? mediaAbsoluteUrl(String(order.negotiation_sheet_signed_url))
    : "";

  const hasExternalInvoice = Boolean(order?.has_external_invoice);
  const invoiceDigitalUrl = order?.invoice_digital_url
    ? String(order.invoice_digital_url)
    : "";
  const hasGeneratedInvoicePdf = Boolean(order?.invoice_pdf_url);
  const orderCodeKey = String(order?.code ?? id ?? "").trim();

  return (
    <div className="space-y-4">
      <PedidoInformacionAdicionalAdmin order={order} panelId={panelId} />

      <AdminDetailSection panelId={panelId} sectionId="digital-files" title="Archivos digitales">
        <AdminDetailInset className="space-y-4">
          {err ? (
            <p className={`${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
              {err}
            </p>
          ) : null}
          <FileDropZoneField
            id={`invd-${id}`}
            label="Adjuntar factura digital"
            value={invoiceDigitalFile}
            onChange={handleInvoiceDigitalChange}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            helperText={
              hasExternalInvoice
                ? "El cliente verá este archivo en lugar de la nota de cobro del sistema. Selecciona un archivo y pulsa Guardar; puedes reemplazar el actual."
                : "Si la adjuntas antes o después de facturar, el cliente verá este archivo en lugar de la nota de cobro generada por el sistema. Selecciona el archivo y pulsa Guardar."
            }
            formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
            formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
            dropZoneAriaLabel="Zona para adjuntar factura digital"
          />
          <button
            type="button"
            disabled={
              !invoiceDigitalFile || busy === "invoice-digital" || !id || !accessToken
            }
            onClick={() => saveInvoiceDigital()}
            className={`${adminPrimaryBtn} px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {busy === "invoice-digital" ? "Guardando…" : "Guardar"}
          </button>
        </AdminDetailInset>
      </AdminDetailSection>

      <AdminDetailSection
        panelId={panelId}
        sectionId="docs-pdf"
        title="Documentos, comprobantes y permisos"
      >
        <AdminDetailInset className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-3">
            {signedUrl ? (
              isPdfReceiptUrl(signedUrl) ? (
                <PdfPreview
                  {...orderPdfGridPreviewProps}
                  title="Hoja de negociación"
                  downloadFileName={orderDocFilename(order, "hoja-negociacion-firmada")}
                  disabled={false}
                  emptyHint="Documento no disponible."
                  loadKey={`${id}-negotiation-signed-blob`}
                  onFetchBlob={fetchNegotiationSignedBlob}
                />
              ) : (
                <div
                  className={`min-w-0 ${ROUNDED_PDF_GRID_CARD} border border-zinc-200/90 bg-white shadow-sm`}
                  aria-label="Hoja de negociación"
                >
                  <div className="flex flex-row items-center gap-2 border-b border-zinc-100 bg-zinc-50/90 px-2 py-2">
                    <h4 className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-zinc-900">
                      Hoja de negociación
                    </h4>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={signedUrl}
                        download={orderDocFilename(order, "hoja-negociacion-firmada")}
                        className={pdfPreviewCompactIconButtonClass}
                        aria-label="Descargar"
                        title="Descargar"
                      >
                        <IcDownload className="h-4 w-4" />
                      </a>
                      <a
                        href={signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={pdfPreviewCompactIconButtonClass}
                        aria-label="Abrir en pestaña nueva"
                        title="Abrir en pestaña nueva"
                      >
                        <IcExternal className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <RasterFromApiUrl
                      url={order.negotiation_sheet_signed_url}
                      alt="Hoja de negociación firmada por la empresa"
                      className="max-h-[min(10rem,32vh)] w-auto max-w-full rounded-none border border-zinc-200 object-contain shadow-sm"
                    />
                  </div>
                </div>
              )
            ) : order?.negotiation_sheet_pdf_url ? (
              <PdfPreview
                {...orderPdfGridPreviewProps}
                title="Hoja de negociación"
                downloadFileName={orderDocFilename(order, "hoja-negociacion")}
                disabled={false}
                emptyHint="Se genera cuando el pedido pasa a «Solicitud aprobada»."
                loadKey={negotiationPdfPreviewLoadKey}
                onFetchBlob={fetchNegotiationPdf}
              />
            ) : (
              <PdfPreview
                {...orderPdfGridPreviewProps}
                title="Hoja de negociación"
                downloadFileName={orderDocFilename(order, "hoja-negociacion")}
                disabled
                emptyHint="Aún no hay PDF de negociación ni archivo firmado de la empresa."
                loadKey={`${id}-negotiation-empty`}
              />
            )}
            <PdfPreview
              {...orderPdfGridPreviewProps}
              title="Carta al municipio"
              downloadFileName={orderDocFilename(order, "carta-municipio")}
              disabled={!order?.municipality_authorization_pdf_url}
              emptyHint="Se genera al aprobar la solicitud; úsala para trámites ante el municipio."
              loadKey={`${id}-municipality`}
              onFetchBlob={fetchMunicipalityPdf}
            />
            {invoiceDigitalUrl ? (
              <OrderAttachmentAdminPreview
                order={order}
                title="Factura/Nota de cobro"
                downloadBase="factura"
                fileUrl={invoiceDigitalUrl}
                emptyHint="Factura digital no disponible."
              />
            ) : (
              <PdfPreview
                {...orderPdfGridPreviewProps}
                title="Factura/Nota de cobro"
                downloadFileName={orderDocFilename(order, "factura")}
                disabled={!hasGeneratedInvoicePdf}
                emptyHint="Se genera al facturar, salvo que adjuntes una factura digital arriba."
                loadKey={`${id}-invoice-${orderCodeKey}`}
                onFetchBlob={fetchInvoicePdf}
              />
            )}
            <OrderAttachmentAdminPreview
              order={order}
              title="Comprobante de pago"
              downloadBase="comprobante"
              fileUrl={order?.payment_receipt_url}
              emptyHint="La empresa puede subir el comprobante cuando el pedido esté facturado o pagado, desde Mis pedidos."
              imageFit="cover"
            />
            <PdfPreview
              {...orderPdfGridPreviewProps}
              title="Solicitud permiso instalación"
              downloadFileName={orderDocFilename(order, "solicitud-permiso-instalacion")}
              disabled={!order?.installation_permit_request_pdf_url}
              emptyHint="Se genera cuando la empresa envía el formulario de permiso de instalación."
              loadKey={`${id}-inst-perm-${order?.installation_permit?.id ?? ""}-${String(order?.installation_permit?.created_at ?? "")}`}
              onFetchBlob={fetchInstallationPermitRequestPdf}
            />
            <OrderAttachmentAdminPreview
              order={order}
              title="Permiso emitido (alcaldía)"
              downloadBase="permiso-emitido-alcaldia"
              fileUrl={order?.installation_permit?.municipal_permit_issued_url}
              emptyHint="La empresa lo sube desde Mis pedidos en «Permiso alcaldía»."
            />
            <OrderAttachmentAdminPreview
              order={order}
              title="Impuesto municipal"
              downloadBase="impuesto-municipal"
              fileUrl={order?.installation_permit?.municipal_tax_payment_receipt_url}
              emptyHint="Comprobante de pago del impuesto; también desde Mis pedidos."
            />
          </div>
        </AdminDetailInset>
      </AdminDetailSection>
    </div>
  );
}
