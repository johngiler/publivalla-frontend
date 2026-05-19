import { redirect } from "next/navigation";

/** Redirige al catálogo con el filtro «Mis favoritos». */
export default function MisFavoritosPage() {
  redirect("/?mine=favorites");
}
