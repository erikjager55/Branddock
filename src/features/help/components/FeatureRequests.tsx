'use client';

import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useFeatureRequests, useSubmitFeatureRequest } from '@/hooks/use-help';
import { useHelpStore } from '@/stores/useHelpStore';
import { Button, Modal, Input } from '@/components/shared';
import { FeatureRequestItemCard } from './FeatureRequestItemCard';

export function FeatureRequests() {
  const { data: items } = useFeatureRequests();
  const isModalOpen = useHelpStore((s) => s.isFeatureRequestModalOpen);
  const openModal = useHelpStore((s) => s.openFeatureRequestModal);
  const closeModal = useHelpStore((s) => s.closeFeatureRequestModal);

  const submitRequest = useSubmitFeatureRequest();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;

    submitRequest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          closeModal();
        },
      },
    );
  };

  const topItems = items?.slice(0, 5) ?? [];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Feature Requests</h2>
        <Button variant="primary" size="sm" icon={Lightbulb} onClick={openModal}>
          Request a Feature
        </Button>
      </div>

      {topItems.length > 0 ? (
        <div className="space-y-3">
          {topItems.map((item) => (
            <FeatureRequestItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No feature requests yet.</p>
      )}

      {/* Feature Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Request a Feature"
        subtitle="Tell us what you'd like to see in Branddock"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={submitRequest.isPending}
              disabled={!title.trim()}
            >
              Submit Request
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What feature would you like?"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature in more detail (optional)..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-shadow resize-none"
            />
          </div>
        </div>
      </Modal>
    </section>
  );
}
