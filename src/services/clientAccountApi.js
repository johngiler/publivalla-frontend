import { authFetch } from "@/services/authApi";

export const MY_CONTRACTS_PATH = "/api/me/contracts/";
export const MY_FAVORITES_PATH = "/api/me/favorites/";

/** @param {string} [phase]
 *  @param {string} [paymentPlanPending] — `pending` para planes con cuotas sin pagar.
 */
export function contractsPath(phase = "all", paymentPlanPending = "all") {
  const p = new URLSearchParams();
  if (phase && phase !== "all") p.set("phase", phase);
  if (paymentPlanPending === "pending") p.set("payment_plan_pending", "pending");
  const q = p.toString();
  return q ? `${MY_CONTRACTS_PATH}?${q}` : MY_CONTRACTS_PATH;
}

/**
 * @param {{ phase?: string, paymentPlanPending?: string, token?: string | null }} opts
 */
export async function fetchMyContracts({ phase = "all", paymentPlanPending = "all", token } = {}) {
  return authFetch(contractsPath(phase, paymentPlanPending), { token });
}

/**
 * @param {{ ad_space: number, token?: string | null }} opts
 */
export async function postFavorite({ ad_space, token }) {
  return authFetch(MY_FAVORITES_PATH, {
    method: "POST",
    body: { ad_space },
    token,
  });
}

/**
 * @param {{ adSpaceId: number, token?: string | null }} opts
 */
export async function deleteFavorite({ adSpaceId, token }) {
  return authFetch(`${MY_FAVORITES_PATH}${adSpaceId}/`, { method: "DELETE", token });
}
