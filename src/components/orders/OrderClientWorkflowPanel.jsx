"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  IconRowPaperAirplane,
  IconRowPlus,
  IconRowTrash,
} from "@/components/admin/rowActionIcons";
import { orderLineItemPk } from "@/components/catalog/MarketplaceLineSpaceHeading";
import { OrderArtUploadFields } from "@/components/orders/OrderArtUploadFields";
import { OrderArtUploadModal } from "@/components/orders/OrderArtUploadModal";
import { NegotiationSheetSignedUpload } from "@/components/orders/NegotiationSheetSignedUpload";
import { OrderClientArtAttachmentsGrouped } from "@/components/orders/OrderClientArtAttachmentsGrouped";
import { OrderPendingArtStaging } from "@/components/orders/OrderPendingArtStaging";
import { MountingCompanyCreatableSelect } from "@/components/orders/MountingCompanyCreatableSelect";
import {
  IcDownload,
  IcExternal,
  PdfPreview,
  pdfPreviewCompactIconButtonClass,
} from "@/components/media/PdfPreview";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { RasterFromApiUrl } from "@/components/media/RasterFromApiUrl";
import { catalogRasterImgAttrs } from "@/lib/catalogImageProps";
import {
  apiPaymentMethodToCheckoutId,
  checkoutPaymentMethodToApi,
  isPdfReceiptUrl,
} from "@/lib/orderPaymentMethods";
import {
  marketplacePrimaryBtn,
  marketplaceSecondaryBtn,
} from "@/lib/marketplaceActionButtons";
import { orderArtImageLightboxItems } from "@/lib/imageLightboxItems";
import {
  apiBlobPathFromMediaField,
  mediaUrlForUiWithWebp,
  normalizeMediaUrlForUi,
} from "@/lib/mediaUrls";
import { squareListImagePreviewButtonRingClass } from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL, ROUNDED_PDF_GRID_CARD } from "@/lib/uiRounding";
import { orderHoldIsActive, formatOrderHoldExpiresAt } from "@/lib/orderHoldDisplay";
import { hasMunicipalInstallationDocuments } from "@/lib/orderInstallationMunicipalDocs";
import {
  defaultArtUploadOrderItemPk,
  groupOrderLinesBySpaceCode,
  groupOrderLinesForArtPicker,
  orderNeedsPerCodeArtUpload,
} from "@/lib/orderArtLineGroups";
import { CustomAlert } from "@/components/ui/CustomAlert";
import { FileDropZoneField } from "@/components/ui/FileDropZoneField";
import {
  authFetch,
  authFetchBlob,
  authFetchForm,
  mediaAbsoluteUrl,
} from "@/services/authApi";

const PAYMENT_METHODS = [
  { id: "card", label: "Tarjeta" },
  { id: "transfer", label: "Transferencia" },
  { id: "crypto", label: "Cripto" },
  { id: "zelle", label: "Zelle" },
];

