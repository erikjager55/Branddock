'use client';

import React, { useState } from 'react';
import { useDeriveDeliverable } from '../../hooks/canvas.hooks';
import { Modal, Button } from '@/components/shared';
import {
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Mail,
  Globe,
  FileText,
  Video,
  AlertCircle,
} from 'lucide-react';

interface DerivePlatformSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: string;
  onDerived: (newDeliverableId: string) => void;
}

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, formats: ['post', 'article', 'carousel'] },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, formats: ['tweet', 'thread'] },
  { id: 'instagram', label: 'Instagram', icon: Instagram, formats: ['post', 'story', 'reel'] },
  { id: 'facebook', label: 'Facebook', icon: Facebook, formats: ['post', 'ad'] },
  { id: 'email', label: 'Email', icon: Mail, formats: ['newsletter', 'campaign'] },
  { id: 'web', label: 'Website', icon: Globe, formats: ['blog-article', 'landing-page'] },
  { id: 'document', label: 'Document', icon: FileText, formats: ['whitepaper', 'one-pager'] },
  { id: 'video', label: 'Video', icon: Video, formats: ['script', 'storyboard'] },
];

/** Modal for selecting target platform/format to derive content for */
export function DerivePlatformSelectorModal({
  isOpen,
  onClose,
  deliverableId,
  onDerived,
}: DerivePlatformSelectorModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const deriveMutation = useDeriveDeliverable(deliverableId);

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform);

  const handleDerive = async () => {
    if (!selectedPlatform || !selectedFormat) return;
    try {
      const result = await deriveMutation.mutateAsync({
        targetPlatform: selectedPlatform,
        targetFormat: selectedFormat,
      });
      onDerived(result.newDeliverableId);
      handleClose();
    } catch {
      // Error displayed inline
    }
  };

  const handleClose = () => {
    setSelectedPlatform(null);
    setSelectedFormat(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Derive for Platform" size="md">
      <div className="space-y-6">
        {/* Platform grid */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Select Platform</h4>
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(p.id);
                    setSelectedFormat(null);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Format selection */}
        {platform && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Select Format</h4>
            <div className="flex flex-wrap gap-2">
              {platform.formats.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedFormat === f
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replaceAll('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error display */}
        {deriveMutation.isError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {deriveMutation.error?.message ?? 'Failed to derive deliverable'}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDerive}
            disabled={!selectedPlatform || !selectedFormat || deriveMutation.isPending}
          >
            {deriveMutation.isPending ? 'Creating...' : 'Create Derivative'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
