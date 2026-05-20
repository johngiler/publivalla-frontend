import { ORDER_STATUS } from "@/components/admin/adminConstants";
import { hasMunicipalInstallationDocuments } from "@/lib/orderInstallationMunicipalDocs";

/**
 * Flujo que el admin avanza paso a paso. «Vencida» no entra aquí: la pone el sistema
 * cuando vence la vigencia (`expire_active_orders` / `expire_active_orders_after_contract_end`).
 */
export const ORDER_HAPPY_PATH_ADMIN = [
  "draft",
  "submitted",
  "client_approved",
  "art_approved",
  "invoiced",
  "paid",
  "permit_pending",
  "installation",
  "active",
];

const TERMINAL = new Set(["cancelled", "expired"]);

/** Verbo de la acción (infinitivo) para el botón «acción?» en el listado admin. */
const ORDER_ADMIN_TRANSITION_ACTION = {
  submitted: "Enviar",
  client_approved: "Aprobar solicitud",
  invoiced: "Facturar",
  paid: "Confirmar pago",
  art_approved: "Aprobar arte",
  permit_pending: "Solicitar permiso",
  installation: "Iniciar instalación",
  active: "Activar",
  cancelled: "Rechazar",
};

/**
 * Texto del botón de transición: solo la acción con signo de interrogación.
 * @param {string} targetStatus Valor API del estado destino (`ORDER_STATUS`).
 */
export function formatOrderAdminTransitionButtonLabel(targetStatus) {
  const v = String(targetStatus ?? "");
  const action = ORDER_ADMIN_TRANSITION_ACTION[v];
  if (action) return `${action}?`;
  const meta = ORDER_STATUS.find((x) => String(x.v) === v);
  const stateLabel = meta?.l ?? v;
  return `${stateLabel}?`;
}

function happyIndex(status) {
  const s = String(status ?? "");
  return ORDER_HAPPY_PATH_ADMIN.indexOf(s);
}

function hasNegotiationSheetSigned(order) {
  const u = order?.negotiation_sheet_signed_url;
  return typeof u === "string" && u.trim() !== "";
}

function hasPaymentReceipt(order) {
  const u = order?.payment_receipt_url;
  return typeof u === "string" && u.trim() !== "";
}

function hasArtAttachments(order) {
  const a = order?.art_attachments;
  return Array.isArray(a) && a.length > 0;
}

/** Solicitud de permiso de instalación enviada por el cliente (OneToOne en API). */
function hasInstallationPermit(order) {
  const p = order?.installation_permit;
  return p != null && typeof p === "object";
}

/**
 * Opciones del select de estado (misma forma que `ORDER_STATUS`) con
 * `disabled` y `disabledReason` para guiar al admin sin saltar pasos.
 */
