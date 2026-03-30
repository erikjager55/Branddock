"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/shared";
import { TYPE_CONFIG, MODEL_TYPE_OPTIONS, TRAINABLE_TYPES } from "../constants/model-constants";
import { useCreateModel } from "../hooks";
import type { ConsistentModelType } from "../types/consistent-model.types";

interface CreateModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ConsistentModelType | null;
  onCreated?: (id: string) => void;
}

/** Modal for creating a new consistent model */
export function CreateModelModal({
  isOpen,
  onClose,
  initialType,
  onCreated,
}: CreateModelModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ConsistentModelType>(initialType ?? "PERSON");
  const [description, setDescription] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelDescription, setModelDescription] = useState("");
  const [generationParams, setGenerationParams] = useState("");
  const createModel = useCreateModel();

  const isTrainable = TRAINABLE_TYPES.has(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let parsedGenParams: unknown | undefined;
    if (!isTrainable && type === "ANIMATION" && generationParams.trim()) {
      try {
        parsedGenParams = JSON.parse(generationParams.trim());
      } catch {
        return; // invalid JSON, don't submit
      }
    }

    const result = await createModel.mutateAsync({
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      ...(!isTrainable && {
        modelName: modelName.trim() || undefined,
        modelDescription: modelDescription.trim() || undefined,
        ...(parsedGenParams !== undefined && { generationParams: parsedGenParams }),
      }),
    });

    setName("");
    setDescription("");
    setModelName("");
    setModelDescription("");
    setGenerationParams("");
    onClose();
    onCreated?.(result.id);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setModelName("");
    setModelDescription("");
    setGenerationParams("");
    setType(initialType ?? "PERSON");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create AI Model" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <Input
          label="Model Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brand Ambassador, Product Line"
          required
        />

        {/* Type selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Model Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MODEL_TYPE_OPTIONS.map((opt) => {
              const config = TYPE_CONFIG[opt.value as ConsistentModelType];
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value as ConsistentModelType)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    isSelected
                      ? `${config.borderColor} ${config.bgColor}`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`text-sm font-medium ${isSelected ? config.color : "text-gray-900"}`}>
                    {config.label}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{config.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will this model be used for?"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Non-trainable extra fields */}
        {!isTrainable && (
          <>
            <Input
              label="Style Guide Name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. Corporate Photography Style"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Style Guide Description
              </label>
              <textarea
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                placeholder="Describe this style guide..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            {type === "ANIMATION" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Generation Parameters <span className="font-normal text-gray-400">(JSON)</span>
                </label>
                <textarea
                  value={generationParams}
                  onChange={(e) => setGenerationParams(e.target.value)}
                  placeholder='{"fps": 24, "duration": 5, "style": "cinematic"}'
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={createModel.isPending}
            disabled={!name.trim()}
          >
            Create Model
          </Button>
        </div>
      </form>
    </Modal>
  );
}
