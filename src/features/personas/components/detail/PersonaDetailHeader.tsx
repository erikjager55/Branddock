'use client';

import { User, MapPin, Briefcase, RefreshCw, Camera, Pencil, MessageCircle, HelpCircle } from 'lucide-react';
import { OptimizedImage, Button } from '@/components/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LockShield, LockStatusPill } from '@/components/lock';
import type { PersonaWithMeta } from '../../types/persona.types';
import type { UseLockStateReturn } from '@/hooks/useLockState';
import type { LockVisibility } from '@/hooks/useLockVisibility';
import { useGeneratePersonaImage } from '../../hooks';

interface PersonaDetailHeaderProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  lockState: UseLockStateReturn;
  visibility: LockVisibility;
  onEditToggle: () => void;
  onChat: () => void;
}

export function PersonaDetailHeader({
  persona,
  isEditing,
  lockState,
  visibility,
  onEditToggle,
  onChat,
}: PersonaDetailHeaderProps) {
  const completedMethods = (persona.researchMethods ?? []).filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;
  const totalMethods = (persona.researchMethods ?? []).length;

  const generateImage = useGeneratePersonaImage(persona.id);

  return (
    <div data-testid="persona-detail-header" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Profile Photo + Generate Button */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 overflow-hidden shadow-md">
            {generateImage.isPending ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                <span className="text-[9px] text-white/80 font-medium">Generating...</span>
              </div>
            ) : (
              <OptimizedImage
                src={persona.avatarUrl}
                alt={persona.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-10 w-10 text-white/70" />
                  </div>
                }
              />
            )}
          </div>
          {/* Generate Photo — hidden when locked */}
          {visibility.showGeneratePhoto && (
            <button
              onClick={() => generateImage.mutate()}
              disabled={generateImage.isPending}
              className="mt-2 w-24 h-7 inline-flex items-center justify-center gap-1 border border-gray-200 bg-white rounded-lg text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateImage.isPending ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Working...</span>
                </>
              ) : persona.avatarUrl ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate</span>
                </>
              ) : (
                <>
                  <Camera className="h-3 w-3" />
                  <span>Generate</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{persona.name}</h1>
                <LockStatusPill
                  isLocked={lockState.isLocked}
                  lockedBy={lockState.lockedBy}
                  lockedAt={lockState.lockedAt}
                />
              </div>
              {persona.tagline && (
                <p className="text-base text-gray-500 mt-0.5">{persona.tagline}</p>
              )}
              <div className="flex items-center gap-4 mt-2.5 text-sm text-gray-500">
                {persona.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {persona.location}
                  </span>
                )}
                {persona.occupation && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {persona.occupation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-500">
                  {completedMethods}/{totalMethods} methods completed
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  v1.0
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200">
                      <HelpCircle className="h-3 w-3" />
                      What are Personas?
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" align="start">
                    <div className="space-y-2">
                      <p className="font-semibold">What are Personas?</p>
                      <p className="text-gray-500 leading-relaxed">
                        Personas are research-based representations of your target users. They synthesize data into fictional but realistic characters that represent key audience segments.
                      </p>
                      <div className="pt-2 border-t border-gray-200 space-y-1.5 text-xs text-gray-500">
                        <p><span className="font-medium text-gray-900">User-Centered:</span> Evidence-based profiles from real research data</p>
                        <p><span className="font-medium text-gray-900">Strategic Tool:</span> Guides content, messaging, and campaign targeting</p>
                        <p><span className="font-medium text-gray-900">Validation-Driven:</span> Strengthen with interviews, surveys, and AI analysis</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                data-testid="persona-edit-button"
                variant={isEditing ? 'primary' : 'secondary'}
                size="sm"
                icon={Pencil}
                onClick={onEditToggle}
                disabled={!lockState.canEdit}
              >
                {isEditing ? 'Editing' : 'Edit'}
              </Button>

              {/* Lock Shield toggle */}
              <LockShield
                isLocked={lockState.isLocked}
                isToggling={lockState.isToggling}
                onClick={lockState.requestToggle}
                size="sm"
              />

              {/* Chat — hidden when locked (new chat), always visible for existing */}
              <Button
                data-testid="persona-chat-detail-button"
                variant="secondary"
                size="sm"
                icon={MessageCircle}
                onClick={onChat}
              >
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
