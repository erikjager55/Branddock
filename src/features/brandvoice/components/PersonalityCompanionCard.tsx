"use client";

import { useEffect, useState } from "react";
import { Users, ExternalLink, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/shared";

/**
 * Sidebar card that surfaces voice-relevant fields from the legacy
 * BrandPersonality.frameworkData, read-only. Only shown during the soft-migration
 * window — once the BrandPersonalitySection.tsx UI strips voice fields (BV-5),
 * the underlying data is preserved in frameworkData JSON for one more cycle.
 *
 * Helps the user see what's already filled in there, so they can decide
 * whether to migrate or fill the voiceguide manually.
 */

interface PersonalityVoiceFields {
  brandVoiceDescription?: string;
  toneDimensions?: Record<string, number>;
  writingSample?: string;
  wordsWeUse?: string[];
  wordsWeAvoid?: string[];
  channelTones?: Record<string, string | Record<string, number>>;
}

interface PersonalityCompanionCardProps {
  onNavigateToPersonality?: () => void;
}

export function PersonalityCompanionCard({ onNavigateToPersonality }: PersonalityCompanionCardProps) {
  const [data, setData] = useState<PersonalityVoiceFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/brand-assets?category=BRAND_PERSONALITY", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Could not load BrandPersonality");
        const payload = await res.json();
        const list = payload?.assets ?? payload?.data ?? [];
        const personality = list.find((a: { frameworkType?: string }) => a.frameworkType === "BRAND_PERSONALITY");
        if (cancelled) return;
        const fw = (personality?.frameworkData ?? {}) as PersonalityVoiceFields;
        setData(fw);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-xs text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const hasAny =
    !!data?.brandVoiceDescription ||
    !!data?.writingSample ||
    (data?.wordsWeUse?.length ?? 0) > 0 ||
    (data?.wordsWeAvoid?.length ?? 0) > 0 ||
    !!data?.toneDimensions ||
    !!data?.channelTones;

  if (!hasAny) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-700">Brand Personality</h3>
        </div>
        <p className="text-xs text-gray-500">
          No voice-fields filled in there. Voice DNA, vocabulary and channel-tones
          live here in the voiceguide now.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-600" />
          <h3 className="text-xs font-semibold text-gray-900">Brand Personality (read-only)</h3>
        </div>
        <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <p className="text-xs text-gray-500 mb-3">
        These fields still exist in your legacy BrandPersonality asset. They will be
        ignored once you've migrated.
      </p>

      <div className="space-y-2 text-xs">
        {data?.brandVoiceDescription && (
          <Item label="Voice description" value={data.brandVoiceDescription} />
        )}
        {!!data?.wordsWeUse?.length && (
          <Item label="Words we use" value={data.wordsWeUse.join(", ")} />
        )}
        {!!data?.wordsWeAvoid?.length && (
          <Item label="Words we avoid" value={data.wordsWeAvoid.join(", ")} />
        )}
        {data?.writingSample && (
          <Item label="Writing sample" value={data.writingSample.slice(0, 200) + (data.writingSample.length > 200 ? "…" : "")} />
        )}
      </div>

      {onNavigateToPersonality && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onNavigateToPersonality} className="w-full justify-start">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open Brand Personality
          </Button>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-600 break-words">{value}</p>
    </div>
  );
}
