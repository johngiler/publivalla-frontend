import {
  IconAdminBriefcase,
  IconAdminBuilding,
  IconAdminCalendarBlock,
  IconAdminGavel,
  IconAdminChart,
  IconAdminClipboard,
  IconAdminContract,
  IconAdminGrid,
  IconAdminHardHat,
  IconAdminUserPlus,
} from "@/components/admin/adminIcons";

import { ADMIN_NAV_GROUPS, ADMIN_NAV_PATHS } from "@/components/admin/adminNavPaths";

const ICON_BY_SEGMENT = {
  resumen: IconAdminChart,
  centros: IconAdminBuilding,
  "proveedores-montaje": IconAdminHardHat,
  tomas: IconAdminGrid,
  bloqueos: IconAdminCalendarBlock,
  pujas: IconAdminGavel,
  usuarios: IconAdminUserPlus,
  clientes: IconAdminBriefcase,
  contratos: IconAdminContract,
  pedidos: IconAdminClipboard,
};

function withIcons(items) {
  return items.map((n) => ({
    ...n,
    Icon: ICON_BY_SEGMENT[n.segment],
  }));
}

/** Grupos con iconos para el sidebar. */
export const ADMIN_NAV_GROUPED = ADMIN_NAV_GROUPS.map((group) => ({
  ...group,
  items: withIcons(group.items),
}));

/** Lista plana (footer, atajos). */
export const ADMIN_NAV = withIcons(ADMIN_NAV_PATHS);

export {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_PATHS,
  ADMIN_SECTIONS,
  ADMIN_SPACES_LABEL,
} from "@/components/admin/adminNavPaths";
