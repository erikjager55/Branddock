'use client';

import { useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: string;
}

const CATEGORIES = [
  'Market Research',
  'Competition',
  'Target Audience',
  'Strategy',
  'Internal',
  'Other',
];

// ─── API Functions ─────────────────────────────────────────

async function fetchKnowledgeItems(configId: string) {
  const res = await fetch(`/api/admin/exploration-configs/${configId}/knowledge`);
  if (!res.ok) throw new Error('Failed to fetch knowledge items');
  return res.json();
}

async function createKnowledgeItem(configId: string, data: { title: string; content: string; category: string | null }) {
  const res = await fetch(`/api/admin/exploration-configs/${configId}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create knowledge item');
  return res.json();
}

async function updateKnowledgeItem(configId: string, itemId: string, data: { title: string; content: string; category: string | null }) {
  const res = await fetch(`/api/admin/exploration-configs/${configId}/knowledge/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update knowledge item');
  return res.json();
}

async function deleteKnowledgeItem(configId: string, itemId: string) {
  const res = await fetch(`/api/admin/exploration-configs/${configId}/knowledge/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete knowledge item');
  return res.json();
}

// ─── Component ─────────────────────────────────────────────

export function KnowledgeLibrarySection({ configId }: { configId: string }) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const queryKey = ['admin', 'exploration-configs', configId, 'knowledge'];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchKnowledgeItems(configId),
    enabled: isExpanded,
  });

  const createMutation = useMutation({
    mutationFn: (itemData: { title: string; content: string; category: string | null }) =>
      createKnowledgeItem(configId, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsAdding(false);
      toast.success('Knowledge item added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, ...itemData }: { itemId: string; title: string; content: string; category: string | null }) =>
      updateKnowledgeItem(configId, itemId, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingItemId(null);
      toast.success('Knowledge item updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteKnowledgeItem(configId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Knowledge item deleted');
    },
  });

  const items = (data?.items ?? []) as KnowledgeItem[];

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors w-full"
      >
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <BookOpen className="w-3.5 h-3.5" />
        Knowledge Library
        {items.length > 0 && (
          <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && !isAdding && (
            <p className="text-xs text-gray-400 py-2">
              No knowledge items. Add context that the AI will use during exploration.
            </p>
          )}

          {items.map((item) =>
            editingItemId === item.id ? (
              <KnowledgeItemForm
                key={item.id}
                initialData={item}
                onSave={(formData) => updateMutation.mutate({ itemId: item.id, ...formData })}
                onCancel={() => setEditingItemId(null)}
                isSaving={updateMutation.isPending}
              />
            ) : (
              <KnowledgeItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditingItemId(item.id)}
                onDelete={() => {
                  if (confirm('Are you sure you want to delete this knowledge item?')) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              />
            ),
          )}

          {isAdding ? (
            <KnowledgeItemForm
              onSave={(formData) => createMutation.mutate(formData)}
              onCancel={() => setIsAdding(false)}
              isSaving={createMutation.isPending}
            />
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Item Card ───────────────────────────────────

function KnowledgeItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: KnowledgeItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview = item.content.length > 150 ? item.content.slice(0, 150) + '…' : item.content;

  return (
    <div className="bg-gray-50 rounded-lg p-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-gray-800 truncate">{item.title}</h4>
            {item.category && (
              <span className="text-[10px] font-medium text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded flex-shrink-0">
                {item.category}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{preview}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Knowledge Item Form ───────────────────────────────────

function KnowledgeItemForm({
  initialData,
  onSave,
  onCancel,
  isSaving,
}: {
  initialData?: { title: string; content: string; category: string | null };
  onSave: (data: { title: string; content: string; category: string | null }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave({ title: title.trim(), content: content.trim(), category: category || null });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-teal-200 bg-teal-50/30 rounded-lg p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          {initialData ? 'Edit knowledge item' : 'New knowledge item'}
        </span>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-gray-700"
      >
        <option value="">No category</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content — this information will be provided as context to the AI during exploration"
        required
        maxLength={10000}
        rows={4}
        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-y"
      />
      <div className="text-[10px] text-gray-400 text-right">{content.length} / 10.000</div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !title.trim() || !content.trim()}
          className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
