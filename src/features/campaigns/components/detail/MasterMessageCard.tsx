'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Sparkles, Edit3, Check, X, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/components/shared';
import type { MasterMessage } from '@/types/studio';

interface MasterMessageCardProps {
  campaignId: string;
  masterMessage: MasterMessage | null;
  isLocked?: boolean;
  onGenerate: () => void;
  onUpdate: (message: MasterMessage) => void;
  isGenerating?: boolean;
}

export function MasterMessageCard({
  campaignId,
  masterMessage,
  isLocked = false,
  onGenerate,
  onUpdate,
  isGenerating = false,
}: MasterMessageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<MasterMessage>({
    coreClaim: '',
    proofPoint: '',
    emotionalHook: '',
    primaryCta: '',
  });

  useEffect(() => {
    if (masterMessage) {
      setEditData(masterMessage);
    }
  }, [masterMessage]);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (masterMessage) setEditData(masterMessage);
    setIsEditing(false);
  };

  if (!masterMessage) {
    return (
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Master Message</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Generate a campaign-wide master message to ensure consistency across all deliverables.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
            disabled={isLocked || isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Generate Master Message
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const FIELDS: { key: keyof MasterMessage; label: string; color: string }[] = [
    { key: 'coreClaim', label: 'Core Claim', color: 'text-primary-700' },
    { key: 'proofPoint', label: 'Proof Point', color: 'text-blue-700' },
    { key: 'emotionalHook', label: 'Emotional Hook', color: 'text-purple-700' },
    { key: 'primaryCta', label: 'Primary CTA', color: 'text-amber-700' },
  ];

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-gray-900">Master Message</h3>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && !isLocked && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={onGenerate} disabled={isGenerating}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="primary" size="sm" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {FIELDS.map(({ key, label, color }) => (
            <div key={key}>
              <span className={`text-xs font-medium ${color} uppercase tracking-wide`}>
                {label}
              </span>
              {isEditing ? (
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={2}
                  value={editData[key]}
                  onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                />
              ) : (
                <p className="mt-0.5 text-sm text-gray-700">{masterMessage[key]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
