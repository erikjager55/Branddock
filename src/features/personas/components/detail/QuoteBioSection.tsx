'use client';

import { useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';

interface QuoteBioSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function QuoteBioSection({ persona, isEditing, onUpdate }: QuoteBioSectionProps) {
  const [quoteDraft, setQuoteDraft] = useState(persona.quote ?? '');
  const [bioDraft, setBioDraft] = useState(persona.bio ?? '');

  const hasQuote = !!persona.quote;
  const hasBio = !!persona.bio;

  // Compact empty state
  if (!hasQuote && !hasBio && !isEditing) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-900">Quote & Bio</span>
            <span className="text-xs text-gray-500 ml-2">No quote or bio defined yet</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={Sparkles}>
          Fill with AI
        </Button>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Quote & Bio</h2>
          <p className="text-sm text-gray-500">A voice and narrative for this persona</p>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Quote
            </label>
            <textarea
              value={quoteDraft}
              onChange={(e) => setQuoteDraft(e.target.value)}
              onBlur={() => {
                if (quoteDraft !== (persona.quote ?? '')) {
                  onUpdate({ quote: quoteDraft || null });
                }
              }}
              placeholder="A direct quote that captures this persona's mindset..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Bio
            </label>
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              onBlur={() => {
                if (bioDraft !== (persona.bio ?? '')) {
                  onUpdate({ bio: bioDraft || null });
                }
              }}
              placeholder="A short narrative description (2-3 sentences)..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {persona.quote && (
            <blockquote className="border-l-4 border-emerald-400 pl-4 py-2">
              <p className="text-sm italic text-gray-900">&ldquo;{persona.quote}&rdquo;</p>
            </blockquote>
          )}
          {persona.bio && (
            <p className="text-sm text-gray-600 leading-relaxed">{persona.bio}</p>
          )}
        </div>
      )}
    </section>
  );
}
