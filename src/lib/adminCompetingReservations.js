/** Contador de pujas (tomas con ≥2 solicitudes enviadas) para el sidebar admin. */
export const ADMIN_COMPETING_RESERVATIONS_COUNT_PATH =
  "/api/admin/competing-reservations/count/";

/**
 * @param {unknown} key
 * @returns {boolean}
 */
export function isAdminCompetingCountSwrKey(key) {
  return (
    Array.isArray(key) &&
    key[0] === ADMIN_COMPETING_RESERVATIONS_COUNT_PATH
  );
}
