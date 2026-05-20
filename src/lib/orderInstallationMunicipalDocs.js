/**
 * Documentos municipales del paso 4 (permiso emitido + impuesto), en `installation_permit`.
 * @param {Record<string, unknown> | null | undefined} order
 */
export function hasMunicipalInstallationDocuments(order) {
  const p = order?.installation_permit;
  if (p == null || typeof p !== "object") return false;
  const issued = p.municipal_permit_issued_url;
  const tax = p.municipal_tax_payment_receipt_url;
  return (
    typeof issued === "string" &&
    issued.trim() !== "" &&
    typeof tax === "string" &&
    tax.trim() !== ""
  );
}
