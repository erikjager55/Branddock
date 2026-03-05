'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, BookOpen, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Badge, EmptyState } from '@/components/shared';

// ─── Types ──────────────────────────────────────────────────

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

// ─── API Functions ──────────────────────────────────────────

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

// ─── Props ──────────────────────────────────────────────────

interface KnowledgeTabProps {
  configId: string | null;
}

// ─── Component ──────────────────────────────────────────────

export function KnowledgeTab({ configId }: KnowledgeTabProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const queryKey = ['admin', 'exploration-configs', configId, 'knowledge'];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchKnowledgeItems(configId!),
    enabled: !!configId,
  });

  const createMutation = useMutation({
    mutationFn: (itemData: { title: string; content: string; category: string | null }) =>
      createKnowledgeItem(configId!, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsAdding(false);
      toast.success('Kennisbron toegevoegd');
    },
    onError: () => toast.error('Kennisbron toevoegen mislukt'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, ...itemData }: { itemId: string; title: string; content: string; category: string | null }) =>
      updateKnowledgeItem(configId!, itemId, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingItemId(null);
      toast.success('Kennisbron bijgewerkt');
    },
    onError: () => toast.error('Kennisbron bijwerken mislukt'),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteKnowledgeItem(configId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Kennisbron verwijderd');
    },
    onError: () => toast.error('Kennisbron verwijderen mislukt'),
  });

  const items = (data?.items ?? []) as KnowledgeItem[];

  // Not yet saved — show message
  if (!configId) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Kennisbronnen</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Kennisbronnen worden als extra context aan de AI meegegeven tijdens exploration sessies.
          </p>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <Info className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Sla de configuratie eerst op</p>
          <p className="text-xs text-gray-400 mt-1">
            Je kunt kennisbronnen toevoegen nadat de configuratie is opgeslagen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Kennisbronnen ({items.length})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Deze kennisbronnen worden automatisch als context meegegeven aan de AI tijdens
            exploration sessies. Ze worden geïnjecteerd via de <code className="text-[10px] font-mono bg-gray-100 px-1 py-0.5 rounded">{'{{customKnowledge}}'}</code> variabele in je prompts.
          </p>
        </div>
        {!isAdding && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsAdding(true)}>
            Toevoegen
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && !isAdding && (
        <EmptyState
          icon={BookOpen}
          title="Nog geen kennisbronnen"
          description="Voeg context toe die de AI als extra informatie gebruikt tijdens exploration sessies van dit type."
          action={{
            label: 'Eerste kennisbron toevoegen',
            onClick: () => setIsAdding(true),
          }}
        />
      )}

      {/* Add form */}
      {isAdding && (
        <KnowledgeItemForm
          onSave={(formData) => createMutation.mutate(formData)}
          onCancel={() => setIsAdding(false)}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Items table */}
      {!isLoading && items.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Titel</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-32">Categorie</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Preview</th>
                <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-20">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) =>
                editingItemId === item.id ? (
                  <tr key={item.id}>
                    <td colSpan={4} className="p-3">
                      <KnowledgeItemForm
                        initialData={item}
                        onSave={(formData) => updateMutation.mutate({ itemId: item.id, ...formData })}
                        onCancel={() => setEditingItemId(null)}
                        isSaving={updateMutation.isPending}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="group hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{item.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <Badge variant="default" size="sm">{item.category}</Badge>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-500 truncate max-w-[300px]">
                        {item.content}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingItemId(item.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                          title="Bewerken"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Weet je zeker dat je deze kennisbron wilt verwijderen?')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Item Form ────────────────────────────────────

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
    <form onSubmit={handleSubmit} className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {initialData ? 'Kennisbron bewerken' : 'Nieuwe kennisbron'}
        </span>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_200px] gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bijv. Marktonderzoek Q1 2026"
            required
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Categorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Geen categorie</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="De informatie die als context aan de AI wordt meegegeven..."
          required
          maxLength={10000}
          rows={8}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-y"
        />
        <div className="text-[10px] text-gray-400 text-right mt-1">{content.length} / 10.000</div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={onCancel} type="button">
          Annuleren
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="submit"
          disabled={isSaving || !title.trim() || !content.trim()}
          isLoading={isSaving}
        >
          Opslaan
        </Button>
      </div>
    </form>
  );
}
