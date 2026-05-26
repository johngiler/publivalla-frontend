import { isPdfReceiptUrl } from "@/lib/orderPaymentMethods";
import { mediaAbsoluteUrl } from "@/services/authApi";

/** @param {Record<string, unknown>} a */
export function orderArtAttachmentLabel(a) {
  const fileField = a?.file != null ? String(a.file) : "";
  if (fileField && fileField.includes("/")) {
    return fileField.split("/").filter(Boolean).pop() || `arte-${a.id}`;
  }
  return `Arte #${a.id}`;
}

/** @param {string} raw @param {string} abs */
export function orderArtAttachmentKind(raw, abs) {
  const r = String(raw || "");
  const a = String(abs || "");
  if (isPdfReceiptUrl(r) || isPdfReceiptUrl(a)) return "pdf";
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(r) || /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(a)) {
    return "image";
  }
  return "other";
}

/**
 * @param {Record<string, unknown> | null | undefined} order
 * @returns {Array<{
 *   id: unknown;
 *   raw: string;
 *   abs: string;
 *   label: string;
 *   spaceCode: string;
 *   orderItemPk: number | null;
 *   createdAt: unknown;
 *   kind: string;
 * }>}
 */
export function buildOrderArtAdminEntries(order) {
  const list = Array.isArray(order?.art_attachments) ? order.art_attachments : [];
  return list.map((a) => {
    const raw = a?.file_url != null ? String(a.file_url) : "";
    const abs = raw ? mediaAbsoluteUrl(raw) : "";
    return {
      id: a.id,
      raw,
      abs,
      label: orderArtAttachmentLabel(a),
      spaceCode: a?.order_item_code != null ? String(a.order_item_code).trim() : "",
      orderItemPk:
        a?.order_item != null && a.order_item !== "" ? Number(a.order_item) : null,
      createdAt: a?.created_at,
      kind: orderArtAttachmentKind(raw, abs),
    };
  });
}
