'use client';

import { User, MapPin, Briefcase, RefreshCw, Pencil, Sparkles, Lock, Unlock, CheckCircle, MessageCircle, HelpCircle } from 'lucide-react';
import { OptimizedImage, Button, Badge } from '@/components/shared';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PersonaWithMeta } from '../../types/persona.types';
import { useGeneratePersonaImage } from '../../hooks';

interface PersonaDetailHeaderProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onEditToggle: () => void;
  onLockToggle: () => void;
  onRegenerate: () => void;
  onChat: () => void;
}

export function PersonaDetailHeader({
  persona,
  isEditing,
  onEditToggle,
  onLockToggle,
  onRegenerate,
  onChat,
}: PersonaDetailHeaderProps) {
  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'VALIDATED',
  ).length;
  const totalMethods = persona.researchMethods.length;

  const generateImage = useGeneratePersonaImage(persona.id);

  return (
    <div data-testid="persona-detail-header" className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-6">
        {/* Profile Photo */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 overflow-hidden shadow-md">
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
          </div>
          <button
            onClick={() => generateImage.mutate()}
            disabled={generateImage.isPending}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Generate photo"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-gray-500 ${generateImage.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{persona.name}</h1>
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
                <Badge variant="success" icon={CheckCircle} size="sm">
                  Verified Profile
                </Badge>
                <span className="text-xs text-gray-500">
                  {completedMethods}/{totalMethods} methods completed
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-5 w-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 inline-flex items-center justify-center transition-colors">
                      <HelpCircle className="h-3.5 w-3.5" />
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
                variant={isEditing ? 'cta' : 'secondary'}
                size="sm"
                icon={Pencil}
                onClick={onEditToggle}
                disabled={persona.isLocked}
              >
                {isEditing ? 'Editing' : 'Edit'}
              </Button>

              <Button
                data-testid="persona-regenerate-button"
                variant="secondary"
                size="sm"
                icon={Sparkles}
                onClick={onRegenerate}
                disabled={persona.isLocked}
              >
                Regenerate
              </Button>

              <Button
                data-testid="persona-lock-button"
                variant="secondary"
                size="sm"
                icon={persona.isLocked ? Lock : Unlock}
                onClick={onLockToggle}
              >
                {persona.isLocked ? 'Locked' : 'Unlock'}
              </Button>

              <Button
                data-testid="persona-chat-detail-button"
                variant="cta"
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
