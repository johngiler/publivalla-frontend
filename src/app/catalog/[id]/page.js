import { notFound } from "next/navigation";

import SpaceDetailView from "@/views/SpaceDetailView";
import { getSpace } from "@/services/api";

export const dynamic = "force-dynamic";

export default async function CatalogDetailPage({ params }) {
  const { id } = await params;

  let space;
  try {
    space = await getSpace(id);
  } catch {
    notFound();
  }

  if (space.catalog_public !== true) {
    notFound();
  }

  return <SpaceDetailView space={space} />;
}
