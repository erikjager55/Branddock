'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Globe, AlignLeft, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, Modal, Card, EmptyState } from '@/components/shared';
import {
  useItemKnowledgeSources,
  useCreateTextSource,
  useCreateUrlSource,
  useUploadFileSource,
  useDeleteKnowledgeSource,
  type ItemKnowledgeSource,
} from '@/hooks/useItemKnowledgeSources';

interface ItemKnowledgeSourcesProps {
  itemType: string;
  itemId: string;
}

type AddTab = 'file' | 'url' | 'text';

const SOURCE_TYPE_ICONS: Record<string, typeof FileText> = {
  file: FileText,
  url: Globe,
  text: AlignLeft,
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  file: 'File',
  url: 'URL',
  text: 'Text',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sidebar card for managing per-item knowledge sources */
export function ItemKnowledgeSources({ itemType, itemId }: ItemKnowledgeSourcesProps) {
  const { t } = useTranslation('shared');
  const { data: sources = [], isLoading } = useItemKnowledgeSources(itemType, itemId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('itemKnowledge.title')}</h3>
          {sources.length > 0 && (
            <Badge variant="default">{sources.length}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('itemKnowledge.add')}
        </Button>
      </div>

      {/* Sources list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('itemKnowledge.emptyTitle')}
          description={t('itemKnowledge.emptyDescription')}
        />
      ) : (
        <SourcesList sources={sources} itemType={itemType} itemId={itemId} />
      )}

      {/* Add Modal */}
      <AddKnowledgeSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemType={itemType}
        itemId={itemId}
      />
    </Card>
  );
}

// ─── Sources List ─────────────────────────────────────────────

function SourcesList({
  sources,
  itemType,
  itemId,
}: {
  sources: ItemKnowledgeSource[];
  itemType: string;
  itemId: string;
}) {
  const { t } = useTranslation('shared');
  const deleteMutation = useDeleteKnowledgeSource(itemType, itemId);

  const handleDelete = (sourceId: string, title: string) => {
    if (!confirm(t('itemKnowledge.deleteConfirm', { title }))) return;
    deleteMutation.mutate(sourceId, {
      onSuccess: () => toast.success(t('itemKnowledge.deleted', { title })),
      onError: () => toast.error(t('itemKnowledge.deleteFailed')),
    });
  };

  return (
    <ul className="space-y-2">
      {sources.map((source) => {
        const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? FileText;
        return (
          <li
            key={source.id}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 group"
          >
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {source.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {t(`itemKnowledge.sourceTypes.${source.sourceType}`, {
                    defaultValue: SOURCE_TYPE_LABELS[source.sourceType],
                  })}
                </span>
                {source.fileSize && (
                  <span>{formatFileSize(source.fileSize)}</span>
                )}
                {!source.isProcessed && (
                  <Badge variant="warning">{t('itemKnowledge.notProcessed')}</Badge>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(source.id, source.title)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Add Modal ────────────────────────────────────────────────

function AddKnowledgeSourceModal({
  isOpen,
  onClose,
  itemType,
  itemId,
}: {
  isOpen: boolean;
  onClose: () => void;
  itemType: string;
  itemId: string;
}) {
  const { t } = useTranslation('shared');
  const [activeTab, setActiveTab] = useState<AddTab>('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const createText = useCreateTextSource(itemType, itemId);
  const createUrl = useCreateUrlSource(itemType, itemId);
  const uploadFile = useUploadFileSource(itemType, itemId);

  const isPending = createText.isPending || createUrl.isPending || uploadFile.isPending;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setUrl('');
    setFile(null);
    setActiveTab('text');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t('itemKnowledge.titleRequired'));
      return;
    }

    const onSuccess = () => {
      toast.success(t('itemKnowledge.added'));
      handleClose();
    };
    const onError = () => toast.error(t('itemKnowledge.addFailed'));

    if (activeTab === 'text') {
      if (!content.trim()) {
        toast.error(t('itemKnowledge.contentRequired'));
        return;
      }
      createText.mutate(
        { title: title.trim(), description: description.trim() || undefined, content: content.trim() },
        { onSuccess, onError },
      );
    } else if (activeTab === 'url') {
      if (!url.trim()) {
        toast.error(t('itemKnowledge.urlRequired'));
        return;
      }
      createUrl.mutate(
        { title: title.trim(), description: description.trim() || undefined, url: url.trim() },
        { onSuccess, onError },
      );
    } else if (activeTab === 'file') {
      if (!file) {
        toast.error(t('itemKnowledge.selectFile'));
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());
      uploadFile.mutate(formData, { onSuccess, onError });
    }
  };

  const tabs: { key: AddTab; label: string; icon: typeof FileText }[] = [
    { key: 'text', label: t('itemKnowledge.sourceTypes.text'), icon: AlignLeft },
    { key: 'url', label: t('itemKnowledge.sourceTypes.url'), icon: Globe },
    { key: 'file', label: t('itemKnowledge.sourceTypes.file'), icon: Upload },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('itemKnowledge.modalTitle')}
      subtitle={t('itemKnowledge.modalSubtitle')}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            {t('itemKnowledge.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isPending}>
            {t('itemKnowledge.add')}
          </Button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        {tabs.map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TabIcon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Shared fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('itemKnowledge.fieldTitle')} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('itemKnowledge.titlePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('itemKnowledge.fieldDescription')}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('itemKnowledge.descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            maxLength={500}
          />
        </div>

        {/* Tab-specific fields */}
        {activeTab === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemKnowledge.fieldContent')} *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('itemKnowledge.contentPlaceholder')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y"
              maxLength={50000}
            />
          </div>
        )}

        {activeTab === 'url' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemKnowledge.fieldUrl')} *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        )}

        {activeTab === 'file' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('itemKnowledge.fieldFile')} *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(file.size)})
                  </span>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-600 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {t('itemKnowledge.clickToSelect')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{t('itemKnowledge.maxSize')}</p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0];
                      if (selected) setFile(selected);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
