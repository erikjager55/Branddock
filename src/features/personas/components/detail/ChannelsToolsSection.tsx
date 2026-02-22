'use client';

import { useState } from 'react';
import { Radio, Megaphone, Wrench, Share2, Plus, X } from 'lucide-react';
import { Button } from '@/components/shared';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { ImpactBadge } from './ImpactBadge';

interface ChannelsToolsSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function ChannelsToolsSection({ persona, isEditing, onUpdate }: ChannelsToolsSectionProps) {
  const [channelDraft, setChannelDraft] = useState('');
  const [toolDraft, setToolDraft] = useState('');

  const channels = persona.preferredChannels ?? [];
  const tools = persona.techStack ?? [];

  // Card-like empty state
  if (channels.length === 0 && tools.length === 0 && !isEditing) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 flex flex-col items-center justify-center text-center">
        <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
          <Share2 className="h-5 w-5 text-indigo-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">Channels & Tools</p>
        <p className="text-xs text-gray-500 mb-3">No channels or tools defined yet</p>
        <Button variant="secondary" size="sm" icon={Plus}>
          Add Channels
        </Button>
      </div>
    );
  }

  const handleAddTag = (field: 'preferredChannels' | 'techStack', value: string, setDraft: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = field === 'preferredChannels' ? channels : tools;
    if (current.length >= 20) return;
    onUpdate({ [field]: [...current, trimmed] });
    setDraft('');
  };

  const handleRemoveTag = (field: 'preferredChannels' | 'techStack', index: number) => {
    const current = field === 'preferredChannels' ? channels : tools;
    onUpdate({ [field]: current.filter((_, i) => i !== index) });
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'preferredChannels' | 'techStack', value: string, setDraft: (v: string) => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(field, value, setDraft);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Radio className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Channels & Tools</h2>
            <p className="text-sm text-gray-500">Where to reach this persona and what they use</p>
          </div>
        </div>
        <ImpactBadge impact="high" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Preferred Channels */}
          <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Megaphone className="w-4 h-4 text-indigo-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preferred Channels
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {channels.map((ch, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700"
                >
                  {ch}
                  {isEditing && (
                    <button type="button" onClick={() => handleRemoveTag('preferredChannels', i)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && channels.length < 20 && (
                <input
                  value={channelDraft}
                  onChange={(e) => setChannelDraft(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'preferredChannels', channelDraft, setChannelDraft)}
                  placeholder="Type + Enter"
                  className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-28"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{channels.length} channels</p>
          </div>

          {/* Tech Stack */}
          <div className="bg-slate-50/30 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Wrench className="w-4 h-4 text-slate-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tech Stack & Tools
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tools.map((tool, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                >
                  {tool}
                  {isEditing && (
                    <button type="button" onClick={() => handleRemoveTag('techStack', i)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && tools.length < 20 && (
                <input
                  value={toolDraft}
                  onChange={(e) => setToolDraft(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'techStack', toolDraft, setToolDraft)}
                  placeholder="Type + Enter"
                  className="px-2.5 py-1 text-xs border border-dashed border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-slate-500 focus:border-slate-500 w-28"
                />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{tools.length} tools</p>
          </div>
        </div>

      {/* Counts footer */}
      <div className="border-t border-gray-100 mt-4 pt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Megaphone className="w-3.5 h-3.5 text-gray-400" />
            {channels.length} channels
          </span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-gray-400" />
            {tools.length} tools
          </span>
        </div>
      </div>
    </section>
  );
}
