'use client';

import React, { useState, useEffect } from 'react';
import { Eye, Palette, Layers, Camera, Frame } from 'lucide-react';
import { Badge } from '@/components/shared';
import type { DeliverableComponentState } from '@/types/studio';

interface VisualBriefData {
  composition: string;
  colorDirection: string;
  style: string;
  mood: string;
  format: string;
  references: string;
}

const EMPTY_BRIEF: VisualBriefData = {
  composition: '',
  colorDirection: '',
  style: '',
  mood: '',
  format: '',
  references: '',
};

interface VisualBriefEditorProps {
  component: DeliverableComponentState;
  onUpdate: (updates: Partial<DeliverableComponentState>) => void;
}

export function VisualBriefEditor({ component, onUpdate }: VisualBriefEditorProps) {
  const [briefData, setBriefData] = useState<VisualBriefData>(EMPTY_BRIEF);

  useEffect(() => {
    if (component.visualBrief) {
      try {
        const parsed = JSON.parse(component.visualBrief);
        setBriefData({ ...EMPTY_BRIEF, ...parsed });
      } catch {
        setBriefData(EMPTY_BRIEF);
      }
    } else {
      setBriefData(EMPTY_BRIEF);
    }
  }, [component.id, component.visualBrief]);

  const handleFieldChange = (field: keyof VisualBriefData, value: string) => {
    const updated = { ...briefData, [field]: value };
    setBriefData(updated);
    onUpdate({ visualBrief: JSON.stringify(updated) });
  };

  const FIELDS: { key: keyof VisualBriefData; label: string; icon: React.ElementType; placeholder: string; rows: number }[] = [
    { key: 'composition', label: 'Composition', icon: Frame, placeholder: 'Describe the visual layout and arrangement...', rows: 2 },
    { key: 'colorDirection', label: 'Color Direction', icon: Palette, placeholder: 'Color palette, tones, gradients...', rows: 2 },
    { key: 'style', label: 'Visual Style', icon: Layers, placeholder: 'Photography, illustration, 3D, minimalist...', rows: 2 },
    { key: 'mood', label: 'Mood & Atmosphere', icon: Camera, placeholder: 'Energetic, serene, professional, playful...', rows: 2 },
    { key: 'format', label: 'Format & Dimensions', icon: Frame, placeholder: '1080x1080, landscape, portrait...', rows: 1 },
    { key: 'references', label: 'References & Notes', icon: Eye, placeholder: 'Reference images, additional direction...', rows: 2 },
  ];

  const isPending = component.status === 'PENDING';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-900">{component.label}</span>
          <Badge variant="info" size="sm">Visual Brief</Badge>
        </div>
      </div>

      {/* Brief Fields */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isPending ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Eye className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500 mb-1">Visual brief not yet generated</p>
              <p className="text-xs text-gray-400">
                Generate a structured visual brief before creating the image.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {FIELDS.map(({ key, label, icon: Icon, placeholder, rows }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </label>
                <textarea
                  value={briefData[key]}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  rows={rows}
                  placeholder={placeholder}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50"
                  disabled={component.status === 'APPROVED'}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