export function buildOrderAdminStatusSelectOptions(order) {
  const current = String(order?.status ?? "");
  const curIdx = happyIndex(current);

  return ORDER_STATUS.map((opt) => {
    const v = String(opt.v);

    if (v === current) {
      return { ...opt, disabled: false, disabledReason: "" };
    }

    if (v === "draft") {
      return { ...opt, disabled: false, disabledReason: "" };
    }

    if (TERMINAL.has(current)) {
      return {
        ...opt,
        disabled: true,
        disabledReason: "Este pedido ya está en un estado final.",
      };
    }

    if (v === "cancelled") {
      return { ...opt, disabled: false, disabledReason: "" };
    }

    if (v === "expired" && current !== "expired") {
      return {
        ...opt,
        disabled: true,
        disabledReason:
          "La vencida la asigna el sistema cuando la última línea supera su fecha de fin (tarea programada).",
      };
    }

    const targetIdx = happyIndex(v);
    if (targetIdx < 0) {
      return {
        ...opt,
        disabled: true,
        disabledReason: "Transición no disponible.",
      };
    }

    if (curIdx < 0) {
      return {
        ...opt,
        disabled: true,
        disabledReason: "Estado actual fuera del flujo principal.",
      };
    }

    if (targetIdx < curIdx) {
      return {
        ...opt,
        disabled: true,
        disabledReason: "No puedes retroceder en el flujo desde este listado.",
      };
    }

    if (targetIdx > curIdx + 1) {
      return {
        ...opt,
        disabled: true,
        disabledReason: "Avanza un solo paso a la vez en el flujo principal.",
      };
    }

    if (targetIdx === curIdx + 1) {
      if (
        v === "art_approved" &&
        current === "client_approved" &&
        !hasNegotiationSheetSigned(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Falta la hoja de negociación firmada por la empresa (revisa el detalle del pedido).",
        };
      }
      if (
        v === "art_approved" &&
        current === "client_approved" &&
        !hasArtAttachments(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Falta al menos un archivo de arte de la empresa (Mis pedidos o detalle del pedido).",
        };
      }
      if (
        v === "invoiced" &&
        current === "art_approved" &&
        !hasNegotiationSheetSigned(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Falta la hoja de negociación firmada por la empresa (revisa el detalle del pedido).",
        };
      }
      if (
        v === "invoiced" &&
        current === "art_approved" &&
        !hasArtAttachments(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Faltan archivos de arte en el pedido.",
        };
      }
      if (
        v === "paid" &&
        current === "invoiced" &&
        !hasPaymentReceipt(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Falta el comprobante de pago de la empresa (Mis pedidos o detalle del pedido).",
        };
      }
      if (
        v === "permit_pending" &&
        current === "paid" &&
        !hasInstallationPermit(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Falta la solicitud de permiso de instalación de la empresa (Mis pedidos o detalle del pedido).",
        };
      }
      if (
        v === "installation" &&
        current === "permit_pending" &&
        !hasMunicipalInstallationDocuments(order)
      ) {
        return {
          ...opt,
          disabled: true,
          disabledReason:
            "Faltan el permiso emitido por la alcaldía y el comprobante del impuesto municipal (Mis pedidos o detalle del pedido).",
        };
      }
      return { ...opt, disabled: false, disabledReason: "" };
    }

    return {
      ...opt,
      disabled: true,
      disabledReason: "Transición no disponible.",
    };
  });
}

/**
 * Siguiente paso del flujo principal, si aplica, y bloqueo por requisitos (p. ej. firma).
 * @returns {{ status: string, label: string, blockedReason: string } | null}
 */
/** Botón explícito de rechazo en listado admin (pedido ya en contrato activo). */
export function orderAdminShowRejectPedidoActivoButton(order) {
  return String(order?.status ?? "") === "active";
}

export function getOrderAdminQuickNext(order) {
  const current = String(order?.status ?? "");
  if (TERMINAL.has(current)) return null;

  const curIdx = happyIndex(current);
  if (curIdx < 0 || curIdx >= ORDER_HAPPY_PATH_ADMIN.length - 1) return null;

  const nextStatus = ORDER_HAPPY_PATH_ADMIN[curIdx + 1];
  const meta = ORDER_STATUS.find((x) => String(x.v) === nextStatus);
  const label = meta?.l ?? nextStatus;

  if (
    nextStatus === "art_approved" &&
    current === "client_approved" &&
    !hasNegotiationSheetSigned(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes aprobar artes sin la hoja firmada. La empresa debe subirla desde Mis pedidos.",
    };
  }

  if (
    nextStatus === "art_approved" &&
    current === "client_approved" &&
    !hasArtAttachments(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes aprobar artes sin archivos. La empresa debe subirlos desde Mis pedidos.",
    };
  }

  if (
    nextStatus === "invoiced" &&
    current === "art_approved" &&
    !hasNegotiationSheetSigned(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes facturar sin la hoja firmada. La empresa debe subirla desde Mis pedidos.",
    };
  }

  if (
    nextStatus === "invoiced" &&
    current === "art_approved" &&
    !hasArtAttachments(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason: "No puedes facturar sin archivos de arte en el pedido.",
    };
  }

  if (
    nextStatus === "paid" &&
    current === "invoiced" &&
    !hasPaymentReceipt(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes pasar a «Pagada» sin comprobante. La empresa debe adjuntarlo desde Mis pedidos.",
    };
  }

  if (
    nextStatus === "permit_pending" &&
    current === "paid" &&
    !hasInstallationPermit(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes pasar a «Permiso alcaldía» sin solicitud de permiso. La empresa debe enviarla desde Mis pedidos.",
    };
  }

  if (
    nextStatus === "installation" &&
    current === "permit_pending" &&
    !hasMunicipalInstallationDocuments(order)
  ) {
    return {
      status: nextStatus,
      label,
      blockedReason:
        "No puedes iniciar instalación sin el permiso de la alcaldía y el comprobante del impuesto municipal. La empresa debe subirlos desde Mis pedidos.",
    };
  }

  return { status: nextStatus, label, blockedReason: "" };
}
