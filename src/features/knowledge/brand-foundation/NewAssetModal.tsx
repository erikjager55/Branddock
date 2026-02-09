"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { AssetType, AssetStatus } from "@/types/brand-asset";
import { useCreateAsset } from "@/hooks/api/useAssets";
import { useToast } from "@/hooks/useToast";

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function NewAssetModal({
  isOpen,
  onClose,
  workspaceId,
}: NewAssetModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssetType>("MISSION");
  const [status, setStatus] = useState<AssetStatus>("DRAFT");

  const createAsset = useCreateAsset();
  const toast = useToast();

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("MISSION");
    setStatus("DRAFT");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAsset.mutate(
      { name, description, type, status, workspaceId },
      {
        onSuccess: () => {
          toast.success("Asset created", "Your brand asset has been created successfully.");
          resetForm();
          onClose();
        },
        onError: () => {
          toast.error("Failed to create asset", "Please try again.");
        },
      }
    );
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="New Brand Asset">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Name *
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter asset name"
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Description
          </label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
          />
        </div>

        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Type *
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="MISSION">Mission</option>
            <option value="VISION">Vision</option>
            <option value="VALUES">Values</option>
            <option value="POSITIONING">Positioning</option>
            <option value="PROMISE">Promise</option>
            <option value="STORY">Story</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Status *
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus)}
            className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createAsset.isPending}
          >
            {createAsset.isPending ? "Creating..." : "Create Asset"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
