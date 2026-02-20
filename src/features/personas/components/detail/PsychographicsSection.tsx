'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';

interface PsychographicsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function PsychographicsSection({ persona, isEditing, onUpdate }: PsychographicsSectionProps) {
  const [valueDraft, setValueDraft] = useState('');
  const [interestDraft, setInterestDraft] = useState('');

  const handleAddTag = (field: 'coreValues' | 'interests', value: string, setDraft: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = persona[field];
    if (current.length >= 10) return;
    onUpdate({ [field]: [...current, trimmed] });
    setDraft('');
  };

  const handleRemoveTag = (field: 'coreValues' | 'interests', index: number) => {
    onUpdate({ [field]: persona[field].filter((_, i) => i !== index) });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'coreValues' | 'interests', value: string, setDraft: (v: string) => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(field, value, setDraft);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">Psychographics</h2>
        <ImpactBadge impact="high" />
      </div>

      <div className="space-y-5">
        {/* Personality Type */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Personality Type
          </p>
          {isEditing ? (
            <input
              defaultValue={persona.personalityType ?? ''}
              onBlur={(e) => onUpdate({ personalityType: e.target.value })}
              placeholder="e.g. ENTJ - The Commander"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          ) : persona.personalityType ? (
            <div className="inline-block border border-gray-200 rounded-lg px-4 py-2">
              <p className="text-sm font-semibold text-gray-900">{persona.personalityType}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-300 italic">Not set</p>
          )}
        </div>

        {/* Core Values */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Core Values
          </p>
          <div className="flex flex-wrap gap-1.5">
            {persona.coreValues.map((val, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"
              >
                {val}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag('coreValues', i)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {isEditing && persona.coreValues.length < 10 && (
              <input
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'coreValues', valueDraft, setValueDraft)}
                placeholder="Type + Enter"
                className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-28"
              />
            )}
          </div>
          {persona.coreValues.length === 0 && !isEditing && (
            <p className="text-sm text-gray-300 italic">No core values defined</p>
          )}
        </div>

        {/* Interests */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Interests
          </p>
          <div className="flex flex-wrap gap-1.5">
            {persona.interests.map((val, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
              >
                {val}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag('interests', i)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {isEditing && persona.interests.length < 10 && (
              <input
                value={interestDraft}
                onChange={(e) => setInterestDraft(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'interests', interestDraft, setInterestDraft)}
                placeholder="Type + Enter"
                className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-28"
              />
            )}
          </div>
          {persona.interests.length === 0 && !isEditing && (
            <p className="text-sm text-gray-300 italic">No interests defined</p>
          )}
        </div>
      </div>
    </section>
  );
}
