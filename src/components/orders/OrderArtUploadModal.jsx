"use client";

import { AdminModal } from "@/components/admin/AdminModal";
import { OrderArtUploadFields } from "@/components/orders/OrderArtUploadFields";

/**
 * Subida de artes cuando el pedido tiene más de un código EP distinto.
 *
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   groups: Array<Record<string, unknown>>;
 *   artOrderItemId: number | null;
 *   onArtOrderItemIdChange: (id: number) => void;
 *   artFiles: File[];
 *   onArtFilesChange: (files: File[]) => void;
 *   busy: string;
 *   onStage: () => void;
 *   labelClass: string;
 *   orderId: string | number;
 * }} props
 */
export function OrderArtUploadModal({
  open,
  onClose,
  groups,
  artOrderItemId,
  onArtOrderItemIdChange,
  artFiles,
  onArtFilesChange,
  busy,
  onStage,
  labelClass,
  orderId,
}) {
  const handleClose = () => {
    if (busy === "art") return;
    onClose();
  };

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      canClose={busy !== "art"}
      title="Añadir artes del anuncio"
      subtitle="Selecciona el código de toma y elige los archivos. Se añadirán al paso 2; cuando termines, pulsa «Subir artes» en la ficha del pedido."
      labelledById={`order-art-upload-modal-${orderId}`}
    >
      <OrderArtUploadFields
        groups={groups}
        needsTomaChoice
        artOrderItemId={artOrderItemId}
        onArtOrderItemIdChange={onArtOrderItemIdChange}
        artFiles={artFiles}
        onArtFilesChange={onArtFilesChange}
        idSuffix={`modal-${orderId}`}
        labelClass={labelClass}
        busy={busy}
        onUpload={onStage}
        actionMode="stage"
        onCancel={handleClose}
        showCancel
        dropZoneClassName=""
      />
    </AdminModal>
  );
}
