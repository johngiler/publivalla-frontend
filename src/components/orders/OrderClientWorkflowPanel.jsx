"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AdminSelect } from "@/components/admin/AdminSelect";
import {
  IconRowPaperAirplane,
  IconRowPlus,
  IconRowTrash,
} from "@/components/admin/rowActionIcons";
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
import { apiBlobPathFromMediaField, mediaUrlForUiWithWebp, normalizeMediaUrlForUi } from "@/lib/mediaUrls";
import { squareListImagePreviewButtonRingClass } from "@/lib/squareImagePreview";
import { ROUNDED_CONTROL, ROUNDED_PDF_GRID_CARD } from "@/lib/uiRounding";
import { orderHoldIsActive } from "@/lib/orderHoldDisplay";
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
function artLineCaptionFromAttachment(a) {
  const code = a?.order_item_code != null ? String(a.order_item_code).trim() : "";
  const title = a?.order_item_title != null ? String(a.order_item_title).trim() : "";
  if (code && title) return `${code} — ${title}`;
  if (code) return code;
  if (title) return title;
  if (a?.order_item != null) return `Línea #${a.order_item}`;
  return "";
}

/**
 * Selector de línea del pedido (react-select vía {@link AdminSelect}).
 * @param {{
 *   lineItems: Array<Record<string, unknown>>;
 *   value: number | null;
 *   onChange: (id: number) => void;
 *   idSuffix: string | number;
 *   labelClass: string;
 * }} props
 */
function ArtLinePicker({ lineItems, value, onChange, idSuffix, labelClass }) {
  if (!lineItems || lineItems.length <= 1) return null;
  const selectId = `art-line-select-${idSuffix}`;
  const options = lineItems.map((it) => {
    const code = it.ad_space_code != null ? String(it.ad_space_code) : "—";
    const title =
      it.ad_space_title != null && String(it.ad_space_title).trim()
        ? String(it.ad_space_title).trim()
        : "";
    return {
      v: Number(it.id),
      l: title ? `${code} — ${title}` : code,
    };
  });
  return (
    <div className="mt-2 min-w-0 space-y-2">
      <label className={labelClass} htmlFor={selectId}>
        Toma a la que aplica este archivo
      </label>
      <AdminSelect
        id={selectId}
        options={options}
        value={value}
        onChange={(v) => {
          const n = typeof v === "number" ? v : Number(v);
          if (Number.isFinite(n)) onChange(n);
        }}
        placeholder="Selecciona la toma…"
        aria-label="Toma a la que aplica este archivo"
        className="mt-1"
        isSearchable={options.length > 6}
      />
    </div>
  );
}

