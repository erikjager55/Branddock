'use client';

import React, { useState } from 'react';
import { Tag, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/shared';
import { useMediaTags, useCreateMediaTag, useDeleteMediaTag, mediaKeys } from '../../hooks/index';
import { updateMediaTag } from '../../api/media.api';
import { useMediaLibraryStore } from '../../stores/useMediaLibraryStore';
import type { MediaTagWithCount } from '../../types/media.types';

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#0EA5E9', // sky
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
];

/** Full CRUD modal for managing media tags. */
export function TagManagerModal() {
  const isOpen = useMediaLibraryStore((s) => s.isTagManagerModalOpen);
  const setOpen = useMediaLibraryStore((s) => s.setTagManagerModalOpen);

  const { data: tags, isLoading } = useMediaTags();
  const createTag = useCreateMediaTag();
  const deleteTag = useDeleteMediaTag();
  const qc = useQueryClient();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; color?: string } }) =>
      updateMediaTag(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mediaKeys.tags() });
      setEditingId(null);
    },
  });

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createTag.mutate(
      { name: trimmed, color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[0]);
        },
      },
    );
  }

  function startEdit(tag: MediaTagWithCount) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? PRESET_COLORS[0]);
    setDeleteConfirmId(null);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({
      id: editingId,
      body: { name: editName.trim(), color: editColor },
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteTag.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  }

  function handleClose() {
    setOpen(false);
    setEditingId(null);
    setDeleteConfirmId(null);
    setNewName('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Manage Tags"
      subtitle="Create, edit, and delete tags for your media assets"
      size="md"
    >
      <div className="space-y-5">
        {/* Add new tag form */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Add new tag</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Tag name..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              maxLength={40}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createTag.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#0d9488' }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <ColorPicker
            selected={newColor}
            onChange={setNewColor}
          />
        </div>

        <hr className="border-gray-100" />

        {/* Tag list */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Existing tags ({tags?.length ?? 0})
          </label>

          {isLoading ? (
            <div className="space-y-2 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !tags || tags.length === 0 ? (
            <div className="py-6 text-center">
              <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No tags created yet</p>
            </div>
          ) : (
            <ul className="space-y-1 pt-1 max-h-64 overflow-y-auto">
              {tags.map((tag) => (
                <li key={tag.id}>
                  {editingId === tag.id ? (
                    /* Edit mode */
                    <div className="p-2 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          maxLength={40}
                          autoFocus
                        />
                        <button
                          onClick={saveEdit}
                          disabled={!editName.trim() || updateMutation.isPending}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <ColorPicker selected={editColor} onChange={setEditColor} />
                    </div>
                  ) : deleteConfirmId === tag.id ? (
                    /* Delete confirmation */
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700">
                        Delete &ldquo;{tag.name}&rdquo;? ({tag._count.assets} assets)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(tag.id)}
                          disabled={deleteTag.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                          style={{ color: '#374151', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal display */
                    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group/item transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color ?? '#9CA3AF' }}
                        />
                        <span className="text-sm text-gray-900 truncate">{tag.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {tag._count.assets} {tag._count.assets === 1 ? 'asset' : 'assets'}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => startEdit(tag)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label={`Edit ${tag.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tag.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${tag.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Small color picker with preset color circles. */
function ColorPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
            selected === color ? 'ring-2 ring-offset-1 ring-teal-500 scale-110' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {selected === color && <Check className="w-3 h-3 text-white" />}
        </button>
      ))}
    </div>
  );
}
