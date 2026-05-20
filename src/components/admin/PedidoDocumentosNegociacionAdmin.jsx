"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminDetailInset, AdminDetailSection } from "@/components/admin/AdminAccordionDetail";
import { PedidoAdminArtAttachmentsGrouped } from "@/components/admin/PedidoAdminArtAttachmentsGrouped";
import { adminField, adminLabel, adminPrimaryBtn } from "@/components/admin/adminFormStyles";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import {
  IcDownload,
  IcExternal,
  PdfPreview,
  pdfPreviewCompactIconButtonClass,
} from "@/components/media/PdfPreview";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { isPdfReceiptUrl } from "@/lib/orderPaymentMethods";
import { normalizeMediaUrlForUi } from "@/lib/mediaUrls";
import { orderArtImageLightboxItems } from "@/lib/imageLightboxItems";
import { ROUNDED_CONTROL, ROUNDED_PDF_GRID_CARD } from "@/lib/uiRounding";
import { authFetch, authFetchBlob, mediaAbsoluteUrl } from "@/services/authApi";

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

function orderArtEntryLabel(a) {
  const fileField = a?.file != null ? String(a.file) : "";
  if (fileField && fileField.includes("/")) {
    return fileField.split("/").filter(Boolean).pop() || `arte-${a.id}`;
  }
  return `Arte #${a.id}`;
}

/**
 * Vista previa admin alineada con ``PdfPreview`` de la rejilla (PDF en iframe; imagen con la misma barra de acciones).
 */