const fieldClass = `mt-1.5 min-h-10 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none`;
const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function orderDocFilename(order, base) {
  const ref = String(order?.code || order?.id || "pedido")
    .replace(/#/g, "")
    .replace(/\//g, "-");
  return `${base}-${ref}.pdf`;
}

/** Colapsar / ocultar todos los paneles (doble chevron hacia arriba). */
function IcCollapseAllPanels({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 14.5 12 9.5 17 14.5M7 19.5 12 14.5 17 19.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const orderClientPdfPreviewProps = {
  compact: true,
  className: "min-w-0",
  previewMinHeightClass: "min-h-[112px] h-[min(18vh,168px)]",
};

function orderArtEntryLabelFromAttachment(a) {
  const fileField = a?.file != null ? String(a.file) : "";
  if (fileField && fileField.includes("/")) {
    return fileField.split("/").filter(Boolean).pop() || `arte-${a.id}`;
  }
  return `Arte #${a.id}`;
}

/** Texto corto de línea/toma para adjuntos de arte (API: order_item, order_item_code, order_item_title). */
function artLineCaptionFromAttachment(a, lineItems = []) {
  const code =
    a?.order_item_code != null ? String(a.order_item_code).trim() : "";
  const title =
    a?.order_item_title != null ? String(a.order_item_title).trim() : "";
  if (code && title) return `${code} — ${title}`;
  if (code) return code;
  if (title) return title;
  const itemPk =
    a?.order_item != null && a.order_item !== "" ? Number(a.order_item) : null;
  if (
    Number.isFinite(itemPk) &&
    Array.isArray(lineItems) &&
    lineItems.length > 0
  ) {
    const row = lineItems.find((it) => orderLineItemPk(it) === itemPk);
    if (row) {
      const c = lineSpaceCode(row);
      const t = lineSpaceTitle(row);
      if (c && t) return `${c} — ${t}`;
      if (c) return c;
      if (t) return t;
    }
  }
  if (a?.order_item != null) return `Línea #${a.order_item}`;
  return "";
}

/** @param {string} raw @param {string} abs */
function orderAttachmentKindFromUrls(raw, abs) {
  const r = String(raw || "");
  const a = String(abs || "");
  if (isPdfReceiptUrl(r) || isPdfReceiptUrl(a)) return "pdf";
  if (
    /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(r) ||
    /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(a)
  ) {
    return "image";
  }
  return "other";
}

/**
 * Vista previa de adjunto municipal en resumen (mismo visor PDF que factura/comprobante).
 *
 * @param {{
 *   label: string;
 *   rawUrl: string;
 *   order: Record<string, unknown>;
 *   orderId: string | number;
 *   fileKey: string;
 *   labelClass: string;
 *   onOpenImage: () => void;
 * }} props
 */
function MunicipalAttachmentClientPreview({
  label,
  rawUrl,
  order,
  orderId,
  fileKey,
  labelClass,
  onOpenImage,
}) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return null;
  const abs = mediaAbsoluteUrl(raw);
  const direct = normalizeMediaUrlForUi(raw);
  const kind = orderAttachmentKindFromUrls(raw, abs);
  const usePdfViewer = kind === "pdf" || kind === "other";

  return (
    <div>
      <p className={`${labelClass} mb-2`}>{label}</p>
      {usePdfViewer ? (
        <PdfPreview
          {...orderClientPdfPreviewProps}
          hideTitle
          title={label}
          downloadFileName={orderDocFilename(order, fileKey)}
          disabled={!direct && !abs}
          emptyHint="No se pudo cargar la vista previa del documento."
          loadKey={`${orderId}-municipal-${fileKey}-${raw}`}
          directUrl={direct || abs}
          embedHideSidebar
        />
      ) : (
        <div className="flex flex-col items-start sm:items-start">
          <button
            type="button"
            className={`relative block aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm ${squareListImagePreviewButtonRingClass} p-0`}
            aria-label={`Ver ${label} a tamaño completo`}
            onClick={onOpenImage}
          >
            <RasterFromApiUrl
              url={raw}
              alt=""
              width={400}
              height={300}
              className="h-full w-full object-contain bg-zinc-50"
              {...catalogRasterImgAttrs}
            />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Aviso cuando el cliente no puede avanzar solo: espera al equipo o a un trámite externo.
 *
 * @param {{
 *   status: string;
 *   hasSignedNegotiation: boolean;
 *   hasInvoicePdf: boolean;
 *   hasReceiptSaved: boolean;
 *   hasArtAttachments: boolean;
 *   hasPermitRecorded: boolean;
 *   hasMunicipalDocsComplete: boolean;
 *   holdActive?: boolean;
 *   holdExpiresAt?: string | null;
 * }} ctx
 * @returns {{ kind: "waiting" | "action" | "outcome" | "done"; nextStep: string; detail: string } | null}
 */
function getClientOrderGuidanceNotice(ctx) {
  const s = String(ctx.status || "");
  if (s === "invoiced" && ctx.hasReceiptSaved) {
    return {
      kind: "waiting",
      nextStep: "Confirmación de pago",
      detail:
        "Tu comprobante ya está guardado. El equipo lo revisará y marcará el pedido como pagado cuando corresponda.",
    };
  }
  if (s === "submitted") {
    const holdLine =
      ctx.holdActive && ctx.holdExpiresAt
        ? ` Las tomas quedan reservadas a tu nombre hasta el ${formatOrderHoldExpiresAt(ctx.holdExpiresAt)} (72 horas).`
        : ctx.holdActive
          ? " Las tomas quedan reservadas a tu nombre durante 72 horas mientras revisamos."
          : "";
    return {
      kind: "waiting",
      nextStep: ctx.holdActive
        ? "Reserva en revisión"
        : "Revisión de tu solicitud",
      detail: `Estamos revisando tu solicitud. No necesitas hacer nada más por ahora; te avisaremos cuando haya una resolución.${holdLine}`,
    };
  }
  if (s === "client_approved" && !ctx.hasSignedNegotiation) {
    return {
      kind: "action",
      nextStep: "Subir documentos",
      detail:
        "El equipo ya aprobó tu solicitud. Descarga la hoja de negociación, fírmala y súbela aquí; después podrás enviar los artes del anuncio. La facturación se hace cuando los artes estén aprobados.",
    };
  }
  if (
    s === "client_approved" &&
    ctx.hasSignedNegotiation &&
    !ctx.hasArtAttachments
  ) {
    return {
      kind: "action",
      nextStep: "Subir artes del anuncio",
      detail:
        "Sube las piezas gráficas de cada toma junto con la hoja firmada. El equipo las revisará antes de emitir la factura.",
    };
  }
  if (
    s === "client_approved" &&
    ctx.hasSignedNegotiation &&
    ctx.hasArtAttachments
  ) {
    return {
      kind: "waiting",
      nextStep: "Revisión de los artes y hoja firmada",
      detail:
        "Ya recibimos tus artes y la hoja firmada. El equipo validará las piezas antes de facturar; te avisaremos cuando haya novedades.",
    };
  }
  if (s === "art_approved" && !ctx.hasInvoicePdf) {
    return {
      kind: "waiting",
      nextStep: "Facturación",
      detail:
        "Los artes ya están aprobados. El equipo preparará la factura; pronto podrás verla y adjuntar el comprobante de pago.",
    };
  }
  if (s === "invoiced" && !ctx.hasReceiptSaved) {
    return {
      kind: "action",
      nextStep: "Factura y comprobante",
      detail:
        "Ya puedes consultar la factura en el paso 3 del resumen. Adjunta el comprobante de pago para que el equipo confirme el cobro.",
    };
  }
  if (s === "paid" && !ctx.hasPermitRecorded) {
    return {
      kind: "action",
      nextStep: "Solicitud y documentos",
      detail:
        "El pago ya está registrado. Completa los datos de instalación y envía la solicitud de permiso ante la alcaldía.",
    };
  }
  if (
    s === "permit_pending" &&
    ctx.hasPermitRecorded &&
    !ctx.hasMunicipalDocsComplete
  ) {
    return {
      kind: "action",
      nextStep: "Solicitud y documentos",
      detail:
        "Sube el permiso emitido por la alcaldía y el comprobante del pago del impuesto municipal. Son obligatorios antes de la instalación del anuncio.",
    };
  }
  if (s === "permit_pending") {
    return {
      kind: "waiting",
      nextStep: "Permiso ante la alcaldía",
      detail:
        "Ya recibimos la solicitud y los documentos municipales. El equipo revisará el trámite antes de coordinar la instalación.",
    };
  }
  if (s === "installation") {
    return {
      kind: "waiting",
      nextStep: "Instalación del anuncio en curso",
      detail:
        "En esta fase el centro coordina la instalación física del anuncio. Te informarán si hace falta alguna gestión adicional en sitio.",
    };
  }
  if (s === "cancelled") {
    return {
      kind: "outcome",
      nextStep: "Pedido rechazado",
      detail:
        "Este pedido figura como rechazado (incluye solicitudes que no siguieron adelante). Si tienes dudas, escribe al centro comercial o a soporte.",
    };
  }
  if (s === "expired") {
    return {
      kind: "outcome",
      nextStep: "Pedido vencido",
      detail:
        "El plazo o la reserva asociada a este pedido venció. Puedes iniciar una nueva solicitud desde el catálogo si aún te interesa el espacio.",
    };
  }
  if (s === "active") {
    return {
      kind: "done",
      nextStep: "Pedido activo",
      detail: "Se completaron todos los pasos para este pedido.",
    };
  }
  return null;
}

/**
 * Acciones del flujo comercial en cuenta cliente: PDFs, firma, pago, artes, permiso.
 *
 * @param {{
 *   order: Record<string, unknown>;
 *   accessToken: string;
 *   onOrderUpdated: (next: Record<string, unknown>) => void;
 *   sectionTitleId?: string | null;
 * }} props
 * sectionTitleId: si se indica, no se renderiza el `h3` interno y el bloque usa `aria-labelledby` con ese id (título fuera, p. ej. pestaña «Mis pedidos»).
 */
export function OrderClientWorkflowPanel({
  order,
  accessToken,
  onOrderUpdated,
  sectionTitleId = null,
}) {
  const id = order?.id;
  const status = String(order?.status || "");

  const [busy, setBusy] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [signedFile, setSignedFile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [receiptFile, setReceiptFile] = useState(null);
  const [artFiles, setArtFiles] = useState(/** @type {File[]} */ ([]));
  /** Línea del pedido (toma) para el próximo arte; con una sola línea se asigna sola. */
  const [artOrderItemId, setArtOrderItemId] = useState(
    /** @type {number | null} */ (null),
  );
  const [permitDate, setPermitDate] = useState("");
  const [permitCompany, setPermitCompany] = useState("");
  const [permitNotes, setPermitNotes] = useState("");
  const [permitMunicipalRef, setPermitMunicipalRef] = useState("");
  const [municipalPermitIssuedFile, setMunicipalPermitIssuedFile] =
    useState(null);
  const [municipalTaxReceiptFile, setMunicipalTaxReceiptFile] = useState(null);
  /** Proveedores de montaje de los centros del pedido (API pedido). */
  const [mountProviders, setMountProviders] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([]),
  );
  const [mountProvidersLoading, setMountProvidersLoading] = useState(false);
  const [wantReplaceReceipt, setWantReplaceReceipt] = useState(false);
  const [wantReplaceSignedSheet, setWantReplaceSignedSheet] = useState(false);
  const [signNegotiationOnWeb, setSignNegotiationOnWeb] = useState(false);
  const [negotiationSignatureEmpty, setNegotiationSignatureEmpty] = useState(true);
  /** @type {import("react").RefObject<import("@/components/ui/SignatureCanvasField").SignatureCanvasHandle | null>} */
  const negotiationSignatureRef = useRef(null);
  /** Panel «Ver hoja de negociación»: un chip en el resumen despliega descarga + subida de la hoja firmada. */
  const [signedInitialUploadOpen, setSignedInitialUploadOpen] = useState(false);
  /** Facturada con comprobante: «Paso actual» pago solo al pulsar «Cambiar comprobante» en el resumen. */
  const [invoicedPaymentPasoVisible, setInvoicedPaymentPasoVisible] =
    useState(false);
  const [pendingArtDeleteId, setPendingArtDeleteId] = useState(
    /** @type {number | null} */ (null),
  );
  /** Lista de artes bajo el paso 2 del resumen (no duplicar «Paso actual» cuando ya hay archivos). */
  const [artsResumenExpanded, setArtsResumenExpanded] = useState(false);
  /** Paso 4 del resumen: solicitud de permiso y documentos municipales. */
  const [permitResumenExpanded, setPermitResumenExpanded] = useState(false);
  const [artExtraUploadOpen, setArtExtraUploadOpen] = useState(false);
  const [artUploadModalOpen, setArtUploadModalOpen] = useState(false);
  /** Artes elegidos en el modal (varias tomas), pendientes de subir al servidor. */
  const [pendingArtGroups, setPendingArtGroups] = useState(
    /** @type {Array<{ orderItemPk: number; files: File[] }>} */ ([]),
  );
  /** Paso 3 unificado: factura + comprobante de pago. */
  const [paymentResumenExpanded, setPaymentResumenExpanded] = useState(false);
  const [
    negotiationSignedResumenExpanded,
    setNegotiationSignedResumenExpanded,
  ] = useState(false);
  const [artsLightboxOpen, setArtsLightboxOpen] = useState(false);
  const [artsLightboxIndex, setArtsLightboxIndex] = useState(0);
  const [receiptLightbox, setReceiptLightbox] = useState({
    open: false,
    items:
      /** @type {Array<{ src: string; alt?: string; downloadFileName?: string }>} */ ([]),
    initialIndex: 0,
  });
  const [signedNegotiationLightbox, setSignedNegotiationLightbox] = useState({
    open: false,
    items:
      /** @type {Array<{ src: string; alt?: string; downloadFileName?: string }>} */ ([]),
    initialIndex: 0,
  });
  /** Tras subir/firmar hoja: reflejar de inmediato la URL devuelta por el API (sin esperar al merge SWR). */
  const [signedSheetUrlOverride, setSignedSheetUrlOverride] = useState(
    /** @type {string | null} */ (null),
  );
  /** Paso 1 completado (persiste aunque el merge de la lista tarde o no traiga la URL). */
  const [signedSheetMarkedComplete, setSignedSheetMarkedComplete] = useState(false);

  /** Solo paso 1 sin firma: abrir una vez el panel de subida por pedido (factura/comprobante/artes no se autoabren si ya hay archivo). */
  const negotiationUploadAutoOpenedRef = useRef(false);

  const hasNegotiationPdf = Boolean(order?.negotiation_sheet_pdf_url);
  const hasMunicipalityPdf = Boolean(order?.municipality_authorization_pdf_url);
  const hasInvoicePdf = Boolean(order?.invoice_file_url);
  const invoiceOrderCodeKey = String(order?.code ?? id ?? "").trim();
  const invoiceRawForUi = order?.invoice_file_url
    ? String(order.invoice_file_url)
    : "";
  const invoiceUrl = invoiceRawForUi ? mediaAbsoluteUrl(invoiceRawForUi) : "";
  const isExternalInvoice = Boolean(order?.has_external_invoice);
  const invoiceKindInPanel = invoiceRawForUi
    ? orderAttachmentKindFromUrls(invoiceRawForUi, invoiceUrl)
    : "other";
  const signedRawForUi = signedSheetUrlOverride
    ? signedSheetUrlOverride
    : order?.negotiation_sheet_signed_url
      ? String(order.negotiation_sheet_signed_url)
      : "";
  const hasSignedSheet =
    signedSheetMarkedComplete || Boolean(signedRawForUi.trim());
  const signedUrl = signedRawForUi ? mediaAbsoluteUrl(signedRawForUi) : "";
  const signedKindInPanel = signedUrl
    ? orderAttachmentKindFromUrls(signedRawForUi, signedUrl)
    : "other";
  const receiptRawForUi = order?.payment_receipt_url
    ? String(order.payment_receipt_url)
    : "";
  const receiptUrl = receiptRawForUi ? mediaAbsoluteUrl(receiptRawForUi) : "";
  const hasReceiptSaved = Boolean(receiptUrl);
  const isReceiptPdfSaved = isPdfReceiptUrl(receiptUrl);
  const receiptKindInPanel = receiptRawForUi
    ? orderAttachmentKindFromUrls(receiptRawForUi, receiptUrl)
    : "other";
  const permit = order?.installation_permit;
  const hasMunicipalDocsComplete = hasMunicipalInstallationDocuments(order);
  const municipalPermitIssuedRaw =
    permit?.municipal_permit_issued_url != null
      ? String(permit.municipal_permit_issued_url)
      : "";
  const municipalTaxReceiptRaw =
    permit?.municipal_tax_payment_receipt_url != null
      ? String(permit.municipal_tax_payment_receipt_url)
      : "";
  const hasMunicipalPermitIssuedSaved = Boolean(
    municipalPermitIssuedRaw.trim(),
  );
  const hasMunicipalTaxReceiptSaved = Boolean(municipalTaxReceiptRaw.trim());
  /** Tras enviar la solicitud (5a), en «Permiso alcaldía» (5b). */
  const canMunicipalDocsUpload =
    status === "permit_pending" && Boolean(permit) && !hasMunicipalDocsComplete;

  useEffect(() => {
    setPaymentMethod(apiPaymentMethodToCheckoutId(order?.payment_method));
  }, [order?.id, order?.payment_method]);

  useEffect(() => {
    setWantReplaceReceipt(false);
  }, [order?.id, order?.payment_receipt_url]);

  const orderLineItems = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items],
  );

  const artLineGroups = useMemo(
    () => groupOrderLinesBySpaceCode(orderLineItems),
    [orderLineItems],
  );
  /** Modal / selector: una opción por línea (sin fusionar códigos repetidos). */
  const artPickerGroups = useMemo(
    () => groupOrderLinesForArtPicker(orderLineItems),
    [orderLineItems],
  );
  const needsMultiCodeArtUpload = useMemo(
    () => orderNeedsPerCodeArtUpload(orderLineItems),
    [orderLineItems],
  );

  const pendingArtFileCount = useMemo(
    () =>
      pendingArtGroups.reduce((n, g) => n + (g.files?.length ?? 0), 0),
    [pendingArtGroups],
  );

  useEffect(() => {
    setPendingArtGroups([]);
  }, [order?.id]);

  const permitCenters = useMemo(() => {
    const m = new Map();
    for (const it of orderLineItems) {
      const cid = it?.shopping_center_id;
      if (cid == null || cid === "") continue;
      const idNum = Number(cid);
      if (!Number.isFinite(idNum)) continue;
      if (m.has(idNum)) continue;
      const name =
        it.shopping_center_name != null &&
        String(it.shopping_center_name).trim()
          ? String(it.shopping_center_name).trim()
          : `Centro ${idNum}`;
      m.set(idNum, { id: idNum, name });
    }
    return [...m.values()];
  }, [orderLineItems]);

  useEffect(() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const codeGroups = groupOrderLinesBySpaceCode(items);
    if (codeGroups.length === 1) {
      setArtOrderItemId(codeGroups[0].orderItemPk);
      return;
    }
    const pickerGroups = groupOrderLinesForArtPicker(items);
    setArtOrderItemId((prev) => {
      if (prev == null) return null;
      const ok = pickerGroups.some((g) => g.orderItemPk === prev);
      return ok ? prev : null;
    });
  }, [order?.id, order?.items]);

  useEffect(() => {
    setArtsResumenExpanded(false);
    setPermitResumenExpanded(false);
    setMunicipalPermitIssuedFile(null);
    setMunicipalTaxReceiptFile(null);
    setArtExtraUploadOpen(false);
    setArtUploadModalOpen(false);
    setPaymentResumenExpanded(false);
    setNegotiationSignedResumenExpanded(false);
    setWantReplaceSignedSheet(false);
    setSignedInitialUploadOpen(false);
    setSignedFile(null);
    setArtsLightboxOpen(false);
    setArtsLightboxIndex(0);
    setReceiptLightbox({ open: false, items: [], initialIndex: 0 });
    setSignedNegotiationLightbox({ open: false, items: [], initialIndex: 0 });
    setSignedSheetUrlOverride(null);
    setSignedSheetMarkedComplete(
      Boolean(String(order?.negotiation_sheet_signed_url ?? "").trim()),
    );
    setPendingArtDeleteId(null);
    setArtFiles([]);
    negotiationUploadAutoOpenedRef.current = false;
    setInvoicedPaymentPasoVisible(false);
    setMountProviders([]);
    setMountProvidersLoading(false);
  }, [order?.id]);

  const apiPaymentMethod = String(order?.payment_method || "");
  const paymentMethodDirty =
    checkoutPaymentMethodToApi(paymentMethod) !== apiPaymentMethod;

  const closeInvoicedPaymentPaso = useCallback(() => {
    setInvoicedPaymentPasoVisible(false);
    setWantReplaceReceipt(false);
    setReceiptFile(null);
    setPaymentMethod(apiPaymentMethodToCheckoutId(order?.payment_method));
  }, [order?.payment_method]);

  /** Incluye «Pagada»: el cliente puede subir o volver a subir la firma si el PDF cambió o faltaba el archivo. */
  const canUploadSigned =
    (status === "client_approved" ||
      status === "invoiced" ||
      status === "paid") &&
    !hasSignedSheet &&
    hasNegotiationPdf;
  const canPayFields = status === "invoiced" || status === "paid";
  const canUploadArt = status === "client_approved";
  /** Tras «Pagada», antes de «Permiso alcaldía» (mismo orden que el flujo admin). */
  const canPermitForm = status === "paid" && !permit;

  useEffect(() => {
    if (!canPermitForm || !id || !accessToken) return;
    let cancelled = false;
    setMountProvidersLoading(true);
    authFetch(`/api/orders/${id}/mounting-providers/`, { token: accessToken })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setMountProviders(data);
      })
      .catch(() => {
        if (!cancelled) setMountProviders([]);
      })
      .finally(() => {
        if (!cancelled) setMountProvidersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, canPermitForm, id]);

  const artAttachments = Array.isArray(order?.art_attachments)
    ? order.art_attachments
    : [];
  const hasArtAttachments = artAttachments.length > 0;
  /** Bloque de listado / subida de artes (visible con pedido «Pagada» o cuando ya hay adjuntos). */
  const showArtAttachmentsSection = canUploadArt || hasArtAttachments;

  const orderArtEntries = useMemo(() => {
    const list = Array.isArray(order?.art_attachments)
      ? order.art_attachments
      : [];
    return list.map((a) => {
      const raw = a?.file_url != null ? String(a.file_url) : "";
      const abs = raw ? mediaAbsoluteUrl(raw) : "";
      return {
        id: a.id,
        raw,
        abs,
        label: orderArtEntryLabelFromAttachment(a),
        lineCaption: artLineCaptionFromAttachment(a, orderLineItems),
        spaceCode:
          a?.order_item_code != null ? String(a.order_item_code).trim() : "",
        orderItemPk:
          a?.order_item != null && a.order_item !== ""
            ? Number(a.order_item)
            : null,
        createdAt: a?.created_at,
        kind: orderAttachmentKindFromUrls(raw, abs),
      };
    });
  }, [order?.art_attachments, orderLineItems]);

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
      const i = Math.min(
        Math.max(0, initialIndex),
        artsLightboxItems.length - 1,
      );
      setArtsLightboxIndex(i);
      setArtsLightboxOpen(true);
    },
    [artsLightboxItems],
  );

  const openReceiptLightbox = useCallback(() => {
    const src = mediaUrlForUiWithWebp(receiptRawForUi);
    if (!src) return;
    setReceiptLightbox({
      open: true,
      items: [
        {
          src,
          alt: "Comprobante de pago",
          downloadFileName: /\.[a-z0-9]+$/i.test(
            receiptRawForUi.split("/").pop() || "",
          )
            ? String(receiptRawForUi.split("/").pop())
            : undefined,
        },
      ],
      initialIndex: 0,
    });
  }, [receiptRawForUi]);

  const openMunicipalImageLightbox = useCallback((rawUrl, alt) => {
    const src = mediaUrlForUiWithWebp(rawUrl);
    if (!src) return;
    const name = String(rawUrl).split("/").pop() || "";
    setReceiptLightbox({
      open: true,
      items: [
        {
          src,
          alt,
          downloadFileName: /\.[a-z0-9]+$/i.test(name) ? name : undefined,
        },
      ],
      initialIndex: 0,
    });
  }, []);

  const openSignedNegotiationLightbox = useCallback(() => {
    const src = mediaUrlForUiWithWebp(signedRawForUi);
    if (!src) return;
    setSignedNegotiationLightbox({
      open: true,
      items: [
        {
          src,
          alt: "Hoja de negociación firmada",
          downloadFileName: undefined,
        },
      ],
      initialIndex: 0,
    });
  }, [signedRawForUi]);

  const signedSignedPreviewKey = useMemo(
    () =>
      `${id}-signed-resumen-${signedRawForUi}-${String(order?.updated_at ?? "")}`,
    [id, signedRawForUi, order?.updated_at],
  );

  const fetchNegotiationSignedBlob = useCallback(async () => {
    const v = encodeURIComponent(String(order?.updated_at ?? Date.now()));
    return authFetchBlob(
      `/api/orders/${id}/download-negotiation-sheet-signed/?v=${v}`,
      {
        token: accessToken,
      },
    );
  }, [accessToken, id, order?.updated_at]);

  const fetchInvoiceBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-invoice/`, {
      token: accessToken,
    });
  }, [accessToken, id]);

  const fetchMunicipalityBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-municipality-letter/`, {
      token: accessToken,
    });
  }, [accessToken, id]);

  const fetchInstallationPermitRequestBlob = useCallback(async () => {
    return authFetchBlob(
      `/api/orders/${id}/download-installation-permit-request/`,
      {
        token: accessToken,
      },
    );
  }, [accessToken, id]);

  const holdActive = orderHoldIsActive(order);
  const holdExpiresAt = order?.hold_expires_at ?? null;

  const clientGuidanceNotice = useMemo(
    () =>
      getClientOrderGuidanceNotice({
        status,
        holdActive,
        holdExpiresAt,
        hasSignedNegotiation: hasSignedSheet,
        hasInvoicePdf,
        hasReceiptSaved,
        hasArtAttachments,
        hasPermitRecorded: Boolean(permit),
        hasMunicipalDocsComplete,
      }),
    [
      status,
      holdActive,
      holdExpiresAt,
      hasSignedSheet,
      hasInvoicePdf,
      hasReceiptSaved,
      hasArtAttachments,
      permit,
      hasMunicipalDocsComplete,
    ],
  );

  /** Solo en «Facturada»: formulario de pago como «Paso actual». */
  const showPaymentForm = status === "invoiced";
  /** Sin comprobante: siempre visible; con comprobante: solo al pulsar «Cambiar comprobante». */
  const showInvoicedPaymentPasoActual =
    showPaymentForm && (!hasReceiptSaved || invoicedPaymentPasoVisible);

  /**
   * «Siguiente paso»: solo si el paso no es interactuable ahora (p. ej. ocultar el aviso de subir documentos
   * mientras el panel de hoja de negociación está abierto).
   */
  const showClientGuidanceBanner = useMemo(() => {
    if (!clientGuidanceNotice) return false;
    const n = clientGuidanceNotice;
    if (n.kind === "outcome" || n.kind === "done") return true;
    if (n.kind === "waiting" && status === "submitted") return true;
    if (n.kind === "action" && status === "client_approved" && !hasSignedSheet) {
      return !signedInitialUploadOpen;
    }
    if (
      n.kind === "action" &&
      status === "client_approved" &&
      hasSignedSheet &&
      !hasArtAttachments &&
      canUploadArt
    ) {
      return false;
    }
    if (
      n.kind === "waiting" &&
      status === "client_approved" &&
      hasSignedSheet &&
      hasArtAttachments
    ) {
      return !artsResumenExpanded;
    }
    if (n.kind === "waiting" && status === "art_approved" && !hasInvoicePdf) {
      return !paymentResumenExpanded;
    }
    if (n.kind === "action" && status === "invoiced" && !hasReceiptSaved) {
      return !showInvoicedPaymentPasoActual;
    }
    if (n.kind === "waiting" && status === "invoiced" && hasReceiptSaved) {
      return !paymentResumenExpanded && !invoicedPaymentPasoVisible;
    }
    if (n.kind === "action" && status === "paid" && !permit) {
      return !canPermitForm;
    }
    if (
      n.kind === "action" &&
      status === "permit_pending" &&
      !hasMunicipalDocsComplete
    ) {
      return !canMunicipalDocsUpload;
    }
    if (n.kind === "waiting" && status === "permit_pending" && permit) {
      return !permitResumenExpanded;
    }
    return true;
  }, [
    artsResumenExpanded,
    clientGuidanceNotice,
    hasArtAttachments,
    hasInvoicePdf,
    hasReceiptSaved,
    invoicedPaymentPasoVisible,
    negotiationSignedResumenExpanded,
    permit,
    paymentResumenExpanded,
    permitResumenExpanded,
    canMunicipalDocsUpload,
    canPermitForm,
    canUploadArt,
    hasMunicipalDocsComplete,
    showInvoicedPaymentPasoActual,
    signedInitialUploadOpen,
    hasSignedSheet,
    status,
  ]);

  const showArtsInStepper = canUploadArt || hasArtAttachments;
  const showDocStepper =
    canUploadSigned ||
    hasSignedSheet ||
    hasInvoicePdf ||
    canPayFields ||
    showArtsInStepper ||
    Boolean(permit) ||
    status === "paid" ||
    status === "permit_pending" ||
    status === "installation" ||
    status === "active" ||
    status === "art_approved" ||
    status === "invoiced";
  const step1Complete = hasSignedSheet;
  const step2Complete = hasArtAttachments;
  const step3CanExpandResumen = hasInvoicePdf || hasReceiptSaved;
  const step4Complete = Boolean(permit);
  /** 1 hoja · 2 artes · 3 pago (factura + comprobante) · 4 permiso (solo uno con formulario «Paso actual»). */
  const activeDocUploadStep =
    canUploadSigned && !step1Complete
      ? 1
      : canUploadArt && !hasArtAttachments
        ? 2
        : showInvoicedPaymentPasoActual
          ? 3
          : canPermitForm
            ? 4
            : canMunicipalDocsUpload
              ? 4
              : null;
  /** Paso del resumen que corresponde al estado API (espera del equipo o documento pendiente). */
  const activeDocFlowStep =
    activeDocUploadStep ??
    (status === "art_approved" && !hasInvoicePdf
      ? 3
      : status === "invoiced" && !hasReceiptSaved
        ? 3
        : null);

  /** Primera vez con hoja pendiente de firma: abrir panel de subida (no autoabrir factura/comprobante/artes ya guardados). */
  useEffect(() => {
    if (!id) return;
    if (!(canUploadSigned && !step1Complete)) {
      negotiationUploadAutoOpenedRef.current = false;
      return;
    }
    if (!negotiationUploadAutoOpenedRef.current) {
      negotiationUploadAutoOpenedRef.current = true;
      setSignedInitialUploadOpen(true);
    }
  }, [id, canUploadSigned, step1Complete]);

  /** Mismo estilo que los botones de documentos antes del resumen tipo «chip». */
  const docStepBtnClass = `${marketplaceSecondaryBtn} inline-flex min-h-10 items-center justify-center gap-1.5 px-4 py-2 text-center text-xs font-semibold sm:text-sm`;
  /** Paso en curso (formulario «Paso actual»): acento tenant. */
  const docStepBtnActiveClass =
    "border-[color-mix(in_srgb,var(--mp-primary)_58%,#d4d4d8)] bg-[color-mix(in_srgb,var(--mp-primary)_12%,#fff)] mp-text-brand ring-1 ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)]";
  /** Paso ya completado con panel abierto («Ver …» / «Ocultar …»): gris claro; texto un poco más oscuro que (pendiente). */
  const docStepPastOpenClass =
    "border-zinc-200 bg-zinc-50 !text-zinc-500 ring-1 ring-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 hover:!text-zinc-500 focus-visible:ring-zinc-200/90";
  const docStepPendingClass = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[15px] border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-2 text-center text-xs font-semibold text-zinc-400 sm:text-sm`;

  const docStepToggleBtnClass = (stepNum, isExpanded) => {
    if (activeDocFlowStep === stepNum) {
      return `${docStepBtnClass} ${docStepBtnActiveClass}`;
    }
    if (isExpanded) {
      return `${docStepBtnClass} ${docStepPastOpenClass}`;
    }
    return docStepBtnClass;
  };

  /** Chip del resumen: resalta el paso en curso (formulario «Paso actual» o panel abierto). */
  const docStepChipClass = (stepNum) =>
    activeDocFlowStep === stepNum
      ? `${docStepBtnClass} ${docStepBtnActiveClass}`
      : docStepPendingClass;

  const anyDocPanelExpanded =
    negotiationSignedResumenExpanded ||
    paymentResumenExpanded ||
    artsResumenExpanded ||
    permitResumenExpanded ||
    signedInitialUploadOpen ||
    invoicedPaymentPasoVisible;

  const collapseAllDocPanels = useCallback(() => {
    setNegotiationSignedResumenExpanded(false);
    setPaymentResumenExpanded(false);
    setArtsResumenExpanded(false);
    setPermitResumenExpanded(false);
    setSignedInitialUploadOpen(false);
    setInvoicedPaymentPasoVisible(false);
    setWantReplaceSignedSheet(false);
    setWantReplaceReceipt(false);
    setReceiptFile(null);
    setArtExtraUploadOpen(false);
    setPendingArtDeleteId(null);
  }, []);

  useEffect(() => {
    if (!signedInitialUploadOpen || id == null) return;
    const t = window.setTimeout(() => {
      document.getElementById(`signed-upload-step-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [signedInitialUploadOpen, id]);

  const permitMountMinDate = useMemo(() => {
    const starts = orderLineItems
      .map((it) => String(it?.start_date ?? "").trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (!starts.length) return "";
    const minStart = starts.sort()[0];
    const [y, m, d] = minStart.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  }, [orderLineItems]);

  const selectedMountProvider = useMemo(() => {
    const key = permitCompany.trim().toLowerCase();
    if (!key) return null;
    return (
      mountProviders.find(
        (p) =>
          String(p?.company_name ?? "")
            .trim()
            .toLowerCase() === key,
      ) ?? null
    );
  }, [mountProviders, permitCompany]);

  const permitStaffFromProvider = useMemo(() => {
    const raw = selectedMountProvider?.staff_members;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => ({
        full_name: String(r?.full_name ?? "").trim(),
        id_number: String(r?.id_number ?? "").trim(),
      }))
      .filter((r) => r.full_name && r.id_number);
  }, [selectedMountProvider]);

  const downloadNegotiation = useCallback(async () => {
    if (!id) return;
    setLocalErr("");
    setBusy("negotiation");
    try {
      const v = encodeURIComponent(String(order?.updated_at ?? Date.now()));
      const blob = await authFetchBlob(
        `/api/orders/${id}/download-negotiation-sheet/?v=${v}`,
        {
          token: accessToken,
        },
      );
      triggerBlobDownload(blob, orderDocFilename(order, "hoja-negociacion"));
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo descargar el PDF.",
      );
    } finally {
      setBusy("");
    }
  }, [accessToken, id, order?.updated_at, order]);

  const downloadMunicipality = useCallback(async () => {
    if (!id) return;
    setLocalErr("");
    setBusy("municipality");
    try {
      const blob = await authFetchBlob(
        `/api/orders/${id}/download-municipality-letter/`,
        {
          token: accessToken,
        },
      );
      triggerBlobDownload(blob, orderDocFilename(order, "carta-municipio"));
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo descargar el PDF.",
      );
    } finally {
      setBusy("");
    }
  }, [accessToken, id, order]);

  const resetNegotiationSignedForm = useCallback(() => {
    setSignNegotiationOnWeb(false);
    setNegotiationSignatureEmpty(true);
    negotiationSignatureRef.current?.clear();
    setSignedFile(null);
  }, []);

  useEffect(() => {
    const url = String(order?.negotiation_sheet_signed_url ?? "").trim();
    if (url) {
      setSignedSheetMarkedComplete(true);
    } else {
      setSignedSheetMarkedComplete(false);
      setSignedSheetUrlOverride(null);
    }
  }, [order?.negotiation_sheet_signed_url, order?.updated_at]);

  const applyNegotiationSignedResponse = useCallback(
    (data) => {
      onOrderUpdated(data);
      setSignedSheetMarkedComplete(true);
      const nextUrl =
        data?.negotiation_sheet_signed_url != null
          ? String(data.negotiation_sheet_signed_url).trim()
          : "";
      if (nextUrl) {
        setSignedSheetUrlOverride(nextUrl);
      }
      setSignedInitialUploadOpen(false);
      setWantReplaceSignedSheet(false);
      negotiationUploadAutoOpenedRef.current = true;
      resetNegotiationSignedForm();
    },
    [onOrderUpdated, resetNegotiationSignedForm],
  );

  const uploadSigned = useCallback(async () => {
    if (!id) return;
    setLocalErr("");

    if (signNegotiationOnWeb) {
      if (negotiationSignatureRef.current?.isEmpty()) {
        setLocalErr("Dibuja tu firma en el recuadro antes de continuar.");
        return;
      }
      setBusy("signed");
      try {
        const blob = await negotiationSignatureRef.current.toBlob();
        if (!blob) {
          setLocalErr("No se pudo capturar la firma. Intenta de nuevo.");
          return;
        }
        const fd = new FormData();
        fd.append("signature_png", blob, "firma.png");
        const data = await authFetchForm(
          `/api/orders/${id}/sign-negotiation-sheet/`,
          {
            method: "POST",
            formData: fd,
            token: accessToken,
          },
        );
        applyNegotiationSignedResponse(data);
      } catch (e) {
        setLocalErr(
          e instanceof Error ? e.message : "No se pudo registrar la firma.",
        );
      } finally {
        setBusy("");
      }
      return;
    }

    if (!signedFile) {
      setLocalErr(
        "Selecciona el archivo de la hoja firmada (JPG, PNG, WebP o PDF, máx. 5 MB).",
      );
      return;
    }
    setBusy("signed");
    try {
      const fd = new FormData();
      fd.append("negotiation_sheet_signed", signedFile);
      const data = await authFetchForm(
        `/api/orders/${id}/?scope=negotiation_signed`,
        {
          method: "PATCH",
          formData: fd,
          token: accessToken,
        },
      );
      applyNegotiationSignedResponse(data);
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo subir la hoja firmada.",
      );
    } finally {
      setBusy("");
    }
  }, [
    accessToken,
    applyNegotiationSignedResponse,
    id,
    negotiationSignatureRef,
    signNegotiationOnWeb,
    signedFile,
  ]);

  const savePayment = useCallback(async () => {
    if (!id) return;
    setLocalErr("");
    setBusy("payment");
    try {
      const fd = new FormData();
      fd.append("payment_method", checkoutPaymentMethodToApi(paymentMethod));
      if (receiptFile) fd.append("payment_receipt", receiptFile);
      const data = await authFetchForm(`/api/orders/${id}/`, {
        method: "PATCH",
        formData: fd,
        token: accessToken,
      });
      onOrderUpdated(data);
      setReceiptFile(null);
      setWantReplaceReceipt(false);
      setInvoicedPaymentPasoVisible(false);
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo guardar el pago.",
      );
    } finally {
      setBusy("");
    }
  }, [accessToken, id, onOrderUpdated, paymentMethod, receiptFile]);

  const uploadArtFilesForLine = useCallback(
    async (fileList, targetLineId) => {
      if (!id || !fileList.length) return null;
      let latest = null;
      for (let i = 0; i < fileList.length; i += 1) {
        const fd = new FormData();
        fd.append("file", fileList[i]);
        fd.append("order_item", String(targetLineId));
        fd.append("order_item_id", String(targetLineId));
        latest = await authFetchForm(`/api/orders/${id}/upload-art/`, {
          method: "POST",
          formData: fd,
          token: accessToken,
        });
      }
      return latest;
    },
    [accessToken, id],
  );

  const uploadArt = useCallback(async () => {
    if (!id || artFiles.length === 0) {
      setLocalErr("Selecciona al menos un archivo de arte para subir.");
      return;
    }
    const targetLineId = needsMultiCodeArtUpload
      ? artOrderItemId
      : defaultArtUploadOrderItemPk(orderLineItems);
    if (needsMultiCodeArtUpload && targetLineId == null) {
      setLocalErr("Selecciona la línea del pedido a la que pertenecen estos archivos.");
      return;
    }
    if (targetLineId == null) {
      setLocalErr(
        "No se pudo determinar la línea del pedido para estos artes.",
      );
      return;
    }
    const pickerGroups = needsMultiCodeArtUpload
      ? artPickerGroups
      : artLineGroups;
    const groupPks = new Set(
      pickerGroups.map((g) => g.orderItemPk).filter((pk) => pk != null),
    );
    if (!groupPks.has(targetLineId)) {
      setLocalErr("Selecciona la línea del pedido a la que pertenecen estos archivos.");
      return;
    }
    setLocalErr("");
    setBusy("art");
    try {
      const latest = await uploadArtFilesForLine(artFiles, targetLineId);
      if (latest) onOrderUpdated(latest);
      setArtFiles([]);
      setArtExtraUploadOpen(false);
      setArtUploadModalOpen(false);
    } catch (e) {
      setLocalErr(
        e instanceof Error
          ? e.message
          : "No se pudieron subir uno o más archivos.",
      );
    } finally {
      setBusy("");
    }
  }, [
    artFiles,
    artLineGroups,
    artPickerGroups,
    artOrderItemId,
    id,
    needsMultiCodeArtUpload,
    onOrderUpdated,
    orderLineItems,
    uploadArtFilesForLine,
  ]);

  const uploadPendingArts = useCallback(async () => {
    if (!id) return;
    const batches = pendingArtGroups.filter((g) => g.files.length > 0);
    if (!batches.length) {
      setLocalErr("No hay archivos pendientes para subir.");
      return;
    }
    setLocalErr("");
    setBusy("art");
    try {
      let latest = null;
      for (const batch of batches) {
        latest = await uploadArtFilesForLine(batch.files, batch.orderItemPk);
      }
      if (latest) onOrderUpdated(latest);
      setPendingArtGroups([]);
      setArtUploadModalOpen(false);
    } catch (e) {
      setLocalErr(
        e instanceof Error
          ? e.message
          : "No se pudieron subir uno o más archivos.",
      );
    } finally {
      setBusy("");
    }
  }, [id, onOrderUpdated, pendingArtGroups, uploadArtFilesForLine]);

  const removePendingArtFile = useCallback((orderItemPk, fileIndex) => {
    setPendingArtGroups((prev) =>
      prev
        .map((g) => {
          if (g.orderItemPk !== orderItemPk) return g;
          return {
            ...g,
            files: g.files.filter((_, i) => i !== fileIndex),
          };
        })
        .filter((g) => g.files.length > 0),
    );
  }, []);

  const stageArtFromModal = useCallback(() => {
    if (artFiles.length === 0) {
      setLocalErr("Selecciona al menos un archivo de arte.");
      return;
    }
    if (artOrderItemId == null) {
      setLocalErr("Selecciona la toma a la que pertenecen estos archivos.");
      return;
    }
    const groupPks = new Set(
      artPickerGroups.map((g) => g.orderItemPk).filter((pk) => pk != null),
    );
    if (!groupPks.has(artOrderItemId)) {
      setLocalErr("Selecciona la línea del pedido a la que pertenecen estos artes.");
      return;
    }
    setLocalErr("");
    setPendingArtGroups((prev) => {
      const idx = prev.findIndex((g) => g.orderItemPk === artOrderItemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          files: [...next[idx].files, ...artFiles],
        };
        return next;
      }
      return [...prev, { orderItemPk: artOrderItemId, files: [...artFiles] }];
    });
    setArtFiles([]);
    setArtUploadModalOpen(false);
    if (hasArtAttachments) {
      setArtsResumenExpanded(true);
    }
  }, [artFiles, artPickerGroups, artOrderItemId, hasArtAttachments]);

  const openArtUploadModal = useCallback(() => {
    setLocalErr("");
    setArtFiles([]);
    setArtUploadModalOpen(true);
  }, []);

  const closeArtUploadModal = useCallback(() => {
    if (busy === "art") return;
    setArtUploadModalOpen(false);
    setArtFiles([]);
  }, [busy]);

  const confirmDeleteArt = useCallback(async () => {
    if (!id || pendingArtDeleteId == null) return;
    setLocalErr("");
    setBusy(`art-del-${pendingArtDeleteId}`);
    try {
      const data = await authFetch(
        `/api/orders/${id}/art-attachments/${pendingArtDeleteId}/`,
        {
          method: "DELETE",
          token: accessToken,
        },
      );
      onOrderUpdated(data);
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo eliminar el archivo.",
      );
      throw e;
    } finally {
      setBusy("");
    }
  }, [accessToken, id, onOrderUpdated, pendingArtDeleteId]);

  const submitPermit = useCallback(async () => {
    if (!id || !permitDate.trim() || !permitCompany.trim()) {
      setLocalErr("Indica la fecha de montaje y la empresa de instalación.");
      return;
    }
    const members = permitStaffFromProvider;
    if (!members.length) {
      setLocalErr(
        "El proveedor elegido no tiene personal en sitio configurado. Elige otro de la lista o pide al equipo que complete el proveedor en el panel de administración.",
      );
      return;
    }
    setLocalErr("");
    setBusy("permit");
    try {
      const data = await authFetch(`/api/orders/${id}/installation-permit/`, {
        method: "POST",
        token: accessToken,
        body: {
          mounting_date: permitDate.trim(),
          installation_company_name: permitCompany.trim(),
          staff_members: members,
          notes: permitNotes.trim(),
          municipal_reference: permitMunicipalRef.trim(),
        },
      });
      onOrderUpdated(data);
      setPermitDate("");
      setPermitCompany("");
      setPermitNotes("");
      setPermitMunicipalRef("");
    } catch (e) {
      setLocalErr(
        e instanceof Error
          ? e.message
          : "No se pudo enviar la solicitud de permiso.",
      );
    } finally {
      setBusy("");
    }
  }, [
    accessToken,
    id,
    onOrderUpdated,
    permitCompany,
    permitDate,
    permitMunicipalRef,
    permitNotes,
    permitStaffFromProvider,
  ]);

  const canSubmitMunicipalDocs = useMemo(() => {
    const needIssued = !hasMunicipalPermitIssuedSaved;
    const needTax = !hasMunicipalTaxReceiptSaved;
    if (!needIssued && !needTax) return false;
    if (needIssued && !municipalPermitIssuedFile) return false;
    if (needTax && !municipalTaxReceiptFile) return false;
    return true;
  }, [
    hasMunicipalPermitIssuedSaved,
    hasMunicipalTaxReceiptSaved,
    municipalPermitIssuedFile,
    municipalTaxReceiptFile,
  ]);

  const submitMunicipalDocuments = useCallback(async () => {
    if (!id || !canSubmitMunicipalDocs) {
      setLocalErr(
        "Adjunta el permiso emitido por la alcaldía y el comprobante del impuesto municipal (JPG, PNG, WebP o PDF, máx. 5 MB).",
      );
      return;
    }
    setLocalErr("");
    setBusy("municipal-docs");
    try {
      const fd = new FormData();
      if (municipalPermitIssuedFile) {
        fd.append("municipal_permit_issued", municipalPermitIssuedFile);
      }
      if (municipalTaxReceiptFile) {
        fd.append("municipal_tax_payment_receipt", municipalTaxReceiptFile);
      }
      const data = await authFetchForm(
        `/api/orders/${id}/installation-permit/municipal-documents/`,
        {
          method: "POST",
          formData: fd,
          token: accessToken,
        },
      );
      onOrderUpdated(data);
      setMunicipalPermitIssuedFile(null);
      setMunicipalTaxReceiptFile(null);
    } catch (e) {
      setLocalErr(
        e instanceof Error
          ? e.message
          : "No se pudieron guardar los documentos municipales.",
      );
    } finally {
      setBusy("");
    }
  }, [
    accessToken,
    canSubmitMunicipalDocs,
    id,
    municipalPermitIssuedFile,
    municipalTaxReceiptFile,
    onOrderUpdated,
  ]);

  const showSection = useMemo(() => {
    return (
      clientGuidanceNotice != null ||
      hasNegotiationPdf ||
      hasInvoicePdf ||
      hasSignedSheet ||
      canUploadSigned ||
      canPayFields ||
      canUploadArt ||
      hasArtAttachments ||
      canPermitForm ||
      canMunicipalDocsUpload ||
      permit
    );
  }, [
    clientGuidanceNotice,
    canMunicipalDocsUpload,
    canPayFields,
    canPermitForm,
    canUploadArt,
    canUploadSigned,
    hasArtAttachments,
    hasInvoicePdf,
    hasNegotiationPdf,
    permit,
    hasSignedSheet,
  ]);

  if (!showSection) {
    return null;
  }

  const workflowTitleId =
    sectionTitleId || (id != null ? `order-workflow-${id}` : "order-workflow");

  return (
    <div
      className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5`}
      aria-labelledby={workflowTitleId}
    >
      {!sectionTitleId ? (
        <h3
          id={workflowTitleId}
          className="text-sm font-semibold text-zinc-900"
        >
          Documentos y siguientes pasos
        </h3>
      ) : null}
      {localErr ? (
        <p
          className={`mt-3 ${ROUNDED_CONTROL} bg-red-50 px-3 py-2 text-sm text-red-800`}
          role="alert"
        >
          {localErr}
        </p>
      ) : null}

      {showDocStepper ? (
        <>
          <nav className="mt-4" aria-label="Pasos de documentos del pedido">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <p className={`${labelClass} mb-0`}>Guía de pasos</p>
              {anyDocPanelExpanded ? (
                <button
                  type="button"
                  onClick={() => collapseAllDocPanels()}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center ${ROUNDED_CONTROL} border border-zinc-200/90 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_35%,transparent)]`}
                  aria-label="Ocultar todos los paneles"
                  title="Ocultar todos"
                >
                  <IcCollapseAllPanels />
                </button>
              ) : null}
            </div>
            <ol className="m-0 mt-0 flex list-none flex-wrap gap-2 p-0">
              <li className="min-w-0 shrink-0">
                {step1Complete ? (
                  <button
                    type="button"
                    onClick={() =>
                      setNegotiationSignedResumenExpanded((v) => !v)
                    }
                    className={docStepToggleBtnClass(
                      1,
                      negotiationSignedResumenExpanded,
                    )}
                    aria-expanded={negotiationSignedResumenExpanded}
                    aria-controls={
                      id != null
                        ? `negotiation-signed-resumen-${id}`
                        : undefined
                    }
                  >
                    <span className="tabular-nums">1.</span>
                    <span>
                      {negotiationSignedResumenExpanded
                        ? "Ocultar hoja firmada y carta"
                        : "Ver hoja firmada y carta"}
                    </span>
                  </button>
                ) : hasNegotiationPdf ? (
                  canUploadSigned ? (
                    <button
                      type="button"
                      onClick={() => setSignedInitialUploadOpen((v) => !v)}
                      className={docStepToggleBtnClass(
                        1,
                        signedInitialUploadOpen,
                      )}
                      aria-expanded={signedInitialUploadOpen}
                      aria-controls={
                        id != null ? `signed-upload-step-${id}` : undefined
                      }
                      aria-current={
                        activeDocFlowStep === 1 ? "step" : undefined
                      }
                    >
                      <span className="tabular-nums">1.</span>
                      <span>
                        {signedInitialUploadOpen
                          ? hasMunicipalityPdf
                            ? "Ocultar hoja de negociación y carta"
                            : "Ocultar hoja de negociación"
                          : hasMunicipalityPdf
                            ? "Ver hoja de negociación y carta"
                            : "Ver hoja de negociación"}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === "negotiation"}
                      onClick={() => downloadNegotiation()}
                      className={docStepToggleBtnClass(1, false)}
                      aria-current={
                        activeDocFlowStep === 1 ? "step" : undefined
                      }
                    >
                      <span className="tabular-nums">1.</span>
                      <span>
                        {busy === "negotiation"
                          ? "Descargando…"
                          : "Descargar hoja (PDF)"}
                      </span>
                    </button>
                  )
                ) : (
                  <span className={docStepPendingClass}>
                    <span className="tabular-nums">1.</span>
                    <span>
                      {hasMunicipalityPdf
                        ? "Hoja de negociación y carta (pendiente)"
                        : "Hoja de negociación (pendiente)"}
                    </span>
                  </span>
                )}
              </li>
              {showArtsInStepper ? (
                <li className="min-w-0 shrink-0">
                  {step2Complete ? (
                    <button
                      type="button"
                      onClick={() => setArtsResumenExpanded((v) => !v)}
                      className={docStepToggleBtnClass(2, artsResumenExpanded)}
                      aria-expanded={artsResumenExpanded}
                      aria-controls={
                        id != null ? `arts-resumen-${id}` : undefined
                      }
                    >
                      <span className="tabular-nums">2.</span>
                      <span>
                        {artsResumenExpanded
                          ? "Ocultar artes"
                          : "Ver artes adjuntos"}
                      </span>
                    </button>
                  ) : canUploadArt ? (
                    <span
                      className={docStepChipClass(2)}
                      aria-current={
                        activeDocFlowStep === 2 ? "step" : undefined
                      }
                    >
                      <span className="tabular-nums">2.</span>
                      <span>
                        {activeDocFlowStep === 2
                          ? "Artes del anuncio"
                          : "Artes del anuncio (pendiente)"}
                      </span>
                    </span>
                  ) : (
                    <span className={docStepPendingClass}>
                      <span className="tabular-nums">2.</span>
                      <span>Artes (pendiente)</span>
                    </span>
                  )}
                </li>
              ) : null}
              <li className="min-w-0 shrink-0">
                {step3CanExpandResumen ? (
                  <button
                    type="button"
                    onClick={() => setPaymentResumenExpanded((v) => !v)}
                    className={docStepToggleBtnClass(3, paymentResumenExpanded)}
                    aria-expanded={paymentResumenExpanded}
                    aria-controls={
                      id != null ? `payment-resumen-${id}` : undefined
                    }
                  >
                    <span className="tabular-nums">3.</span>
                    <span>
                      {paymentResumenExpanded
                        ? "Ocultar factura y comprobante"
                        : "Ver factura y comprobante"}
                    </span>
                  </button>
                ) : status === "art_approved" && !hasInvoicePdf ? (
                  <span className={docStepChipClass(3)}>
                    <span className="tabular-nums">3.</span>
                    <span>Factura y comprobante (en preparación)</span>
                  </span>
                ) : canPayFields && status === "invoiced" ? (
                  <span
                    className={docStepChipClass(3)}
                    aria-current={activeDocFlowStep === 3 ? "step" : undefined}
                  >
                    <span className="tabular-nums">3.</span>
                    <span>Factura y comprobante</span>
                  </span>
                ) : canPayFields && status === "paid" ? (
                  <span className={docStepPendingClass}>
                    <span className="tabular-nums">3.</span>
                    <span>Factura y comprobante (comprobante opcional)</span>
                  </span>
                ) : (
                  <span className={docStepPendingClass}>
                    <span className="tabular-nums">3.</span>
                    <span>Factura y comprobante (pendiente)</span>
                  </span>
                )}
              </li>
              <li className="min-w-0 shrink-0">
                {step4Complete && canMunicipalDocsUpload ? (
                  <span
                    className={docStepChipClass(4)}
                    aria-current={activeDocFlowStep === 4 ? "step" : undefined}
                  >
                    <span className="tabular-nums">4.</span>
                    <span>Solicitud y documentos</span>
                  </span>
                ) : step4Complete ? (
                  <button
                    type="button"
                    onClick={() => setPermitResumenExpanded((v) => !v)}
                    className={docStepToggleBtnClass(4, permitResumenExpanded)}
                    aria-expanded={permitResumenExpanded}
                    aria-controls={
                      id != null ? `permit-resumen-${id}` : undefined
                    }
                  >
                    <span className="tabular-nums">4.</span>
                    <span>
                      {permitResumenExpanded
                        ? "Ocultar solicitud y documentos"
                        : "Ver solicitud y documentos"}
                    </span>
                  </button>
                ) : canPermitForm ? (
                  <span
                    className={docStepChipClass(4)}
                    aria-current={activeDocFlowStep === 4 ? "step" : undefined}
                  >
                    <span className="tabular-nums">4.</span>
                    <span>Solicitud y documentos</span>
                  </span>
                ) : (
                  <span className={docStepPendingClass}>
                    <span className="tabular-nums">4.</span>
                    <span>Solicitud y documentos (pendiente)</span>
                  </span>
                )}
              </li>
            </ol>
          </nav>
          <div className="mt-0 min-w-0">
            {step1Complete && negotiationSignedResumenExpanded && id != null ? (
              <div
                id={`negotiation-signed-resumen-${id}`}
                className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
              >
                {hasMunicipalityPdf ? (
                  <div>
                    <p className={`${labelClass} mb-2`}>Carta al municipio</p>
                    <PdfPreview
                      {...orderClientPdfPreviewProps}
                      hideTitle
                      title="Carta al municipio"
                      downloadFileName={orderDocFilename(
                        order,
                        "carta-municipio",
                      )}
                      disabled={false}
                      emptyHint="No se pudo cargar la carta al municipio."
                      loadKey={`${id}-municipality-resumen`}
                      onFetchBlob={fetchMunicipalityBlob}
                    />
                  </div>
                ) : null}
                <div
                  className={
                    hasMunicipalityPdf
                      ? "mt-4 border-t border-zinc-200/80 pt-3"
                      : ""
                  }
                >
                  <p className={`${labelClass} mb-2`}>Hoja firmada</p>
                  <div>
                    {signedKindInPanel === "pdf" ? (
                      <PdfPreview
                        {...orderClientPdfPreviewProps}
                        hideTitle
                        title="Hoja firmada"
                        downloadFileName={orderDocFilename(
                          order,
                          "hoja-negociacion-firmada",
                        )}
                        disabled={false}
                        emptyHint="No se pudo cargar la vista previa."
                        loadKey={signedSignedPreviewKey}
                        onFetchBlob={fetchNegotiationSignedBlob}
                      />
                    ) : signedKindInPanel === "image" ? (
                      <div
                        key={signedSignedPreviewKey}
                        className="flex flex-col items-center sm:items-start"
                      >
                        <button
                          type="button"
                          className={`relative block aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm ${squareListImagePreviewButtonRingClass} p-0`}
                          aria-label="Ver hoja firmada a tamaño completo"
                          onClick={() => openSignedNegotiationLightbox()}
                        >
                          <RasterFromApiUrl
                            url={signedRawForUi}
                            alt=""
                            width={400}
                            height={300}
                            className="h-full w-full object-cover"
                            {...catalogRasterImgAttrs}
                          />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600">
                        <a
                          href={signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-zinc-900 underline-offset-2 hover:underline"
                        >
                          Abrir archivo en pestaña nueva
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                {(status === "client_approved" ||
                  status === "invoiced" ||
                  status === "paid") &&
                hasNegotiationPdf ? (
                  <div className="mt-4 border-t border-zinc-200/80 pt-3">
                    {!wantReplaceSignedSheet ? (
                      <button
                        type="button"
                        onClick={() => setWantReplaceSignedSheet(true)}
                        className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                      >
                        Cambiar hoja firmada
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <NegotiationSheetSignedUpload
                          idPrefix={`signed-resumen-replace-${id}`}
                          signedFile={signedFile}
                          onSignedFileChange={setSignedFile}
                          signOnWeb={signNegotiationOnWeb}
                          onSignOnWebChange={setSignNegotiationOnWeb}
                          signatureEmpty={negotiationSignatureEmpty}
                          onSignatureEmptyChange={setNegotiationSignatureEmpty}
                          signatureRef={negotiationSignatureRef}
                          fileDropLabel="Nueva hoja firmada"
                          busy={busy === "signed"}
                          onSubmit={() => uploadSigned()}
                          submitLabel="Guardar hoja firmada"
                          busySubmitLabel="Guardando…"
                        />
                        <button
                          type="button"
                          disabled={busy === "signed"}
                          onClick={() => {
                            setWantReplaceSignedSheet(false);
                            resetNegotiationSignedForm();
                          }}
                          className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {step2Complete && artsResumenExpanded && id != null ? (
              <div
                id={`arts-resumen-${id}`}
                className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
              >
                <p className={`${labelClass} mb-2`}>Artes adjuntos</p>
                {orderArtEntries.length > 0 ? (
                  <OrderClientArtAttachmentsGrouped
                    orderId={id}
                    orderLineItems={orderLineItems}
                    orderArtEntries={orderArtEntries}
                    artImageEntries={artImageEntries}
                    accessToken={accessToken}
                    canUploadArt={canUploadArt}
                    busy={busy}
                    pendingArtDeleteId={pendingArtDeleteId}
                    onRequestDeleteArt={setPendingArtDeleteId}
                    onOpenArtsLightbox={openArtsLightbox}
                  />
                ) : null}
                {canUploadArt ? (
                  <div className="mt-4 border-t border-zinc-200/80 pt-3">
                    {needsMultiCodeArtUpload && pendingArtFileCount > 0 ? (
                      <div className="space-y-3">
                        <OrderPendingArtStaging
                          pendingGroups={pendingArtGroups}
                          lineGroups={artPickerGroups}
                          orderId={id}
                          onRemoveFile={removePendingArtFile}
                          labelClass={labelClass}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy === "art"}
                            onClick={() => uploadPendingArts()}
                            className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                          >
                            {busy === "art"
                              ? "Subiendo…"
                              : pendingArtFileCount > 1
                                ? `Subir ${pendingArtFileCount} archivos`
                                : "Subir artes"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === "art"}
                            onClick={() => openArtUploadModal()}
                            className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                          >
                            Añadir más artes
                          </button>
                        </div>
                      </div>
                    ) : needsMultiCodeArtUpload ? (
                      <button
                        type="button"
                        onClick={() => openArtUploadModal()}
                        className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                      >
                        Subir más artes
                      </button>
                    ) : !artExtraUploadOpen ? (
                      <button
                        type="button"
                        onClick={() => setArtExtraUploadOpen(true)}
                        className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                      >
                        Subir más artes
                      </button>
                    ) : (
                      <OrderArtUploadFields
                        groups={artLineGroups}
                        needsTomaChoice={false}
                        artOrderItemId={artOrderItemId}
                        onArtOrderItemIdChange={setArtOrderItemId}
                        artFiles={artFiles}
                        onArtFilesChange={setArtFiles}
                        idSuffix={id != null ? `extra-${id}` : "extra"}
                        labelClass={labelClass}
                        busy={busy}
                        onUpload={uploadArt}
                        onCancel={() => {
                          setArtExtraUploadOpen(false);
                          setArtFiles([]);
                        }}
                        showCancel
                        dropZoneClassName=""
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {step3CanExpandResumen && paymentResumenExpanded && id != null ? (
              <div
                id={`payment-resumen-${id}`}
                role="region"
                aria-label="Factura y comprobante de pago"
                className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
              >
                {hasInvoicePdf ? (
                  <div
                    className={
                      hasReceiptSaved ? "pb-4 border-b border-zinc-200/80" : ""
                    }
                  >
                    <p className={`${labelClass} mb-2`}>Factura</p>
                    {invoiceKindInPanel === "pdf" ? (
                      <PdfPreview
                        {...orderClientPdfPreviewProps}
                        hideTitle
                        title="Factura"
                        downloadFileName={orderDocFilename(order, "factura")}
                        disabled={false}
                        emptyHint="No se pudo cargar la factura."
                        loadKey={`${id}-invoice-resumen-${isExternalInvoice ? "ext" : "gen"}-${invoiceOrderCodeKey}`}
                        directUrl={
                          isExternalInvoice
                            ? normalizeMediaUrlForUi(invoiceRawForUi)
                            : undefined
                        }
                        onFetchBlob={
                          isExternalInvoice ? undefined : fetchInvoiceBlob
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center sm:items-start">
                        <RasterFromApiUrl
                          url={invoiceRawForUi}
                          alt="Factura"
                          className="max-h-[min(14rem,40vh)] w-auto max-w-full rounded-[10px] border border-zinc-200/90 object-contain shadow-sm"
                          {...catalogRasterImgAttrs}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
                {hasReceiptSaved ? (
                  <div className={hasInvoicePdf ? "mt-4" : ""}>
                    <p className={`${labelClass} mb-2`}>Comprobante de pago</p>
                    <div>
                      {receiptKindInPanel === "pdf" ? (
                        <PdfPreview
                          {...orderClientPdfPreviewProps}
                          hideTitle
                          title="Comprobante"
                          downloadFileName={orderDocFilename(
                            order,
                            "comprobante",
                          )}
                          disabled={!normalizeMediaUrlForUi(receiptRawForUi)}
                          emptyHint="No se pudo cargar la vista previa del PDF."
                          loadKey={`${id}-receipt-resumen-pdf`}
                          directUrl={normalizeMediaUrlForUi(receiptRawForUi)}
                        />
                      ) : receiptKindInPanel === "image" ? (
                        <div className="flex flex-col items-center sm:items-start">
                          <button
                            type="button"
                            className={`relative block aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[10px] border border-zinc-200/90 bg-zinc-100 shadow-sm ${squareListImagePreviewButtonRingClass} p-0`}
                            aria-label="Ver comprobante a tamaño completo"
                            onClick={() => openReceiptLightbox()}
                          >
                            <RasterFromApiUrl
                              url={receiptRawForUi}
                              alt=""
                              width={400}
                              height={300}
                              className="h-full w-full object-cover"
                              {...catalogRasterImgAttrs}
                            />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600">
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-zinc-900 underline-offset-2 hover:underline"
                          >
                            Abrir comprobante en pestaña nueva
                          </a>
                        </p>
                      )}
                    </div>
                    {canPayFields ? (
                      <div className="mt-4 border-t border-zinc-200/80 pt-3">
                        {status === "invoiced" && hasReceiptSaved ? (
                          <button
                            type="button"
                            onClick={() => {
                              setInvoicedPaymentPasoVisible(true);
                              setWantReplaceReceipt(true);
                            }}
                            className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                          >
                            Cambiar comprobante
                          </button>
                        ) : !wantReplaceReceipt ? (
                          <button
                            type="button"
                            onClick={() => setWantReplaceReceipt(true)}
                            className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                          >
                            Cambiar comprobante
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <FileDropZoneField
                              id={`receipt-resumen-replace-${id}`}
                              label="Nuevo comprobante"
                              value={receiptFile}
                              onChange={setReceiptFile}
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego pulsa «Guardar comprobante»."
                              formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                              formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                              dropZoneAriaLabel="Zona para reemplazar comprobante de pago"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!receiptFile || busy === "payment"}
                                onClick={() => savePayment()}
                                className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                              >
                                {busy === "payment"
                                  ? "Guardando…"
                                  : "Guardar comprobante"}
                              </button>
                              <button
                                type="button"
                                disabled={busy === "payment"}
                                onClick={() => {
                                  setWantReplaceReceipt(false);
                                  setReceiptFile(null);
                                }}
                                className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {permit && permitResumenExpanded && id != null ? (
              <div
                id={`permit-resumen-${id}`}
                role="region"
                aria-label="Solicitud y documentos de permiso"
                className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
              >
                <p className={`${labelClass} mb-2`}>Solicitud de permiso</p>
                {order?.installation_permit_request_pdf_url ? (
                  <div className="mt-3 min-h-0">
                    <PdfPreview
                      {...orderClientPdfPreviewProps}
                      hideTitle
                      title="Solicitud de permiso de instalación"
                      downloadFileName={orderDocFilename(
                        order,
                        "solicitud-permiso-instalacion",
                      )}
                      disabled={false}
                      emptyHint="No se pudo cargar la vista previa del PDF."
                      loadKey={`${id}-permit-request-resumen-${String(permit?.id ?? "")}`}
                      onFetchBlob={fetchInstallationPermitRequestBlob}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    El PDF de la solicitud no está disponible todavía.
                  </p>
                )}
                {hasMunicipalPermitIssuedSaved ||
                hasMunicipalTaxReceiptSaved ? (
                  <div className="mt-4 space-y-4 border-t border-zinc-200/80 pt-4">
                    {hasMunicipalPermitIssuedSaved ? (
                      <MunicipalAttachmentClientPreview
                        label="Permiso emitido por la alcaldía"
                        rawUrl={municipalPermitIssuedRaw}
                        order={order}
                        orderId={id}
                        fileKey="permiso-emitido-alcaldia"
                        labelClass={labelClass}
                        onOpenImage={() =>
                          openMunicipalImageLightbox(
                            municipalPermitIssuedRaw,
                            "Permiso emitido por la alcaldía",
                          )
                        }
                      />
                    ) : null}
                    {hasMunicipalTaxReceiptSaved ? (
                      <MunicipalAttachmentClientPreview
                        label="Comprobante del impuesto municipal"
                        rawUrl={municipalTaxReceiptRaw}
                        order={order}
                        orderId={id}
                        fileKey="impuesto-municipal"
                        labelClass={labelClass}
                        onOpenImage={() =>
                          openMunicipalImageLightbox(
                            municipalTaxReceiptRaw,
                            "Comprobante del impuesto municipal",
                          )
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {showClientGuidanceBanner ? (
            <div
              role="status"
              className={`mt-4 border px-3 py-3 text-sm leading-snug ${ROUNDED_CONTROL} ${
                clientGuidanceNotice.kind === "outcome"
                  ? "border-rose-200/90 bg-rose-50/95 text-rose-950"
                  : clientGuidanceNotice.kind === "action"
                    ? "border-amber-200/90 bg-amber-50/95 text-amber-950"
                    : clientGuidanceNotice.kind === "done"
                      ? "border-emerald-200/90 bg-emerald-50/95 text-emerald-950"
                      : "border-sky-200/90 bg-sky-50/95 text-sky-950"
              }`}
            >
              <p className={`${labelClass} mb-0 text-[10px] text-zinc-500`}>
                {clientGuidanceNotice.kind === "done"
                  ? "Proceso completo"
                  : "Siguiente paso"}
              </p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-900">
                {clientGuidanceNotice.nextStep}
              </p>
              <p className="mt-2 text-[13px] font-normal text-zinc-700">
                {clientGuidanceNotice.detail}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {activeDocUploadStep === 1 && signedInitialUploadOpen && id != null ? (
        <div
          id={`signed-upload-step-${id}`}
          role="region"
          aria-labelledby={`signed-upload-heading-${id}`}
          className="mt-5 scroll-mt-24 border-t border-zinc-100 pt-5"
        >
          <div className="min-w-0">
            <p
              id={`signed-upload-heading-${id}`}
              className={`${labelClass} mb-0`}
            >
              Paso actual
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              1 · Hoja de negociación
              {hasMunicipalityPdf ? " y carta al municipio" : ""}
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {hasMunicipalityPdf
              ? "Descarga la hoja y la carta al municipio, firma la hoja y súbela aquí."
              : "Descarga la hoja de negociación, fírmala y súbela aquí."}
          </p>
          <p className={`mt-4 ${labelClass}`}>Descargas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === "negotiation"}
              onClick={() => downloadNegotiation()}
              className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
            >
              {busy === "negotiation" ? "Descargando…" : "Hoja de negociación"}
            </button>
            {hasMunicipalityPdf ? (
              <button
                type="button"
                disabled={busy === "municipality"}
                onClick={() => downloadMunicipality()}
                className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
              >
                {busy === "municipality"
                  ? "Descargando…"
                  : "Carta al municipio"}
              </button>
            ) : null}
          </div>
          <NegotiationSheetSignedUpload
            idPrefix={`signed-${id}`}
            signedFile={signedFile}
            onSignedFileChange={setSignedFile}
            signOnWeb={signNegotiationOnWeb}
            onSignOnWebChange={setSignNegotiationOnWeb}
            signatureEmpty={negotiationSignatureEmpty}
            onSignatureEmptyChange={setNegotiationSignatureEmpty}
            signatureRef={negotiationSignatureRef}
            busy={busy === "signed"}
            onSubmit={() => uploadSigned()}
            submitLabel="Subir hoja de negociación firmada"
            busySubmitLabel="Subiendo…"
            className="mt-4"
          />
        </div>
      ) : null}

      {!showDocStepper && showClientGuidanceBanner ? (
        <div
          role="status"
          className={`mt-3 border px-3 py-3 text-sm leading-snug ${ROUNDED_CONTROL} ${
            clientGuidanceNotice.kind === "outcome"
              ? "border-rose-200/90 bg-rose-50/95 text-rose-950"
              : clientGuidanceNotice.kind === "action"
                ? "border-amber-200/90 bg-amber-50/95 text-amber-950"
                : clientGuidanceNotice.kind === "done"
                  ? "border-emerald-200/90 bg-emerald-50/95 text-emerald-950"
                  : "border-sky-200/90 bg-sky-50/95 text-sky-950"
          }`}
        >
          <p className={`${labelClass} mb-0 text-[10px] text-zinc-500`}>
            {clientGuidanceNotice.kind === "done"
              ? "Proceso completo"
              : "Siguiente paso"}
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-900">
            {clientGuidanceNotice.nextStep}
          </p>
          <p className="mt-2 text-[13px] font-normal text-zinc-700">
            {clientGuidanceNotice.detail}
          </p>
        </div>
      ) : null}

      {showInvoicedPaymentPasoActual && activeDocUploadStep !== 4 ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="min-w-0">
            <p className={`${labelClass}`}>Paso actual</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              3 · Factura y comprobante
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {hasReceiptSaved && wantReplaceReceipt
              ? "Sube el archivo nuevo; el comprobante actual sigue visible en el resumen del paso 3."
              : hasInvoicePdf
                ? "Revisa la factura y luego adjunta el comprobante de pago."
                : "Adjunta aquí el comprobante de pago."}
          </p>
          {hasInvoicePdf && !hasReceiptSaved ? (
            <div className="mt-3 min-h-0 max-w-lg">
              {invoiceKindInPanel === "pdf" ? (
                <PdfPreview
                  {...orderClientPdfPreviewProps}
                  hideTitle
                  title="Factura"
                  downloadFileName={orderDocFilename(order, "factura")}
                  disabled={false}
                  emptyHint="No se pudo cargar la factura."
                  loadKey={`${id}-invoice-paso-actual-${isExternalInvoice ? "ext" : "gen"}-${invoiceOrderCodeKey}`}
                  directUrl={
                    isExternalInvoice
                      ? normalizeMediaUrlForUi(invoiceRawForUi)
                      : undefined
                  }
                  onFetchBlob={isExternalInvoice ? undefined : fetchInvoiceBlob}
                />
              ) : (
                <RasterFromApiUrl
                  url={invoiceRawForUi}
                  alt="Factura"
                  className="max-h-[min(14rem,40vh)] w-auto max-w-full rounded-[10px] border border-zinc-200/90 object-contain shadow-sm"
                  {...catalogRasterImgAttrs}
                />
              )}
            </div>
          ) : null}
          <p className={`mt-4 ${labelClass}`}>Método de pago</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const on = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`min-h-10 rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm ${
                    on
                      ? "border-[color-mix(in_srgb,var(--mp-primary)_58%,#d4d4d8)] bg-[color-mix(in_srgb,var(--mp-primary)_12%,#fff)] mp-text-brand ring-1 ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)]"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {hasReceiptSaved ? (
            <div className="mt-4 space-y-3">
              {wantReplaceReceipt ? (
                <>
                  <FileDropZoneField
                    className="pt-1"
                    id={`receipt-replace-${id}`}
                    label="Nuevo comprobante"
                    value={receiptFile}
                    onChange={setReceiptFile}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    helperText="Sustituye al archivo actual. JPG, PNG, WebP o PDF · máximo 5 MB."
                    formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                    formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                    dropZoneAriaLabel="Zona para reemplazar comprobante de pago"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={
                        busy === "payment" ||
                        (!paymentMethodDirty && !receiptFile)
                      }
                      onClick={() => savePayment()}
                      className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                    >
                      {busy === "payment" ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === "payment"}
                      onClick={closeInvoicedPaymentPaso}
                      className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={labelClass}>Comprobante</p>
                  <div
                    className={`max-w-md overflow-hidden ${ROUNDED_CONTROL} border border-zinc-200/90 bg-zinc-100/80 shadow-inner`}
                  >
                    <div className="relative min-h-[10rem] w-full overflow-hidden sm:min-h-[11rem]">
                      {isReceiptPdfSaved ? (
                        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 py-5 text-center sm:min-h-[11rem]">
                          <span className="rounded-[10px] bg-zinc-800/90 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-zinc-100">
                            PDF
                          </span>
                          <span className="max-w-[14rem] text-xs font-medium leading-snug text-zinc-600">
                            Comprobante guardado. También puedes abrirlo desde
                            el paso 3 del resumen (Factura y comprobante).
                          </span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={receiptUrl}
                          alt="Vista previa del comprobante de pago"
                          className="absolute inset-0 h-full w-full object-cover"
                          {...catalogRasterImgAttrs}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${marketplacePrimaryBtn} inline-flex min-h-10 items-center justify-center px-4 py-2 text-sm font-semibold no-underline`}
                    >
                      Ver comprobante
                    </a>
                    {paymentMethodDirty ? (
                      <button
                        type="button"
                        disabled={busy === "payment"}
                        onClick={() => savePayment()}
                        className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                      >
                        {busy === "payment"
                          ? "Guardando…"
                          : "Guardar método de pago"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setWantReplaceReceipt(true)}
                      className="text-xs font-semibold text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                    >
                      Cambiar comprobante
                    </button>
                    <button
                      type="button"
                      disabled={busy === "payment"}
                      onClick={closeInvoicedPaymentPaso}
                      className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <FileDropZoneField
                className="mt-4"
                id={`receipt-${id}`}
                label="Comprobante de pago"
                value={receiptFile}
                onChange={setReceiptFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="Formato obligatorio: JPG, PNG, WebP o PDF · máximo 5 MB."
                formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                dropZoneAriaLabel="Zona para adjuntar comprobante de pago"
              />
              <button
                type="button"
                disabled={busy === "payment"}
                onClick={() => savePayment()}
                className={`${marketplacePrimaryBtn} mt-3 min-h-10 px-4 py-2 text-sm font-semibold`}
              >
                {busy === "payment" ? "Enviando…" : "Enviar comprobante"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {showArtAttachmentsSection &&
      canUploadArt &&
      !hasArtAttachments &&
      activeDocUploadStep === 2 ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="min-w-0">
            <p className={`${labelClass}`}>Paso actual</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              2 · Artes del anuncio
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {needsMultiCodeArtUpload
              ? "Este pedido tiene varias líneas de toma (códigos distintos o el mismo código en meses saltados). Abre el formulario, elige la línea y adjunta los artes que correspondan."
              : "Sube aquí los artes de la toma. Puedes adjuntar varios archivos a la vez."}
          </p>
          {needsMultiCodeArtUpload ? (
            <div className="mt-4 space-y-4">
              {pendingArtFileCount > 0 ? (
                <OrderPendingArtStaging
                  pendingGroups={pendingArtGroups}
                  lineGroups={artPickerGroups}
                  orderId={id ?? ""}
                  onRemoveFile={removePendingArtFile}
                  labelClass={labelClass}
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openArtUploadModal()}
                  className={
                    pendingArtFileCount > 0
                      ? `${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`
                      : `${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`
                  }
                >
                  {pendingArtFileCount > 0 ? "Añadir más artes" : "Añadir artes"}
                </button>
                {pendingArtFileCount > 0 ? (
                  <button
                    type="button"
                    disabled={busy === "art"}
                    onClick={() => uploadPendingArts()}
                    className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                  >
                    {busy === "art"
                      ? "Subiendo…"
                      : pendingArtFileCount > 1
                        ? `Subir ${pendingArtFileCount} archivos`
                        : "Subir artes"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <OrderArtUploadFields
              groups={artLineGroups}
              needsTomaChoice={false}
              artOrderItemId={artOrderItemId}
              onArtOrderItemIdChange={setArtOrderItemId}
              artFiles={artFiles}
              onArtFilesChange={setArtFiles}
              idSuffix={id != null ? String(id) : "art"}
              labelClass={labelClass}
              busy={busy}
              onUpload={uploadArt}
              dropZoneClassName="mt-4"
            />
          )}
        </div>
      ) : null}

      {needsMultiCodeArtUpload && id != null ? (
        <OrderArtUploadModal
          open={artUploadModalOpen}
          onClose={closeArtUploadModal}
          groups={artPickerGroups}
          artOrderItemId={artOrderItemId}
          onArtOrderItemIdChange={setArtOrderItemId}
          artFiles={artFiles}
          onArtFilesChange={setArtFiles}
          busy={busy}
          onStage={stageArtFromModal}
          labelClass={labelClass}
          orderId={id}
        />
      ) : null}

      {canMunicipalDocsUpload && activeDocUploadStep === 4 ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="min-w-0">
            <p className={`${labelClass}`}>Paso actual</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              4 · Solicitud y documentos
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Adjunta el permiso emitido por la alcaldía y el comprobante del pago
            del impuesto municipal (documentos del paso 4). Ambos son
            obligatorios antes de la instalación.
          </p>
          <div className="mt-4 space-y-4">
            {hasMunicipalPermitIssuedSaved ? (
              <p className="text-sm text-emerald-900">
                Ya recibimos el permiso emitido por la alcaldía.
              </p>
            ) : (
              <FileDropZoneField
                id={`municipal-permit-issued-${id}`}
                label="Permiso emitido por la alcaldía"
                value={municipalPermitIssuedFile}
                onChange={setMunicipalPermitIssuedFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="JPG, PNG, WebP o PDF · máximo 5 MB."
                formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                dropZoneAriaLabel="Zona para adjuntar el permiso emitido por la alcaldía"
              />
            )}
            {hasMunicipalTaxReceiptSaved ? (
              <p className="text-sm text-emerald-900">
                Ya recibimos el comprobante del impuesto municipal.
              </p>
            ) : (
              <FileDropZoneField
                id={`municipal-tax-receipt-${id}`}
                label="Comprobante del impuesto municipal"
                value={municipalTaxReceiptFile}
                onChange={setMunicipalTaxReceiptFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="JPG, PNG, WebP o PDF · máximo 5 MB."
                formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                dropZoneAriaLabel="Zona para adjuntar el comprobante del impuesto municipal"
              />
            )}
          </div>
          <button
            type="button"
            disabled={!canSubmitMunicipalDocs || busy === "municipal-docs"}
            onClick={() => submitMunicipalDocuments()}
            className={`${marketplacePrimaryBtn} mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:w-auto`}
          >
            {busy === "municipal-docs"
              ? "Guardando…"
              : "Guardar documentos municipales"}
          </button>
        </div>
      ) : null}

      {canPermitForm && activeDocUploadStep === 4 ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="min-w-0">
            <p className={`${labelClass}`}>Paso actual</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              4 · Solicitud y documentos
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Indica la fecha de montaje y la empresa de instalación (solicitud
            ante la alcaldía).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`perm-date-${id}`}>
                Fecha de montaje
              </label>
              <input
                id={`perm-date-${id}`}
                type="date"
                className={fieldClass}
                value={permitDate}
                min={permitMountMinDate || undefined}
                onChange={(e) => setPermitDate(e.target.value)}
              />
              {permitMountMinDate ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Como máximo un día antes del inicio del contrato (desde{" "}
                  {permitMountMinDate.split("-").reverse().join("/")}).
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <span className={labelClass} id={`perm-co-label-${id}`}>
                Empresa de instalación
              </span>
              {permitCenters.length === 0 ? (
                <input
                  id={`perm-co-${id}`}
                  className={`${fieldClass} mt-2`}
                  aria-labelledby={`perm-co-label-${id}`}
                  value={permitCompany}
                  onChange={(e) => setPermitCompany(e.target.value)}
                  placeholder="Nombre de la empresa de instalación"
                />
              ) : (
                <MountingCompanyCreatableSelect
                  id={id != null ? `perm-co-${id}` : "perm-co"}
                  className="mt-2"
                  value={permitCompany}
                  onChange={setPermitCompany}
                  providers={mountProviders}
                  multiCenter={permitCenters.length > 1}
                  allowCreate={false}
                  isLoading={mountProvidersLoading}
                  aria-label="Empresa de instalación"
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor={`perm-ref-${id}`}>
                Expediente o referencia de la alcaldía (opcional)
              </label>
              <input
                id={`perm-ref-${id}`}
                className={fieldClass}
                value={permitMunicipalRef}
                onChange={(e) => setPermitMunicipalRef(e.target.value)}
                placeholder="Ej. número de expediente"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor={`perm-notes-${id}`}>
                Notas (opcional)
              </label>
              <textarea
                id={`perm-notes-${id}`}
                rows={2}
                className={fieldClass}
                value={permitNotes}
                onChange={(e) => setPermitNotes(e.target.value)}
              />
            </div>
          </div>
          {permitCompany.trim() ? (
            <>
              <p className={`mt-4 ${labelClass}`}>Personal en sitio</p>
              {permitStaffFromProvider.length ? (
                <ul className="mt-2 divide-y divide-zinc-100 rounded-[10px] border border-zinc-200/90 bg-zinc-50/80">
                  {permitStaffFromProvider.map((row) => (
                    <li
                      key={`${row.id_number}-${row.full_name}`}
                      className="px-3 py-2 text-sm text-zinc-800"
                    >
                      <span className="font-medium text-zinc-900">
                        {row.full_name}
                      </span>
                      <span className="text-zinc-500"> · </span>
                      <span className="tabular-nums">{row.id_number}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-amber-950">
                  Esta empresa no tiene personal registrado. Elige otra de la
                  lista.
                </p>
              )}
            </>
          ) : null}
          <button
            type="button"
            disabled={busy === "permit"}
            onClick={() => submitPermit()}
            className={`${marketplacePrimaryBtn} mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:w-auto`}
          >
            {busy === "permit" ? (
              "Enviando…"
            ) : (
              <>
                <IconRowPaperAirplane className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-95" />
                Enviar solicitud de permiso
              </>
            )}
          </button>
        </div>
      ) : null}

      <ImageLightbox
        open={artsLightboxOpen}
        onClose={() => setArtsLightboxOpen(false)}
        items={artsLightboxItems}
        initialIndex={artsLightboxIndex}
        showThumbnails={artsLightboxItems.length > 1}
        showDownload
        ariaLabel="Artes subidos"
      />
      <ImageLightbox
        open={receiptLightbox.open}
        onClose={() => setReceiptLightbox((s) => ({ ...s, open: false }))}
        items={receiptLightbox.items}
        initialIndex={receiptLightbox.initialIndex}
        showDownload
        ariaLabel="Comprobante de pago"
      />
      <ImageLightbox
        open={signedNegotiationLightbox.open}
        onClose={() =>
          setSignedNegotiationLightbox((s) => ({ ...s, open: false }))
        }
        items={signedNegotiationLightbox.items}
        initialIndex={signedNegotiationLightbox.initialIndex}
        showDownload
        ariaLabel="Hoja de negociación firmada"
      />
      <CustomAlert
        open={pendingArtDeleteId != null}
        onClose={() => setPendingArtDeleteId(null)}
        title="Eliminar archivo"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        labelledById={
          id != null ? `order-art-delete-${id}` : "order-art-delete"
        }
        onConfirm={confirmDeleteArt}
      >
        <p>¿Eliminar este archivo? No se puede deshacer.</p>
      </CustomAlert>
    </div>
  );
}
