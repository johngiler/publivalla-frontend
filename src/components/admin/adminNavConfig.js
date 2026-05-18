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

import { ADMIN_NAV_PATHS } from "@/components/admin/adminNavPaths";

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

/** segment coincide con la URL bajo /dashboard/… */
export const ADMIN_NAV = ADMIN_NAV_PATHS.map((n) => ({
  ...n,
  Icon: ICON_BY_SEGMENT[n.segment],
}));

export { ADMIN_NAV_PATHS, ADMIN_SECTIONS } from "@/components/admin/adminNavPaths";
