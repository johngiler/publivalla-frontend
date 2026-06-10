import {
  anySelectableMonthInCalendar,
  catalogAvailabilityYears,
  resolveMonthsOccupiedByYear,
} from "@/lib/spaceCalendar";

/**
 * ¿Admite nuevas reservas en marketplace?
 * Alineado con `ad_space_allows_marketplace_reservation` en el backend.
 * @param {Record<string, unknown> | null | undefined} space
 */
export function spaceAllowsMarketplaceReservation(space) {
  if (space == null) return false;
  if (String(space.availability ?? "") === "blocked") return false;
  if (space.marketplace_reservable === true) return true;
  if (space.marketplace_reservable === false) return false;
  const ref = new Date();
  const years = catalogAvailabilityYears(ref, space);
  const byYear = resolveMonthsOccupiedByYear(space, ref);
  return anySelectableMonthInCalendar(years, byYear, ref);
}
