"use client";

import { Trash2 } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useDeleteAsset } from "../hooks/useBrandAssetDetail";

interface DeleteAssetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  onDeleted?: () => void;
}

export function DeleteAssetDialog({
  isOpen,
  onClose,
  assetId,
  assetName,
  onDeleted,
}: DeleteAssetDialogProps) {
  const deleteAsset = useDeleteAsset(assetId);

  const handleDelete = () => {
    deleteAsset.mutate(undefined, {
      onSuccess: () => {
        onClose();
        onDeleted?.();
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Brand Asset"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            onClick={handleDelete}
            isLoading={deleteAsset.isPending}
          >
            Delete Asset
          </Button>
        </div>
      }
    >
      <p className="text-gray-600">
        Are you sure you want to delete{" "}
        <span className="font-medium text-gray-900">{assetName}</span>? This
        will permanently remove all versions, research methods, and AI analysis
        sessions. This action cannot be undone.
      </p>
    </Modal>
  );
}
