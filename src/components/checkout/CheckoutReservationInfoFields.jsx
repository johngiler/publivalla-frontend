"use client";

import { ROUNDED_CONTROL } from "@/lib/uiRounding";

const fieldClass = `mp-form-field-accent mt-1.5 min-h-11 w-full ${ROUNDED_CONTROL} border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 transition-[border-color,box-shadow] duration-200 ease-out focus:outline-none sm:min-h-0 sm:py-2 sm:text-sm`;

const textareaClass = `${fieldClass} min-h-[5.5rem] resize-y py-2.5 sm:min-h-[4.5rem]`;

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

function RequiredMark() {
  return (
    <span className="text-red-600" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/**
 * @param {{
 *   promotionBrand: string;
 *   campaignConcept: string;
 *   activityDescription: string;
 *   complementaryInfo: string;
 *   instagramHandle: string;
 *   onPromotionBrandChange: (value: string) => void;
 *   onCampaignConceptChange: (value: string) => void;
 *   onActivityDescriptionChange: (value: string) => void;
 *   onComplementaryInfoChange: (value: string) => void;
 *   onInstagramHandleChange: (value: string) => void;
 *   idPrefix?: string;
 * }} props
 */
export function CheckoutReservationInfoFields({
  promotionBrand,
  campaignConcept,
  activityDescription,
  complementaryInfo,
  instagramHandle,
  onPromotionBrandChange,
  onCampaignConceptChange,
  onActivityDescriptionChange,
  onComplementaryInfoChange,
  onInstagramHandleChange,
  idPrefix = "checkout-reservation",
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-600">
        Estos datos ayudan al equipo comercial a evaluar tu solicitud antes de
        aprobar la reserva.
      </p>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-brand`}>
          Marca a promocionar
          <RequiredMark />
        </label>
        <input
          id={`${idPrefix}-brand`}
          required
          value={promotionBrand}
          onChange={(e) => onPromotionBrandChange(e.target.value)}
          className={fieldClass}
          autoComplete="organization"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-campaign`}>
          Campaña o concepto publicitario
          <RequiredMark />
        </label>
        <textarea
          id={`${idPrefix}-campaign`}
          required
          rows={3}
          value={campaignConcept}
          onChange={(e) => onCampaignConceptChange(e.target.value)}
          className={textareaClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-activity`}>
          Reseña o descripción de la actividad
          <RequiredMark />
        </label>
        <textarea
          id={`${idPrefix}-activity`}
          required
          rows={3}
          value={activityDescription}
          onChange={(e) => onActivityDescriptionChange(e.target.value)}
          className={textareaClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-complementary`}>
          Información complementaria
        </label>
        <textarea
          id={`${idPrefix}-complementary`}
          rows={3}
          value={complementaryInfo}
          onChange={(e) => onComplementaryInfoChange(e.target.value)}
          className={textareaClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-instagram`}>
          Cuenta de Instagram
        </label>
        <input
          id={`${idPrefix}-instagram`}
          value={instagramHandle}
          onChange={(e) => onInstagramHandleChange(e.target.value)}
          className={fieldClass}
          placeholder="Ej. mi.marca"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export function checkoutReservationInfoReady({
  promotionBrand,
  campaignConcept,
  activityDescription,
}) {
  return (
    Boolean(String(promotionBrand || "").trim()) &&
    Boolean(String(campaignConcept || "").trim()) &&
    Boolean(String(activityDescription || "").trim())
  );
}

export function buildCheckoutReservationInfoPayload({
  promotionBrand,
  campaignConcept,
  activityDescription,
  complementaryInfo,
  instagramHandle,
}) {
  let ig = String(instagramHandle || "").trim();
  if (ig.startsWith("@")) ig = ig.slice(1).trim();
  return {
    promotion_brand: String(promotionBrand || "").trim(),
    campaign_concept: String(campaignConcept || "").trim(),
    activity_description: String(activityDescription || "").trim(),
    complementary_info: String(complementaryInfo || "").trim(),
    instagram_handle: ig,
  };
}
