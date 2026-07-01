'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('knowledge-library');
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
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.titleLabel')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="resource-title-input"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder={t('manual.titlePlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.authorLabel')}</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder={t('manual.authorPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.categoryLabel')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="">{t('manual.selectCategory')}</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.urlLabel')}</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder={t('manual.urlPlaceholder')}
        />
      </div>

      {/* Optional fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.descriptionLabel')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder={t('manual.descriptionPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.difficultyLabel')}</label>
          <select
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          >
            <option value="BEGINNER">{t('manual.difficultyBeginner')}</option>
            <option value="INTERMEDIATE">{t('manual.difficultyIntermediate')}</option>
            <option value="ADVANCED">{t('manual.difficultyAdvanced')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.durationLabel')}</label>
          <input
            type="text"
            value={estimatedDuration}
            onChange={(e) => setEstimatedDuration(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder={t('manual.durationPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.tagsLabel')}</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder={t('manual.tagsPlaceholder')}
        />
      </div>

      <RatingSlider value={rating} onChange={setRating} />

      {/* Type-specific fields */}
      {store.selectedResourceType === 'BOOK' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.isbnLabel')}</label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder={t('manual.isbnPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('manual.pageCountLabel')}</label>
            <input
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder={t('manual.pageCountPlaceholder')}
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
          {t('manual.save')}
        </Button>
      </div>
    </div>
  );
}
