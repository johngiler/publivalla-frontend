/** Ficha de empresa: representante legal completo para documentos del pedido. */
export function companyRepresentativeComplete(company) {
  if (company == null || typeof company !== "object") return false;
  return Boolean(
    String(company.representative_name || "").trim() &&
      String(company.representative_id_number || "").trim(),
  );
}