/** @param {string} raw @param {string} abs */
function orderAttachmentKindFromUrls(raw, abs) {
  const r = String(raw || "");
  const a = String(abs || "");
  if (isPdfReceiptUrl(r) || isPdfReceiptUrl(a)) return "pdf";
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(r) || /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(a)) {
    return "image";
  }
  return "other";
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
        ? ` Las tomas quedan reservadas a tu nombre hasta el ${new Date(ctx.holdExpiresAt).toLocaleString("es-VE", {
            dateStyle: "medium",
            timeStyle: "short",
          })} (72 horas).`
        : ctx.holdActive
          ? " Las tomas quedan reservadas a tu nombre durante 72 horas mientras revisamos."
          : "";
    return {
      kind: "waiting",
      nextStep: ctx.holdActive ? "Reserva en revisión" : "Revisión de tu solicitud",
      detail: `Estamos revisando tu solicitud. No necesitas hacer nada más por ahora; te avisaremos cuando haya una resolución.${holdLine}`,
    };
  }
  if (s === "client_approved" && !ctx.hasSignedNegotiation) {
    return {
      kind: "action",
      nextStep: "Subir documentos",
      detail:
        "El equipo ya aprobó tu solicitud. Para que podamos facturar, debes descargar la hoja de negociación, firmarla y subirla aquí; hasta entonces el siguiente paso (facturación) queda en espera de ese archivo.",
    };
  }
  if (s === "client_approved" && ctx.hasSignedNegotiation && !ctx.hasInvoicePdf) {
    return {
      kind: "waiting",
      nextStep: "Facturación",
      detail:
        "En este momento estamos esperando a que el equipo prepare la factura y cargue los documentos, usando ya tu hoja de negociación firmada. Pronto podrás ver la factura aquí.",
    };
  }
  if (s === "paid" && ctx.hasArtAttachments) {
    return {
      kind: "waiting",
      nextStep: "Revisión de los artes",
      detail:
        "En este momento estamos esperando la validación del equipo sobre las piezas gráficas que subiste. Si necesitan ajustes, te contactarán.",
    };
  }
  if (s === "art_approved" && ctx.hasPermitRecorded) {
    return {
      kind: "waiting",
      nextStep: "Permiso y montaje",
      detail:
        "Tu solicitud de permiso ya está registrada. Los siguientes pasos los coordina el equipo del centro comercial; te informarán si necesitan algo más de tu parte.",
    };
  }
  if (s === "permit_pending") {
    return {
      kind: "waiting",
      nextStep: "Permiso ante la alcaldía",
      detail:
        "En este momento el pedido está en trámite de permiso municipal o en revisión interna. Mantente atento a las notificaciones o mensajes del equipo.",
    };
  }
  if (s === "installation") {
    return {
      kind: "waiting",
      nextStep: "Instalación del anuncio",
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
  const [artFile, setArtFile] = useState(null);
  /** Línea del pedido (toma) para el próximo arte; con una sola línea se asigna sola. */
  const [artOrderItemId, setArtOrderItemId] = useState(/** @type {number | null} */ (null));
  const [permitDate, setPermitDate] = useState("");
  const [permitCompany, setPermitCompany] = useState("");
  const [permitNotes, setPermitNotes] = useState("");
  const [permitMunicipalRef, setPermitMunicipalRef] = useState("");
  /** Proveedores de montaje de los centros del pedido (API pedido). */
  const [mountProviders, setMountProviders] = useState(
    /** @type {Array<Record<string, unknown>>} */ ([]),
  );
  const [mountProvidersLoading, setMountProvidersLoading] = useState(false);
  /** Centro donde se da de alta un proveedor nuevo (si el pedido tiene varios centros). */
  const [permitCreateCenterId, setPermitCreateCenterId] = useState(
    /** @type {number | null} */ (null),
  );
  const [staffRows, setStaffRows] = useState([
    { full_name: "", id_number: "" },
  ]);
  const [wantReplaceReceipt, setWantReplaceReceipt] = useState(false);
  const [wantReplaceSignedSheet, setWantReplaceSignedSheet] = useState(false);
  /** Panel «Ver hoja de negociación»: un chip en el resumen despliega descarga + subida de la hoja firmada. */
  const [signedInitialUploadOpen, setSignedInitialUploadOpen] = useState(false);
  /** Facturada con comprobante: «Paso actual» pago solo al pulsar «Cambiar comprobante» en el resumen. */
  const [invoicedPaymentPasoVisible, setInvoicedPaymentPasoVisible] = useState(false);
  const [pendingArtDeleteId, setPendingArtDeleteId] = useState(/** @type {number | null} */ (null));
  /** Lista de artes bajo el paso 4 del resumen (no duplicar «Paso actual» cuando ya hay archivos). */
  const [artsResumenExpanded, setArtsResumenExpanded] = useState(false);
  /** Paso 5 del resumen: solicitud de permiso enviada (vista previa PDF + datos). */
  const [permitResumenExpanded, setPermitResumenExpanded] = useState(false);
  const [artExtraUploadOpen, setArtExtraUploadOpen] = useState(false);
  const [receiptResumenExpanded, setReceiptResumenExpanded] = useState(false);
  const [negotiationSignedResumenExpanded, setNegotiationSignedResumenExpanded] = useState(false);
  const [invoiceResumenExpanded, setInvoiceResumenExpanded] = useState(false);
  const [artsLightbox, setArtsLightbox] = useState({
    open: false,
    items: /** @type {Array<{ src: string; alt?: string; downloadFileName?: string }>} */ ([]),
    initialIndex: 0,
  });
  const [receiptLightbox, setReceiptLightbox] = useState({
    open: false,
    items: /** @type {Array<{ src: string; alt?: string; downloadFileName?: string }>} */ ([]),
    initialIndex: 0,
  });
  const [signedNegotiationLightbox, setSignedNegotiationLightbox] = useState({
    open: false,
    items: /** @type {Array<{ src: string; alt?: string; downloadFileName?: string }>} */ ([]),
    initialIndex: 0,
  });

  /** Solo paso 1 sin firma: abrir una vez el panel de subida por pedido (factura/comprobante/artes no se autoabren si ya hay archivo). */
  const negotiationUploadAutoOpenedRef = useRef(false);

  const hasNegotiationPdf = Boolean(order?.negotiation_sheet_pdf_url);
  const hasMunicipalityPdf = Boolean(order?.municipality_authorization_pdf_url);
  const hasInvoicePdf = Boolean(order?.invoice_pdf_url);
  const signedRawForUi = order?.negotiation_sheet_signed_url
    ? String(order.negotiation_sheet_signed_url)
    : "";
  const signedUrl = signedRawForUi ? mediaAbsoluteUrl(signedRawForUi) : "";
  const signedKindInPanel = signedUrl
    ? orderAttachmentKindFromUrls(signedRawForUi, signedUrl)
    : "other";
  const receiptRawForUi = order?.payment_receipt_url ? String(order.payment_receipt_url) : "";
  const receiptUrl = receiptRawForUi ? mediaAbsoluteUrl(receiptRawForUi) : "";
  const hasReceiptSaved = Boolean(receiptUrl);
  const isReceiptPdfSaved = isPdfReceiptUrl(receiptUrl);
  const receiptKindInPanel = receiptRawForUi
    ? orderAttachmentKindFromUrls(receiptRawForUi, receiptUrl)
    : "other";
  const permit = order?.installation_permit;

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

  const permitCenters = useMemo(() => {
    const m = new Map();
    for (const it of orderLineItems) {
      const cid = it?.shopping_center_id;
      if (cid == null || cid === "") continue;
      const idNum = Number(cid);
      if (!Number.isFinite(idNum)) continue;
      if (m.has(idNum)) continue;
      const name =
        it.shopping_center_name != null && String(it.shopping_center_name).trim()
          ? String(it.shopping_center_name).trim()
          : `Centro ${idNum}`;
      m.set(idNum, { id: idNum, name });
    }
    return [...m.values()];
  }, [orderLineItems]);

  useEffect(() => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (items.length === 1) {
      const onlyId = Number(items[0].id);
      setArtOrderItemId(Number.isFinite(onlyId) ? onlyId : null);
      return;
    }
    setArtOrderItemId((prev) => {
      if (prev == null) return null;
      const ok = items.some((it) => Number(it.id) === prev);
      return ok ? prev : null;
    });
  }, [order?.id, order?.items]);

  useEffect(() => {
    setArtsResumenExpanded(false);
    setPermitResumenExpanded(false);
    setArtExtraUploadOpen(false);
    setReceiptResumenExpanded(false);
    setNegotiationSignedResumenExpanded(false);
    setInvoiceResumenExpanded(false);
    setWantReplaceSignedSheet(false);
    setSignedInitialUploadOpen(false);
    setSignedFile(null);
    setArtsLightbox({ open: false, items: [], initialIndex: 0 });
    setReceiptLightbox({ open: false, items: [], initialIndex: 0 });
    setSignedNegotiationLightbox({ open: false, items: [], initialIndex: 0 });
    setPendingArtDeleteId(null);
    negotiationUploadAutoOpenedRef.current = false;
    setInvoicedPaymentPasoVisible(false);
    setMountProviders([]);
    setMountProvidersLoading(false);
    setPermitCreateCenterId(null);
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
    (status === "client_approved" || status === "invoiced" || status === "paid") &&
    !signedUrl &&
    hasNegotiationPdf;
  const canPayFields = status === "invoiced" || status === "paid";
  const canUploadArt = status === "paid";
  const canPermitForm = status === "art_approved" && !permit;

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

  useEffect(() => {
    if (permitCenters.length === 1) {
      setPermitCreateCenterId(permitCenters[0].id);
      return;
    }
    if (permitCenters.length > 1) {
      setPermitCreateCenterId((prev) => {
        if (prev != null && permitCenters.some((c) => c.id === prev)) return prev;
        return permitCenters[0]?.id ?? null;
      });
    } else {
      setPermitCreateCenterId(null);
    }
  }, [permitCenters]);

  const artAttachments = Array.isArray(order?.art_attachments)
    ? order.art_attachments
    : [];
  const hasArtAttachments = artAttachments.length > 0;
  /** Bloque de listado / subida de artes (visible con pedido «Pagada» o cuando ya hay adjuntos). */
  const showArtAttachmentsSection = canUploadArt || hasArtAttachments;

  const orderArtEntries = useMemo(() => {
    const list = Array.isArray(order?.art_attachments) ? order.art_attachments : [];
    return list.map((a) => {
      const raw = a?.file_url != null ? String(a.file_url) : "";
      const abs = raw ? mediaAbsoluteUrl(raw) : "";
      return {
        id: a.id,
        raw,
        abs,
        label: orderArtEntryLabelFromAttachment(a),
        lineCaption: artLineCaptionFromAttachment(a),
        createdAt: a?.created_at,
        kind: orderAttachmentKindFromUrls(raw, abs),
      };
    });
  }, [order?.art_attachments]);

  const artImageEntries = useMemo(
    () => orderArtEntries.filter((e) => e.kind === "image"),
    [orderArtEntries],
  );

  const artsLightboxItems = useMemo(
    () =>
      artImageEntries
        .map((e) => {
          const src = mediaUrlForUiWithWebp(e.raw);
          if (!src) return null;
          const downloadFileName = /\.[a-z0-9]+$/i.test(e.label) ? e.label : undefined;
          const alt = e.lineCaption ? `${e.label} (${e.lineCaption})` : e.label;
          return { src, alt, downloadFileName };
        })
        .filter(Boolean),
    [artImageEntries],
  );

  const openArtsLightbox = useCallback(
    (initialIndex) => {
      if (!artsLightboxItems.length) return;
      const i = Math.min(Math.max(0, initialIndex), artsLightboxItems.length - 1);
      setArtsLightbox({ open: true, items: artsLightboxItems, initialIndex: i });
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
          downloadFileName: /\.[a-z0-9]+$/i.test(receiptRawForUi.split("/").pop() || "")
            ? String(receiptRawForUi.split("/").pop())
            : undefined,
        },
      ],
      initialIndex: 0,
    });
  }, [receiptRawForUi]);

  const openSignedNegotiationLightbox = useCallback(() => {
    const src = mediaUrlForUiWithWebp(signedRawForUi);
    if (!src) return;
    setSignedNegotiationLightbox({
      open: true,
      items: [{ src, alt: "Hoja de negociación firmada", downloadFileName: undefined }],
      initialIndex: 0,
    });
  }, [signedRawForUi]);

  const fetchNegotiationSignedBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-negotiation-sheet-signed/`, {
      token: accessToken,
    });
  }, [accessToken, id]);

  const fetchInvoiceBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-invoice/`, { token: accessToken });
  }, [accessToken, id]);

  const fetchInstallationPermitRequestBlob = useCallback(async () => {
    return authFetchBlob(`/api/orders/${id}/download-installation-permit-request/`, {
      token: accessToken,
    });
  }, [accessToken, id]);

  const holdActive = orderHoldIsActive(order);
  const holdExpiresAt = order?.hold_expires_at ?? null;

  const clientGuidanceNotice = useMemo(
    () =>
      getClientOrderGuidanceNotice({
        status,
        holdActive,
        holdExpiresAt,
        hasSignedNegotiation: Boolean(signedUrl),
        hasInvoicePdf,
        hasReceiptSaved,
        hasArtAttachments,
        hasPermitRecorded: Boolean(permit),
      }),
    [
      status,
      holdActive,
      holdExpiresAt,
      signedUrl,
      hasInvoicePdf,
      hasReceiptSaved,
      hasArtAttachments,
      permit,
    ],
  );

  /**
   * «Siguiente paso»: solo si el paso no es interactuable ahora (p. ej. ocultar el aviso de subir documentos
   * mientras el panel de hoja de negociación está abierto).
   */
  const showClientGuidanceBanner = useMemo(() => {
    if (!clientGuidanceNotice) return false;
    const n = clientGuidanceNotice;
    if (n.kind === "outcome" || n.kind === "done") return true;
    if (n.kind === "waiting" && status === "submitted") return true;
    if (n.kind === "action" && status === "client_approved" && !signedUrl) {
      return !signedInitialUploadOpen;
    }
    if (
      n.kind === "waiting" &&
      status === "client_approved" &&
      signedUrl &&
      !hasInvoicePdf
    ) {
      return !negotiationSignedResumenExpanded;
    }
    if (n.kind === "waiting" && status === "paid" && hasArtAttachments) {
      return !artsResumenExpanded;
    }
    if (n.kind === "waiting" && status === "invoiced" && hasReceiptSaved) {
      return !receiptResumenExpanded && !invoicedPaymentPasoVisible;
    }
    if (
      n.kind === "waiting" &&
      (status === "art_approved" || status === "permit_pending") &&
      permit
    ) {
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
    permitResumenExpanded,
    receiptResumenExpanded,
    signedInitialUploadOpen,
    signedUrl,
    status,
  ]);

  const showArtsInStepper = canUploadArt || hasArtAttachments;
  const showPermitInStepper = canPermitForm || Boolean(permit);
  const showDocStepper =
    canUploadSigned ||
    signedUrl ||
    hasInvoicePdf ||
    canPayFields ||
    showArtsInStepper ||
    showPermitInStepper;
  /** Solo en «Facturada»: se muestra el formulario de pago. En «Pagada» no (solo resumen de pasos + artes). */
  const showPaymentForm = status === "invoiced";
  /** Sin comprobante: siempre. Con comprobante: solo si el usuario abre desde «Cambiar comprobante» en el resumen. */
  const showInvoicedPaymentPasoActual =
    showPaymentForm && (!hasReceiptSaved || invoicedPaymentPasoVisible);
  /** 1 = subir hoja firmada; 3 = pago y comprobante (solo facturada); 4 = artes (pedido pagado). */
  const activeDocUploadStep = canUploadSigned
    ? 1
    : showInvoicedPaymentPasoActual
      ? 3
      : canUploadArt && !hasArtAttachments
        ? 4
        : canPermitForm && !permit
          ? 5
          : null;
  const step1Complete = Boolean(signedUrl);
  const step2Complete = hasInvoicePdf;
  const step3Complete = hasReceiptSaved;
  const step4Complete = hasArtAttachments;
  const step5Complete = Boolean(permit);

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
  /** Panel del paso abierto (texto «Ocultar…»): mismo criterio visual que los chips de método de pago. */
  const docStepBtnActiveClass =
    "border-[color-mix(in_srgb,var(--mp-primary)_58%,#d4d4d8)] bg-[color-mix(in_srgb,var(--mp-primary)_12%,#fff)] mp-text-brand ring-1 ring-[color-mix(in_srgb,var(--mp-primary)_22%,transparent)]";
  const docStepPendingClass = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[15px] border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-2 text-center text-xs font-semibold text-zinc-400 sm:text-sm`;

  const anyDocPanelExpanded =
    negotiationSignedResumenExpanded ||
    invoiceResumenExpanded ||
    receiptResumenExpanded ||
    artsResumenExpanded ||
    permitResumenExpanded ||
    signedInitialUploadOpen ||
    invoicedPaymentPasoVisible;

  const collapseAllDocPanels = useCallback(() => {
    setNegotiationSignedResumenExpanded(false);
    setInvoiceResumenExpanded(false);
    setReceiptResumenExpanded(false);
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

  const resetStaffRow = useCallback(() => {
    setStaffRows([{ full_name: "", id_number: "" }]);
  }, []);

  const downloadNegotiation = useCallback(async () => {
    if (!id) return;
    setLocalErr("");
    setBusy("negotiation");
    try {
      const blob = await authFetchBlob(
        `/api/orders/${id}/download-negotiation-sheet/`,
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
  }, [accessToken, id, order]);

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

  const uploadSigned = useCallback(async () => {
    if (!id || !signedFile) {
      setLocalErr(
        "Selecciona el archivo de la hoja firmada (JPG, PNG, WebP o PDF, máx. 5 MB).",
      );
      return;
    }
    setLocalErr("");
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
      onOrderUpdated(data);
      setSignedFile(null);
      setWantReplaceSignedSheet(false);
      setSignedInitialUploadOpen(false);
    } catch (e) {
      setLocalErr(
        e instanceof Error ? e.message : "No se pudo subir la hoja firmada.",
      );
    } finally {
      setBusy("");
    }
  }, [accessToken, id, onOrderUpdated, signedFile]);

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

  const uploadArt = useCallback(async () => {
    if (!id || !artFile) {
      setLocalErr("Selecciona un archivo de arte para subir.");
      return;
    }
    const n = orderLineItems.length;
    let targetLineId = n === 1 ? Number(orderLineItems[0]?.id) : artOrderItemId;
    if (
      n > 1 &&
      (targetLineId == null ||
        !orderLineItems.some((it) => Number(it.id) === targetLineId))
    ) {
      setLocalErr("Selecciona la toma a la que pertenece este archivo.");
      return;
    }
    if (n >= 1 && (targetLineId == null || !Number.isFinite(targetLineId))) {
      setLocalErr("No se pudo determinar la línea del pedido para este arte.");
      return;
    }
    setLocalErr("");
    setBusy("art");
    try {
      const fd = new FormData();
      fd.append("file", artFile);
      fd.append("order_item", String(targetLineId));
      const data = await authFetchForm(`/api/orders/${id}/upload-art/`, {
        method: "POST",
        formData: fd,
        token: accessToken,
      });
      onOrderUpdated(data);
      setArtFile(null);
      setArtExtraUploadOpen(false);
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "No se pudo subir el arte.");
    } finally {
      setBusy("");
    }
  }, [accessToken, artFile, artOrderItemId, id, onOrderUpdated, orderLineItems]);

  const confirmDeleteArt = useCallback(async () => {
    if (!id || pendingArtDeleteId == null) return;
    setLocalErr("");
    setBusy(`art-del-${pendingArtDeleteId}`);
    try {
      const data = await authFetch(`/api/orders/${id}/art-attachments/${pendingArtDeleteId}/`, {
        method: "DELETE",
        token: accessToken,
      });
      onOrderUpdated(data);
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "No se pudo eliminar el archivo.");
      throw e;
    } finally {
      setBusy("");
    }
  }, [accessToken, id, onOrderUpdated, pendingArtDeleteId]);

  const createOrderMountingProvider = useCallback(
    async (companyName) => {
      if (!id || !accessToken) return;
      const name = String(companyName ?? "").trim();
      if (!name) return;
      let scId = permitCreateCenterId;
      if (permitCenters.length === 1) scId = permitCenters[0].id;
      if (scId == null || !Number.isFinite(Number(scId))) {
        setLocalErr(
          "No se pudo determinar el centro comercial para registrar la empresa. Contacta al soporte.",
        );
        return;
      }
      setLocalErr("");
      setBusy("mount-prov");
      try {
        const row = await authFetch(`/api/orders/${id}/mounting-providers/`, {
          method: "POST",
          token: accessToken,
          body: { shopping_center: scId, company_name: name },
        });
        if (row && typeof row === "object") {
          setMountProviders((prev) => [...prev, row]);
          setPermitCompany(String(row.company_name ?? name).trim());
        }
      } catch (e) {
        setLocalErr(
          e instanceof Error ? e.message : "No se pudo registrar el proveedor.",
        );
      } finally {
        setBusy("");
      }
    },
    [accessToken, id, permitCenters, permitCreateCenterId],
  );

  const submitPermit = useCallback(async () => {
    if (!id || !permitDate.trim() || !permitCompany.trim()) {
      setLocalErr("Indica la fecha de montaje y la empresa de instalación.");
      return;
    }
    const members = staffRows
      .map((r) => ({
        full_name: String(r.full_name || "").trim(),
        id_number: String(r.id_number || "").trim(),
      }))
      .filter((r) => r.full_name && r.id_number);
    if (!members.length) {
      setLocalErr("Añade al menos una persona con nombre completo y cédula.");
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
      resetStaffRow();
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
    resetStaffRow,
    staffRows,
  ]);

  const showSection = useMemo(() => {
    return (
      clientGuidanceNotice != null ||
      hasNegotiationPdf ||
      hasInvoicePdf ||
      signedUrl ||
      canUploadSigned ||
      canPayFields ||
      canUploadArt ||
      hasArtAttachments ||
      canPermitForm ||
      permit
    );
  }, [
    clientGuidanceNotice,
    canPayFields,
    canPermitForm,
    canUploadArt,
    canUploadSigned,
    hasArtAttachments,
    hasInvoicePdf,
    hasNegotiationPdf,
    permit,
    signedUrl,
  ]);

  if (!showSection) {
    return null;
  }

  const workflowTitleId = sectionTitleId || (id != null ? `order-workflow-${id}` : "order-workflow");

  return (
    <div
      className={`${ROUNDED_CONTROL} border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5`}
      aria-labelledby={workflowTitleId}
    >
      {!sectionTitleId ? (
        <h3 id={workflowTitleId} className="text-sm font-semibold text-zinc-900">
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
            <p className={`${labelClass} mb-0`}>Resumen de pasos</p>
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
                  onClick={() => setNegotiationSignedResumenExpanded((v) => !v)}
                  className={`${docStepBtnClass} ${negotiationSignedResumenExpanded ? docStepBtnActiveClass : ""}`}
                  aria-expanded={negotiationSignedResumenExpanded}
                  aria-controls={id != null ? `negotiation-signed-resumen-${id}` : undefined}
                >
                  <span className="tabular-nums">1.</span>
                  <span>
                    {negotiationSignedResumenExpanded ? "Ocultar hoja firmada" : "Ver hoja firmada"}
                  </span>
                </button>
              ) : hasNegotiationPdf ? (
                canUploadSigned ? (
                  <button
                    type="button"
                    onClick={() => setSignedInitialUploadOpen((v) => !v)}
                    className={`${docStepBtnClass} ${signedInitialUploadOpen ? docStepBtnActiveClass : ""}`}
                    aria-expanded={signedInitialUploadOpen}
                    aria-controls={id != null ? `signed-upload-step-${id}` : undefined}
                    aria-current={activeDocUploadStep === 1 ? "step" : undefined}
                  >
                    <span className="tabular-nums">1.</span>
                    <span>
                      {signedInitialUploadOpen ? "Ocultar hoja de negociación" : "Ver hoja de negociación"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === "negotiation"}
                    onClick={() => downloadNegotiation()}
                    className={docStepBtnClass}
                    aria-current={activeDocUploadStep === 1 ? "step" : undefined}
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
                  <span>Hoja de negociación</span>
                </span>
              )}
            </li>
            {hasMunicipalityPdf ? (
              <li className="min-w-0 shrink-0">
                <button
                  type="button"
                  disabled={busy === "municipality"}
                  onClick={() => downloadMunicipality()}
                  className={docStepBtnClass}
                >
                  <span>
                    {busy === "municipality"
                      ? "Descargando carta…"
                      : "Carta al municipio (PDF)"}
                  </span>
                </button>
              </li>
            ) : null}
            <li className="min-w-0 shrink-0">
              {step2Complete ? (
                <button
                  type="button"
                  onClick={() => setInvoiceResumenExpanded((v) => !v)}
                  className={`${docStepBtnClass} ${invoiceResumenExpanded ? docStepBtnActiveClass : ""}`}
                  aria-expanded={invoiceResumenExpanded}
                  aria-controls={id != null ? `invoice-resumen-${id}` : undefined}
                >
                  <span className="tabular-nums">2.</span>
                  <span>{invoiceResumenExpanded ? "Ocultar factura" : "Ver factura"}</span>
                </button>
              ) : (
                <span className={docStepPendingClass}>
                  <span className="tabular-nums">2.</span>
                  <span>Ver factura (pendiente)</span>
                </span>
              )}
            </li>
            <li className="min-w-0 shrink-0">
              {step3Complete ? (
                <button
                  type="button"
                  onClick={() => setReceiptResumenExpanded((v) => !v)}
                  className={`${docStepBtnClass} ${receiptResumenExpanded ? docStepBtnActiveClass : ""}`}
                  aria-expanded={receiptResumenExpanded}
                  aria-controls={id != null ? `receipt-resumen-${id}` : undefined}
                >
                  <span className="tabular-nums">3.</span>
                  <span>{receiptResumenExpanded ? "Ocultar comprobante" : "Ver comprobante"}</span>
                </button>
              ) : canPayFields && status === "invoiced" ? (
                <span
                  className={docStepPendingClass}
                  aria-current={activeDocUploadStep === 3 ? "step" : undefined}
                >
                  <span className="tabular-nums">3.</span>
                  <span>Adjuntar comprobante</span>
                </span>
              ) : canPayFields && status === "paid" ? (
                <span className={docStepPendingClass}>
                  <span className="tabular-nums">3.</span>
                  <span>Comprobante (opcional)</span>
                </span>
              ) : (
                <span className={docStepPendingClass}>
                  <span className="tabular-nums">3.</span>
                  <span>Comprobante (pendiente)</span>
                </span>
              )}
            </li>
            {showArtsInStepper ? (
              <li className="min-w-0 shrink-0">
                {step4Complete ? (
                  <button
                    type="button"
                    onClick={() => setArtsResumenExpanded((v) => !v)}
                    className={`${docStepBtnClass} ${artsResumenExpanded ? docStepBtnActiveClass : ""}`}
                    aria-expanded={artsResumenExpanded}
                    aria-controls={id != null ? `arts-resumen-${id}` : undefined}
                  >
                    <span className="tabular-nums">4.</span>
                    <span>{artsResumenExpanded ? "Ocultar artes" : "Ver artes adjuntos"}</span>
                  </button>
                ) : canUploadArt ? (
                  <span
                    className={docStepPendingClass}
                    aria-current={activeDocUploadStep === 4 ? "step" : undefined}
                  >
                    <span className="tabular-nums">4.</span>
                    <span>Artes del anuncio (pendiente)</span>
                  </span>
                ) : (
                  <span className={docStepPendingClass}>
                    <span className="tabular-nums">4.</span>
                    <span>Artes (pendiente)</span>
                  </span>
                )}
              </li>
            ) : null}
            {showPermitInStepper ? (
              <li className="min-w-0 shrink-0">
                {step5Complete ? (
                  <button
                    type="button"
                    onClick={() => setPermitResumenExpanded((v) => !v)}
                    className={`${docStepBtnClass} ${permitResumenExpanded ? docStepBtnActiveClass : ""}`}
                    aria-expanded={permitResumenExpanded}
                    aria-controls={id != null ? `permit-resumen-${id}` : undefined}
                  >
                    <span className="tabular-nums">5.</span>
                    <span>
                      {permitResumenExpanded
                        ? "Ocultar solicitud de permiso"
                        : "Ver solicitud de permiso"}
                    </span>
                  </button>
                ) : (
                  <span
                    className={docStepPendingClass}
                    aria-current={activeDocUploadStep === 5 ? "step" : undefined}
                  >
                    <span className="tabular-nums">5.</span>
                    <span>Solicitud de permiso (pendiente)</span>
                  </span>
                )}
              </li>
            ) : null}
          </ol>
        </nav>
        <div className="mt-0 min-w-0">
          {canUploadSigned && !step1Complete && signedInitialUploadOpen && id != null ? (
            <div
              id={`signed-upload-step-${id}`}
              role="region"
              aria-labelledby={`signed-upload-heading-${id}`}
              className={`mt-3 scroll-mt-24 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p id={`signed-upload-heading-${id}`} className={`${labelClass} mb-0`}>
                Paso actual
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">1 · Hoja de negociación firmada</p>
              <p className="mt-1 text-sm text-zinc-600">
                Descarga la hoja de negociación para firmarla después y subirla.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === "negotiation"}
                  onClick={() => downloadNegotiation()}
                  className={`${marketplaceSecondaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                >
                  {busy === "negotiation" ? "Descargando…" : "Descargar hoja de negociación"}
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
                      : "Descargar carta al municipio"}
                  </button>
                ) : null}
              </div>
              <FileDropZoneField
                className="mt-4"
                id={`signed-${id}`}
                label="Subir hoja de negociación firmada"
                value={signedFile}
                onChange={setSignedFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego confirma con el botón de abajo."
                formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                dropZoneAriaLabel="Zona para adjuntar la hoja de negociación firmada"
              />
              <button
                type="button"
                disabled={!signedFile || busy === "signed"}
                onClick={() => uploadSigned()}
                className={`${marketplacePrimaryBtn} mt-3 min-h-10 w-full px-4 py-2 text-sm font-semibold sm:w-auto`}
              >
                {busy === "signed" ? "Subiendo…" : "Subir hoja de negociación firmada"}
              </button>
            </div>
          ) : null}
          {step1Complete && negotiationSignedResumenExpanded && id != null ? (
            <div
              id={`negotiation-signed-resumen-${id}`}
              className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p className={`${labelClass} mb-2`}>Hoja firmada</p>
              <div>
                {signedKindInPanel === "pdf" ? (
                  <PdfPreview
                    {...orderClientPdfPreviewProps}
                    hideTitle
                    title="Hoja firmada"
                    downloadFileName={orderDocFilename(order, "hoja-negociacion-firmada")}
                    disabled={false}
                    emptyHint="No se pudo cargar la vista previa."
                    loadKey={`${id}-signed-resumen-${signedRawForUi}`}
                    onFetchBlob={fetchNegotiationSignedBlob}
                  />
                ) : signedKindInPanel === "image" ? (
                  <div className="flex flex-col items-center sm:items-start">
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
              {(status === "client_approved" || status === "invoiced" || status === "paid") &&
              hasNegotiationPdf &&
              step1Complete ? (
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
                      <FileDropZoneField
                        id={`signed-resumen-replace-${id}`}
                        label="Nueva hoja firmada"
                        value={signedFile}
                        onChange={setSignedFile}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego pulsa «Guardar hoja firmada»."
                        formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                        formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                        dropZoneAriaLabel="Zona para reemplazar la hoja de negociación firmada"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!signedFile || busy === "signed"}
                          onClick={() => uploadSigned()}
                          className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                        >
                          {busy === "signed" ? "Guardando…" : "Guardar hoja firmada"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === "signed"}
                          onClick={() => {
                            setWantReplaceSignedSheet(false);
                            setSignedFile(null);
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
          {step2Complete && invoiceResumenExpanded && id != null ? (
            <div
              id={`invoice-resumen-${id}`}
              className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p className={`${labelClass} mb-2`}>Factura</p>
              <PdfPreview
                {...orderClientPdfPreviewProps}
                hideTitle
                title="Factura"
                downloadFileName={orderDocFilename(order, "factura")}
                disabled={false}
                emptyHint="No se pudo cargar la factura."
                loadKey={`${id}-invoice-resumen-${String(order?.invoice_number ?? "").trim()}`}
                onFetchBlob={fetchInvoiceBlob}
              />
            </div>
          ) : null}
          {step3Complete && receiptResumenExpanded && id != null ? (
            <div
              id={`receipt-resumen-${id}`}
              className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p className={`${labelClass} mb-2`}>Comprobante</p>
              <div>
                {receiptKindInPanel === "pdf" ? (
                  <PdfPreview
                    {...orderClientPdfPreviewProps}
                    hideTitle
                    title="Comprobante"
                    downloadFileName={orderDocFilename(order, "comprobante")}
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
                          {busy === "payment" ? "Guardando…" : "Guardar comprobante"}
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
          {step4Complete && artsResumenExpanded && id != null ? (
            <div
              id={`arts-resumen-${id}`}
              className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p className={`${labelClass} mb-2`}>Artes adjuntos</p>
              {orderArtEntries.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {orderArtEntries.map((e) => {
                    const artDelBusy = busy === `art-del-${e.id}`;
                    const artDeleteLocked = pendingArtDeleteId != null || busy === "art";
                    const deleteBtn = canUploadArt ? (
                      <button
                        type="button"
                        disabled={artDelBusy || artDeleteLocked}
                        onClick={() => setPendingArtDeleteId(e.id)}
                        className="absolute right-1 top-1 z-10 inline-flex size-8 items-center justify-center rounded-md border border-zinc-200/90 bg-white/95 text-red-700 shadow-sm hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/80 disabled:opacity-50"
                        aria-label={`Eliminar ${e.label}`}
                        title="Eliminar"
                      >
                        {artDelBusy ? (
                          <span
                            className="size-3.5 animate-pulse rounded-full bg-red-400/90"
                            aria-hidden
                          />
                        ) : (
                          <IconRowTrash className="!h-4 !w-4 shrink-0 text-red-600" />
                        )}
                      </button>
                    ) : null;
                    const lineMeta = e.lineCaption ? (
                      <p className="text-[10px] font-medium leading-snug text-zinc-600">
                        {e.lineCaption}
                      </p>
                    ) : orderLineItems.length > 1 ? (
                      <p className="text-[10px] leading-snug text-zinc-400">Toma no indicada</p>
                    ) : null;
                    if (e.kind === "image") {
                      const imgIdx = artImageEntries.findIndex((x) => x.id === e.id);
                      return (
                        <div key={e.id} className="flex min-w-0 flex-col gap-1">
                          <div
                            className={`relative aspect-[3/2] w-full min-w-0 overflow-hidden border border-zinc-200/90 bg-zinc-100 shadow-sm ${ROUNDED_PDF_GRID_CARD}`}
                          >
                            {deleteBtn}
                            <button
                              type="button"
                              className={`absolute inset-0 cursor-pointer overflow-hidden rounded-none border-0 bg-transparent p-0 ${squareListImagePreviewButtonRingClass}`}
                              aria-label={`Ver imagen ampliada (${e.label})`}
                              onClick={() => openArtsLightbox(imgIdx >= 0 ? imgIdx : 0)}
                            >
                              <RasterFromApiUrl
                                url={e.raw}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 33vw, 180px"
                                className="pointer-events-none object-cover"
                                {...catalogRasterImgAttrs}
                              />
                            </button>
                          </div>
                          {lineMeta}
                        </div>
                      );
                    }
                    if (e.kind === "pdf") {
                      const blobPath = apiBlobPathFromMediaField(e.raw);
                      const downloadName = /\.pdf$/i.test(e.label)
                        ? e.label
                        : `${String(e.label).replace(/\.[^/.]+$/, "") || `arte-${e.id}`}.pdf`;
                      return (
                        <div key={e.id} className="flex min-w-0 flex-col gap-1">
                          <div className="relative aspect-[3/2] w-full min-h-0 min-w-0">
                            {deleteBtn}
                            <PdfPreview
                              {...orderClientPdfPreviewProps}
                              fillParentCell
                              className="absolute inset-0 min-h-0"
                              title="Arte"
                              hideTitle
                              downloadFileName={downloadName}
                              disabled={!blobPath}
                              emptyHint="No se pudo cargar el PDF."
                              loadKey={`${id}-resumen-art-pdf-${e.id}-${blobPath}`}
                              onFetchBlob={() => authFetchBlob(blobPath, { token: accessToken })}
                            />
                          </div>
                          {lineMeta}
                        </div>
                      );
                    }
                    return (
                      <div key={e.id} className="flex min-w-0 flex-col gap-1">
                        <div
                          className={`relative flex aspect-[3/2] w-full min-w-0 items-center justify-center border border-zinc-200/90 bg-zinc-50/90 ${ROUNDED_PDF_GRID_CARD}`}
                        >
                          {deleteBtn}
                          {e.abs ? (
                            <div className="flex gap-1">
                              <a
                                href={e.abs}
                                download={e.label}
                                className={pdfPreviewCompactIconButtonClass}
                                aria-label={`Descargar archivo (${e.label})`}
                                title="Descargar"
                              >
                                <IcDownload className="h-4 w-4" />
                              </a>
                              <a
                                href={e.abs}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={pdfPreviewCompactIconButtonClass}
                                aria-label={`Abrir archivo (${e.label})`}
                                title="Abrir en pestaña nueva"
                              >
                                <IcExternal className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">URL no disponible</span>
                          )}
                        </div>
                        {lineMeta}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {canUploadArt ? (
                <div className="mt-4 border-t border-zinc-200/80 pt-3">
                  {!artExtraUploadOpen ? (
                    <button
                      type="button"
                      onClick={() => setArtExtraUploadOpen(true)}
                      className={`${marketplaceSecondaryBtn} min-h-9 px-3 py-2 text-xs font-semibold sm:text-sm`}
                    >
                      Subir otro archivo
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <ArtLinePicker
                        lineItems={orderLineItems}
                        value={artOrderItemId}
                        onChange={setArtOrderItemId}
                        idSuffix={id != null ? `extra-${id}` : "extra"}
                        labelClass={labelClass}
                      />
                      <FileDropZoneField
                        id={`art-extra-${id}`}
                        label="Subir otro arte"
                        value={artFile}
                        onChange={setArtFile}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego pulsa «Subir archivo»."
                        formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
                        formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
                        dropZoneAriaLabel="Zona para adjuntar otro arte del anuncio"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            !artFile ||
                            busy === "art" ||
                            (orderLineItems.length > 1 && artOrderItemId == null)
                          }
                          onClick={() => uploadArt()}
                          className={`${marketplacePrimaryBtn} min-h-10 px-4 py-2 text-sm font-semibold`}
                        >
                          {busy === "art" ? "Subiendo…" : "Subir archivo"}
                        </button>
                        <button
                          type="button"
                          disabled={busy === "art"}
                          onClick={() => {
                            setArtExtraUploadOpen(false);
                            setArtFile(null);
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
          {permit && permitResumenExpanded && id != null ? (
            <div
              id={`permit-resumen-${id}`}
              role="region"
              aria-label="Solicitud de permiso de instalación"
              className={`mt-3 border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 ${ROUNDED_CONTROL}`}
            >
              <p className={`${labelClass} mb-2`}>Solicitud de permiso de instalación</p>
              {order?.installation_permit_request_pdf_url ? (
                <div className="mt-3 min-h-0">
                  <PdfPreview
                    {...orderClientPdfPreviewProps}
                    hideTitle
                    title="Solicitud de permiso de instalación"
                    downloadFileName={orderDocFilename(order, "solicitud-permiso-instalacion")}
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
              {clientGuidanceNotice.kind === "done" ? "Proceso completo" : "Siguiente paso"}
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
            {clientGuidanceNotice.kind === "done" ? "Proceso completo" : "Siguiente paso"}
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-tight text-zinc-900">
            {clientGuidanceNotice.nextStep}
          </p>
          <p className="mt-2 text-[13px] font-normal text-zinc-700">
            {clientGuidanceNotice.detail}
          </p>
        </div>
      ) : null}

      {showInvoicedPaymentPasoActual ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="min-w-0">
            <p className={`${labelClass}`}>Paso actual</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              3 · Método de pago y comprobante
            </p>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            {hasReceiptSaved && wantReplaceReceipt
              ? "Sube el archivo nuevo; el comprobante actual sigue visible en el resumen de arriba."
              : "Adjunta aquí el comprobante de pago."}
          </p>
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
                            el paso 3 del resumen.
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
                label="Comprobante (opcional hasta que lo tengas)"
                value={receiptFile}
                onChange={setReceiptFile}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                helperText="Opcional. Si lo adjuntas, JPG, PNG, WebP o PDF · máximo 5 MB. Puedes guardar solo el método de pago."
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
                {busy === "payment"
                  ? "Guardando…"
                  : "Guardar método y comprobante"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {showArtAttachmentsSection && canUploadArt && !hasArtAttachments ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <p className={`${labelClass}`}>Paso actual</p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">Artes del anuncio</p>
          <p className="mt-1 text-sm text-zinc-600">
            Sube aquí los artes que irán en las tomas.
          </p>
          <ArtLinePicker
            lineItems={orderLineItems}
            value={artOrderItemId}
            onChange={setArtOrderItemId}
            idSuffix={id != null ? String(id) : "art"}
            labelClass={labelClass}
          />
          <FileDropZoneField
            className="mt-4"
            id={`art-${id}`}
            label="Subir arte"
            value={artFile}
            onChange={setArtFile}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            helperText="JPG, PNG, WebP o PDF · máximo 5 MB. Luego pulsa «Subir archivo»."
            formatsHint="JPG, PNG, WebP o PDF · máximo 5 MB"
            formatErrorMessage="Formato no permitido. Usa JPG, PNG, WebP o PDF."
            dropZoneAriaLabel="Zona para adjuntar arte del anuncio"
          />
          <button
            type="button"
            disabled={
              !artFile ||
              busy === "art" ||
              (orderLineItems.length > 1 && artOrderItemId == null)
            }
            onClick={() => uploadArt()}
            className={`${marketplacePrimaryBtn} mt-3 min-h-10 px-4 py-2 text-sm font-semibold`}
          >
            {busy === "art" ? "Subiendo…" : "Subir archivo"}
          </button>
        </div>
      ) : null}

      {canPermitForm ? (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <p className="text-sm text-zinc-600">
            Completa los datos de la solicitud de permiso de instalación.
            Incluye al menos una persona de la cuadrilla con cédula.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`perm-date-${id}`}>
                Fecha de montaje
              </label>
              <input
                id={`perm-date-${id}`}
                type="date"
                className={fieldClass}
                value={permitDate}
                onChange={(e) => setPermitDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <span className={labelClass} id={`perm-co-label-${id}`}>
                Empresa de instalación
              </span>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Lista la que cargó el marketplace para los centros de tu pedido. Puedes elegir una
                empresa o añadir una nueva (quedará disponible también para el equipo en el panel
                de administración).
              </p>
              {permitCenters.length > 1 ? (
                <div className="mt-3">
                  <label className={labelClass} htmlFor={`perm-newprov-sc-${id}`}>
                    Centro al que se añade una empresa nueva
                  </label>
                  <AdminSelect
                    id={`perm-newprov-sc-${id}`}
                    options={permitCenters.map((c) => ({ v: c.id, l: c.name }))}
                    value={permitCreateCenterId ?? ""}
                    onChange={(v) => {
                      const n = typeof v === "number" ? v : Number(v);
                      setPermitCreateCenterId(Number.isFinite(n) ? n : null);
                    }}
                    placeholder="Selecciona el centro…"
                    aria-label="Centro comercial para registrar un proveedor nuevo"
                    className="mt-1"
                  />
                </div>
              ) : null}
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
                  onCreate={createOrderMountingProvider}
                  isDisabled={false}
                  isLoading={mountProvidersLoading}
                  isCreating={busy === "mount-prov"}
                  aria-label="Empresa de instalación"
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor={`perm-ref-${id}`}>
                Referencia municipal (opcional)
              </label>
              <input
                id={`perm-ref-${id}`}
                className={fieldClass}
                value={permitMunicipalRef}
                onChange={(e) => setPermitMunicipalRef(e.target.value)}
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
          <p className={`mt-4 ${labelClass}`}>Personal en sitio</p>
          <ul className="mt-2 space-y-3">
            {staffRows.map((row, idx) => {
              const isLast = idx === staffRows.length - 1;
              return (
                <li
                  key={idx}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <label className={labelClass}>Nombre completo</label>
                    <input
                      className={fieldClass}
                      value={row.full_name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStaffRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, full_name: v } : r,
                          ),
                        );
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className={labelClass}>Cédula</label>
                    <input
                      className={fieldClass}
                      value={row.id_number}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStaffRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, id_number: v } : r,
                          ),
                        );
                      }}
                    />
                  </div>
                  <div className="flex shrink-0 items-end gap-2 pb-0.5 sm:pb-[2px]">
                    {staffRows.length > 1 ? (
                      <button
                        type="button"
                        title="Quitar esta persona"
                        aria-label="Quitar esta persona"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-200/90 bg-white text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/80 disabled:opacity-50"
                        onClick={() =>
                          setStaffRows((rows) => rows.filter((_, i) => i !== idx))
                        }
                      >
                        <IconRowTrash className="!h-5 !w-5 text-red-600" />
                      </button>
                    ) : null}
                    {isLast ? (
                      <button
                        type="button"
                        title="Añadir persona"
                        aria-label="Añadir persona"
                        disabled={busy === "permit" || busy === "mount-prov"}
                        onClick={() =>
                          setStaffRows((rows) => [
                            ...rows,
                            { full_name: "", id_number: "" },
                          ])
                        }
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-zinc-400 bg-zinc-100 p-0 text-zinc-900 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mp-primary)_32%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <IconRowPlus className="text-zinc-900" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={busy === "permit" || busy === "mount-prov"}
            onClick={() => submitPermit()}
            className={`${marketplacePrimaryBtn} mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold sm:w-auto`}
          >
            {busy === "permit" ? (
              "Enviando…"
            ) : busy === "mount-prov" ? (
              "Registrando proveedor…"
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
        open={artsLightbox.open}
        onClose={() => setArtsLightbox((s) => ({ ...s, open: false }))}
        items={artsLightbox.items}
        initialIndex={artsLightbox.initialIndex}
        showThumbnails={artsLightbox.items.length > 1}
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
        onClose={() => setSignedNegotiationLightbox((s) => ({ ...s, open: false }))}
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
        labelledById={id != null ? `order-art-delete-${id}` : "order-art-delete"}
        onConfirm={confirmDeleteArt}
      >
        <p>¿Eliminar este archivo? No se puede deshacer.</p>
      </CustomAlert>
    </div>
  );
}
