/** Normaliza texto para búsqueda insensible a mayúsculas y tildes. */
export function normalizeAdminSearch(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function qNorm(q) {
  return normalizeAdminSearch(q);
}

function matchesQ(blob, q) {
  const n = qNorm(q);
  if (!n) return true;
  return normalizeAdminSearch(blob).includes(n);
}

export function filterCenters(rows, { q, active }) {
  return rows.filter((c) => {
    if (active === "active" && c.is_active === false) return false;
    if (active === "inactive" && c.is_active !== false) return false;
    if (!qNorm(q)) return true;
    const blob = [c.code, c.name, c.city, c.district, c.address].map((x) => String(x ?? "")).join(" ");
    return matchesQ(blob, q);
  });
}

export function filterSpaces(rows, { q, status }) {
  return rows.filter((s) => {
    if (status !== "all" && String(s.status) !== status) return false;
    if (!qNorm(q)) return true;
    const blob = [s.code, s.title, s.shopping_center_name, s.shopping_center_slug]
      .map((x) => String(x ?? ""))
      .join(" ");
    return matchesQ(blob, q);
  });
}

export function filterUsers(rows, { q, role }) {
  return rows.filter((u) => {
    if (role !== "all" && String(u.role) !== role) return false;
    if (!qNorm(q)) return true;
    const blob = [u.username, u.email, u.client_company_name].map((x) => String(x ?? "")).join(" ");
    return matchesQ(blob, q);
  });
}

export function filterClients(rows, { q, status }) {
  return rows.filter((c) => {
    if (status !== "all" && String(c.status) !== status) return false;
    if (!qNorm(q)) return true;
    const linked =
      Array.isArray(c.linked_usernames) && c.linked_usernames.length > 0
        ? c.linked_usernames.join(" ")
        : "";
    const blob = [
      c.company_name,
      c.rif,
      c.email,
      c.contact_name,
      c.representative_name,
      c.representative_id_number,
      linked,
    ]
      .map((x) => String(x ?? ""))
      .join(" ");
    return matchesQ(blob, q);
  });
}

export function filterOrders(rows, { q, status }) {
  return rows.filter((o) => {
    if (status !== "all" && String(o.status) !== status) return false;
    if (!qNorm(q)) return true;
    const blob = [String(o.id), o.client_company_name, String(o.client ?? "")]
      .map((x) => String(x ?? ""))
      .join(" ");
    return matchesQ(blob, q);
  });
}
