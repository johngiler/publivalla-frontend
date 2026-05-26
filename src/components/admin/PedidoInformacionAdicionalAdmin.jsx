"use client";

import {
  AdminDetailInset,
  AdminDetailProse,
  AdminDetailSection,
} from "@/components/admin/AdminAccordionDetail";

function AdminDetailLabeledProse({ label, text, emptyHint }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <AdminDetailProse text={text} emptyHint={emptyHint} />
    </div>
  );
}

/**
 * @param {{ order: Record<string, unknown>; panelId: string }} props
 */
export function PedidoInformacionAdicionalAdmin({ order, panelId }) {
  const instagram = String(order?.instagram_handle || "").trim();
  const instagramDisplay = instagram
    ? `@${instagram.replace(/^@+/, "")}`
    : "";

  return (
    <AdminDetailSection
      panelId={panelId}
      sectionId="reservation-info"
      title="Información adicional"
    >
      <AdminDetailInset className="space-y-4">
        <AdminDetailLabeledProse
          label="Marca a promocionar"
          text={order?.promotion_brand}
          emptyHint="Sin indicar"
        />
        <AdminDetailLabeledProse
          label="Campaña o concepto publicitario"
          text={order?.campaign_concept}
          emptyHint="Sin indicar"
        />
        <AdminDetailLabeledProse
          label="Reseña o descripción de la actividad"
          text={order?.activity_description}
          emptyHint="Sin indicar"
        />
        <AdminDetailLabeledProse
          label="Información complementaria"
          text={order?.complementary_info}
          emptyHint="Sin información complementaria"
        />
        <AdminDetailLabeledProse
          label="Cuenta de Instagram"
          text={instagramDisplay}
          emptyHint="Sin indicar"
        />
      </AdminDetailInset>
    </AdminDetailSection>
  );
}
