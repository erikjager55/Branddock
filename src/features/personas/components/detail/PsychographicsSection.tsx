'use client';

import { useState } from 'react';
import { Brain, Heart, Tag, X } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

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
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Brain className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Psychographics</h2>
            <p className="text-sm text-gray-500">Personality, values, and interests</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-5">
        {/* Personality Type — sub-card */}
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Personality Type
            </p>
          </div>
          {isEditing ? (
            <input
              defaultValue={persona.personalityType ?? ''}
              onBlur={(e) => onUpdate({ personalityType: e.target.value })}
              placeholder="e.g. ENTJ - The Commander"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          ) : persona.personalityType ? (
            <span className="inline-block border border-gray-200 rounded-full px-3 py-1 text-sm font-medium text-gray-900">
              {persona.personalityType}
            </span>
          ) : (
            <p className="text-sm text-gray-300 italic">Not set</p>
          )}
        </div>

        {/* Core Values — sub-card */}
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Core Values
            </p>
          </div>
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
                className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-28"
              />
            )}
          </div>
          {persona.coreValues.length === 0 && !isEditing && (
            <p className="text-sm text-gray-300 italic">No core values defined</p>
          )}
        </div>

        {/* Interests & Hobbies — sub-card */}
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Interests &amp; Hobbies
            </p>
          </div>
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
                className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-28"
              />
            )}
          </div>
          {persona.interests.length === 0 && !isEditing && (
            <p className="text-sm text-gray-300 italic">No interests defined</p>
          )}
        </div>
      </div>

      {/* Counts footer with emerald separator and icons */}
      <div className="border-t border-emerald-200 mt-4 pt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-gray-400" />
            {persona.coreValues.length} values
          </span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            {persona.interests.length} interests
          </span>
        </div>
      </div>
    </section>
  );
}
