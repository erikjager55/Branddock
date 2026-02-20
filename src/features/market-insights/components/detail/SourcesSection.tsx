'use client';

import { useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { Button, Input } from '@/components/shared';
import type { InsightSourceUrl } from '../../types/market-insight.types';

interface SourcesSectionProps {
  sources: InsightSourceUrl[];
  onAdd: (name: string, url: string) => void;
  onDelete: (sourceId: string) => void;
}

export function SourcesSection({ sources, onAdd, onDelete }: SourcesSectionProps) {
  const safeSources = Array.isArray(sources) ? sources : [];
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    onAdd(name.trim(), url.trim());
    setName('');
    setUrl('');
    setIsAdding(false);
  };

  return (
    <div data-testid="sources-section">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Sources</h3>

      {safeSources.length > 0 ? (
        <div className="space-y-2 mb-3">
          {safeSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">{source.name}</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <button
                onClick={() => onDelete(source.id)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-3">No sources added yet.</p>
      )}

      {isAdding ? (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Source name"
          />
          <Input
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!name.trim() || !url.trim()}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      )}
    </div>
  );
}
