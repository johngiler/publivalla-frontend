/**
 * Tipos de elemento del espacio (misma información que el acordeón admin).
 * @param {{ formats?: Array<Record<string, unknown>> }} props
 */
export function SpaceDetailFormatsPanel({ formats }) {
  const rows = (Array.isArray(formats) ? formats : []).filter(
    (f) => f && (f.product_type_name || f.product_type_slug),
  );
  if (rows.length === 0) return null;

  function fmtMeasure(value) {
    if (value == null || String(value).trim() === "") return "—";
    const n = Number(value);
    if (Number.isFinite(n)) return String(n);
    return String(value).trim();
  }

  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Tipos de elemento
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        {rows.length === 1
          ? "Este espacio incluye el siguiente tipo de soporte publicitario."
          : `Este espacio incluye ${rows.length} tipos de soporte publicitario.`}
      </p>

      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2.5">Tipo</th>
              <th className="px-3 py-2.5">Ancho (m)</th>
              <th className="px-3 py-2.5">Alto (m)</th>
              <th className="px-3 py-2.5">Cant.</th>
              <th className="px-3 py-2.5">Ubicación</th>
              <th className="px-3 py-2.5">Doble cara</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f, idx) => (
              <tr
                key={f.id ?? `${f.product_type_slug}-${idx}`}
                className="border-b border-zinc-100 last:border-b-0"
              >
                <td className="px-3 py-2.5 font-medium text-zinc-900">
                  {f.product_type_name || f.product_type_slug || "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-zinc-800">{fmtMeasure(f.width)}</td>
                <td className="px-3 py-2.5 tabular-nums text-zinc-800">{fmtMeasure(f.height)}</td>
                <td className="px-3 py-2.5 tabular-nums text-zinc-800">
                  {f.quantity != null ? f.quantity : "—"}
                </td>
                <td className="max-w-[12rem] px-3 py-2.5 text-zinc-700">{f.location || "—"}</td>
                <td className="px-3 py-2.5 text-zinc-800">{f.double_sided ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-3 sm:hidden">
        {rows.map((f, idx) => (
          <li
            key={f.id ?? `${f.product_type_slug}-${idx}`}
            className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-sm"
          >
            <p className="font-semibold text-zinc-900">
              {f.product_type_name || f.product_type_slug || "—"}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Ancho (m)
                </dt>
                <dd className="tabular-nums text-zinc-800">{fmtMeasure(f.width)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Alto (m)
                </dt>
                <dd className="tabular-nums text-zinc-800">{fmtMeasure(f.height)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Cantidad
                </dt>
                <dd className="tabular-nums text-zinc-800">
                  {f.quantity != null ? f.quantity : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Doble cara
                </dt>
                <dd className="text-zinc-800">{f.double_sided ? "Sí" : "No"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Ubicación
                </dt>
                <dd className="text-zinc-700">{f.location || "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
