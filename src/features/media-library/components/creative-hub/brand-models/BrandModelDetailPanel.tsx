'use client';

import { useState } from 'react';
import {
  X,
  Trash2,
  Pencil,
  Save,
  Calendar,
  Boxes,
  Code,
} from 'lucide-react';
import { Button, Badge, Skeleton, Input } from '@/components/shared';
import {
  useStyleReferenceDetail,
  useUpdateStyleReference,
  useDeleteStyleReference,
} from '../../../hooks/index';

// ─── Types ──────────────────────────────────────────────────

interface BrandModelDetailPanelProps {
  modelId: string;
  onClose: () => void;
}

// ─── Loading skeleton ───────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="rounded-lg" width="100%" height={200} />
      <div className="space-y-3">
        <Skeleton className="rounded" width="80%" height={14} />
        <Skeleton className="rounded" width="60%" height={12} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="rounded" width="40%" height={10} />
            <Skeleton className="rounded" width="100%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metadata row ───────────────────────────────────────────

function MetadataItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

/** Slide-out detail panel for a selected brand model style reference. */
export function BrandModelDetailPanel({ modelId, onClose }: BrandModelDetailPanelProps) {
  const { data, isLoading } = useStyleReferenceDetail(modelId);
  const updateMutation = useUpdateStyleReference(modelId);
  const deleteMutation = useDeleteStyleReference();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editModelName, setEditModelName] = useState('');
  const [editModelDescription, setEditModelDescription] = useState('');
  const [editStylePrompt, setEditStylePrompt] = useState('');
  const [editNegativePrompt, setEditNegativePrompt] = useState('');

  const model = data as typeof data | undefined;

  const startEditing = () => {
    if (!model) return;
    setEditName(model.name);
    setEditModelName(model.modelName ?? '');
    setEditModelDescription(model.modelDescription ?? '');
    setEditStylePrompt(model.stylePrompt ?? '');
    setEditNegativePrompt(model.negativePrompt ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!editName.trim()) return;

    updateMutation.mutate(
      {
        name: editName.trim(),
        modelName: editModelName.trim() || undefined,
        modelDescription: editModelDescription.trim() || undefined,
        stylePrompt: editStylePrompt.trim() || undefined,
        negativePrompt: editNegativePrompt.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(modelId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const createdDate = model
    ? new Date(model.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0"
        data-testid="brand-model-detail-panel"
      >
        <div className="overflow-y-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {isLoading ? (
                <Skeleton className="rounded" width={180} height={20} />
              ) : (
                model?.name ?? 'Brand Model'
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <DetailSkeleton />
          ) : model ? (
            <>
              {/* Reference images grid */}
              <div className="p-4">
                {model.referenceImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {model.referenceImages.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`${model.name} reference ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg bg-gray-50"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
                    <Boxes className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Metadata / Edit form */}
              <div className="px-4 pb-4 space-y-4 flex-1">
                {isEditing ? (
                  <>
                    <Input
                      label="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />

                    <Input
                      label="Model Name"
                      value={editModelName}
                      onChange={(e) => setEditModelName(e.target.value)}
                    />

                    <div>
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        id="edit-description"
                        rows={2}
                        value={editModelDescription}
                        onChange={(e) => setEditModelDescription(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-style-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Style Prompt
                      </label>
                      <textarea
                        id="edit-style-prompt"
                        rows={3}
                        value={editStylePrompt}
                        onChange={(e) => setEditStylePrompt(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-negative-prompt" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Negative Prompt
                      </label>
                      <textarea
                        id="edit-negative-prompt"
                        rows={2}
                        value={editNegativePrompt}
                        onChange={(e) => setEditNegativePrompt(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {model.modelName && (
                      <MetadataItem label="Model">
                        <Badge variant="teal">{model.modelName}</Badge>
                      </MetadataItem>
                    )}

                    {model.modelDescription && (
                      <MetadataItem label="Description">
                        <p className="text-sm text-gray-700">{model.modelDescription}</p>
                      </MetadataItem>
                    )}

                    {model.stylePrompt && (
                      <MetadataItem label="Style Prompt">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{model.stylePrompt}</p>
                      </MetadataItem>
                    )}

                    {model.negativePrompt && (
                      <MetadataItem label="Negative Prompt">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{model.negativePrompt}</p>
                      </MetadataItem>
                    )}

                    {model.generationParams && Object.keys(model.generationParams).length > 0 && (
                      <MetadataItem label="Generation Parameters">
                        <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                          <Code className="w-3 h-3 inline mr-1 text-gray-400" />
                          {JSON.stringify(model.generationParams, null, 2)}
                        </pre>
                      </MetadataItem>
                    )}

                    <MetadataItem label="Created">
                      <span className="flex items-center gap-1 text-sm text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {createdDate}
                      </span>
                    </MetadataItem>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-gray-200 mt-auto flex-shrink-0 space-y-2">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                    <Button
                      icon={Save}
                      fullWidth
                      onClick={handleSave}
                      disabled={!editName.trim()}
                      isLoading={updateMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      icon={Pencil}
                      fullWidth
                      onClick={startEditing}
                    >
                      Edit
                    </Button>

                    {showDeleteConfirm ? (
                      <div className="flex-1 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={handleDelete}
                          isLoading={deleteMutation.isPending}
                        >
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="danger"
                        icon={Trash2}
                        fullWidth
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
