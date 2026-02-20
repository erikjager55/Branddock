'use client';

import { useState } from 'react';
import { Button } from '@/components/shared';
import { useKnowledgeLibraryStore } from '@/stores/useKnowledgeLibraryStore';
import { useCreateResource } from '../../hooks';
import { ResourceTypeSelector } from './ResourceTypeSelector';
import { RatingSlider } from './RatingSlider';
import { RESOURCE_CATEGORIES } from '../../constants/library-constants';
import type { ResourceType, DifficultyLevel } from '../../types/knowledge-library.types';

interface ManualEntryTabProps {
  onClose: () => void;
}

export function ManualEntryTab({ onClose }: ManualEntryTabProps) {
  const store = useKnowledgeLibraryStore();
  const createResource = useCreateResource();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('INTERMEDIATE');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState(0);
  const [isbn, setIsbn] = useState('');
  const [pageCount, setPageCount] = useState('');

  // Pre-fill from imported metadata
  const meta = store.importedMetadata;
  useState(() => {
    if (meta) {
      if (meta.title) setTitle(meta.title);
      if (meta.author) setAuthor(meta.author);
      if (meta.description) setDescription(meta.description);
      store.setSelectedResourceType(meta.detectedType);
    }
  });

  const handleSave = () => {
    if (!title || !author || !category) return;

    createResource.mutateAsync({
      title,
      author,
      category,
      type: store.selectedResourceType,
      url,
      description: description || undefined,
      difficultyLevel,
      estimatedDuration: estimatedDuration || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      rating,
      isbn: isbn || undefined,
      pageCount: pageCount ? parseInt(pageCount, 10) : undefined,
    }).then(() => {
      onClose();
    });
  };

  return (
    <div className="space-y-4">
      <ResourceTypeSelector
        selected={store.selectedResourceType}
        onChange={store.setSelectedResourceType}
      />

      {/* Required fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="resource-title-input"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="Resource title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder="Author name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="">Select category</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="https://..."
        />
      </div>

      {/* Optional fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="Brief description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
          <select
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration</label>
          <input
            type="text"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder="e.g. 2 hours"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="e.g. Brand, Strategy, Research"
        />
      </div>

      <RatingSlider value={rating} onChange={setRating} />

      {/* Type-specific fields */}
      {store.selectedResourceType === 'BOOK' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder="978-..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Count</label>
            <input
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder="240"
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={createResource.isPending}
          className="w-full"
          data-testid="save-resource-button"
        >
          Save Resource
        </Button>
      </div>
    </div>
  );
}