export function OrderAttachmentAdminPreview({ title, fileUrl, emptyHint, order, downloadBase }) {
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
          <RasterFromApiUrl
            url={raw}
            alt={title}
            className="max-h-[min(10rem,32vh)] w-auto max-w-full rounded-none border border-zinc-200 object-contain shadow-sm"
            {...catalogRasterImgAttrs}
          />
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
 * Huella corta para invalidar la vista previa del PDF cuando cambian los textos de la hoja en el API.
 * (Mismo criterio que ``invoice_number`` en el loadKey de factura.)
 */
function orderNegotiationTextsFingerprint(paymentConditions, negotiationObservations) {
  const s = `${String(paymentConditions ?? "")}\u0000${String(negotiationObservations ?? "")}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${(h >>> 0).toString(36)}-${s.length}`;
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
  const [paymentConditions, setPaymentConditions] = useState("");
  const [negotiationObservations, setNegotiationObservations] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [artsLightboxOpen, setArtsLightboxOpen] = useState(false);
  const [artsLightboxIndex, setArtsLightboxIndex] = useState(0);

  useEffect(() => {
    setPaymentConditions(String(order?.payment_conditions ?? ""));
    setNegotiationObservations(String(order?.negotiation_observations ?? ""));
    setInvoiceNumber(String(order?.invoice_number ?? ""));
  }, [id, order?.payment_conditions, order?.negotiation_observations, order?.invoice_number]);

  useEffect(() => {
    setArtsLightboxOpen(false);
    setArtsLightboxIndex(0);
  }, [id]);

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
    () =>
      id != null
        ? `negotiation-${id}-${orderNegotiationTextsFingerprint(
            order?.payment_conditions,
            order?.negotiation_observations,
          )}`
        : "negotiation",
    [id, order?.payment_conditions, order?.negotiation_observations],
  );

  const saveTexts = useCallback(async () => {
    if (!id || !accessToken) return;
    setErr("");
    setBusy("save");
    try {
      await authFetch(`/api/orders/${id}/`, {
        method: "PATCH",
        token: accessToken,
        body: {
          payment_conditions: paymentConditions,
          negotiation_observations: negotiationObservations,
          invoice_number: invoiceNumber.trim(),
        },
      });
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy("");
    }
  }, [
    accessToken,
    id,
    invoiceNumber,
    negotiationObservations,
    onSaved,
    paymentConditions,
  ]);

  const signedUrl = order?.negotiation_sheet_signed_url
    ? mediaAbsoluteUrl(String(order.negotiation_sheet_signed_url))
    : "";

  const orderArtEntries = useMemo(() => {
    const list = Array.isArray(order?.art_attachments) ? order.art_attachments : [];
    return list.map((a) => {
      const raw = a?.file_url != null ? String(a.file_url) : "";
      const abs = raw ? mediaAbsoluteUrl(raw) : "";
      return {
        id: a.id,
        raw,
        abs,
        label: orderArtEntryLabel(a),
        spaceCode:
          a?.order_item_code != null ? String(a.order_item_code).trim() : "",
        orderItemPk:
          a?.order_item != null && a.order_item !== ""
            ? Number(a.order_item)
            : null,
        createdAt: a?.created_at,
        kind: orderArtKindFromUrls(raw, abs),
      };
    });
  }, [order?.art_attachments]);

  const artImageEntries = useMemo(
    () => orderArtEntries.filter((e) => e.kind === "image"),
    [orderArtEntries],
  );

  const artsLightboxItems = useMemo(
    () => orderArtImageLightboxItems(artImageEntries),
    [artImageEntries],
  );

  const openArtsLightbox = useCallback(
    (initialIndex) => {
      if (!artsLightboxItems.length) return;
      const i = Math.min(Math.max(0, initialIndex), artsLightboxItems.length - 1);
      setArtsLightboxIndex(i);
      setArtsLightboxOpen(true);
    },
    [artsLightboxItems],
  );

  const textsDirty = useMemo(() => {
    const oc = String(order?.payment_conditions ?? "");
    const oo = String(order?.negotiation_observations ?? "");
    const oi = String(order?.invoice_number ?? "").trim();
    return (
      paymentConditions !== oc ||
      negotiationObservations !== oo ||
      invoiceNumber.trim() !== oi
    );
  }, [
    order?.payment_conditions,
    order?.negotiation_observations,
    order?.invoice_number,
    paymentConditions,
    negotiationObservations,
    invoiceNumber,
  ]);

  return (
    <div className="space-y-4">
      <AdminDetailSection panelId={panelId} sectionId="nego-texts" title="Textos de negociación y factura">
        <AdminDetailInset className="space-y-4">
          <div>
            <label className={adminLabel} htmlFor={`pc-${id}`}>
              Condiciones de pago
            </label>
            <textarea
              id={`pc-${id}`}
              rows={3}
              className={adminField}
              value={paymentConditions}
              onChange={(e) => setPaymentConditions(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor={`no-${id}`}>
              Observaciones de negociación
            </label>
            <textarea
              id={`no-${id}`}
              rows={4}
              className={adminField}
              value={negotiationObservations}
              onChange={(e) => setNegotiationObservations(e.target.value)}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor={`invn-${id}`}>
              Número de factura
            </label>
            <input
              id={`invn-${id}`}
              type="text"
              className={adminField}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Al pasar el pedido a «Facturada», si este campo está vacío se genera una referencia (por ejemplo{" "}
              <span className="font-mono text-zinc-600">FAC-</span> más el código del pedido). Puedes cambiarla aquí y
              guardar.
            </p>
          </div>
          <button
            type="button"
            disabled={!textsDirty || busy === "save" || !id || !accessToken}
            onClick={() => saveTexts()}
            className={`${adminPrimaryBtn} px-4 py-2.5 text-sm font-semibold`}
          >
            {busy === "save" ? "Guardando…" : "Guardar textos"}
          </button>
          <p className="text-xs leading-relaxed text-zinc-500">
            Al guardar, si el pedido ya tenía PDF de negociación y cambias condiciones u observaciones, ese archivo se
            vuelve a generar en el servidor (sustituye al anterior) y se quita la hoja firmada subida, porque ya no
            corresponde al nuevo PDF. Si ya existía PDF de factura y cambias el número de factura, el PDF de factura
            también se regenera.
          </p>
        </AdminDetailInset>
      </AdminDetailSection>

      <AdminDetailSection
        panelId={panelId}
        sectionId="docs-pdf"
        title="Documentos y permisos PDF"
      >
        <AdminDetailInset className="space-y-4">
          {err ? (
            <p className={`${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`} role="alert">
              {err}
            </p>
          ) : null}
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
            <PdfPreview
              {...orderPdfGridPreviewProps}
              title="Factura"
              downloadFileName={orderDocFilename(order, "factura")}
              disabled={!order?.invoice_pdf_url}
              emptyHint="Se genera cuando el pedido pasa a «Facturada»."
              loadKey={`${id}-invoice-${String(order?.invoice_number ?? "").trim()}`}
              onFetchBlob={fetchInvoicePdf}
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

      <AdminDetailSection panelId={panelId} sectionId="client-arts" title="Artes adjuntos (empresa)">
        <AdminDetailInset className="space-y-4">
          {orderArtEntries.length === 0 ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              Aún no hay artes. La empresa puede subirlos desde «Mis pedidos» cuando el pedido esté pagado
              (imagen o PDF).
            </p>
          ) : (
            <PedidoAdminArtAttachmentsGrouped
              order={order}
              orderArtEntries={orderArtEntries}
              artImageEntries={artImageEntries}
              accessToken={accessToken}
              onOpenImageLightbox={openArtsLightbox}
            />
          )}
        </AdminDetailInset>
      </AdminDetailSection>

      <ImageLightbox
        open={artsLightboxOpen}
        onClose={() => setArtsLightboxOpen(false)}
        items={artsLightboxItems}
        initialIndex={artsLightboxIndex}
        showThumbnails={artsLightboxItems.length > 1}
        showDownload
        ariaLabel="Artes subidos por la empresa"
      />
    </div>
  );
}
