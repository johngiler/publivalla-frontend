import {
  orderStatusLabel,
  orderStatusPillClassName,
} from "@/components/admin/adminConstants";

/** Pedido enviado dentro de la ventana de hold (72 h). */
export function orderHoldIsActive(order) {
  if (!order) return false;
  if (order.hold_active === true) return true;
  if (order.hold_active === false) return false;
  if (String(order.status) !== "submitted") return false;
  const exp = order.hold_expires_at;
  if (!exp) return false;
  return new Date(exp).getTime() > Date.now();
}

export function orderDisplayStatusLabel(order) {
  if (orderHoldIsActive(order)) return "Reservado";
  return orderStatusLabel(order?.status, order?.status_label);
}

export function orderDisplayStatusPillClassName(order) {
  if (orderHoldIsActive(order)) {
    return "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80";
  }
  return orderStatusPillClassName(order?.status);
}

export function formatOrderHoldExpiresAt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}
