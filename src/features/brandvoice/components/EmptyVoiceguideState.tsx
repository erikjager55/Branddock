"use client";

import { useState } from "react";
import { Mic2, ArrowRightCircle, Wand2, Plus } from "lucide-react";
import { Button } from "@/components/shared";
import { useMigrateFromPersonality, useUpdateVoiceguide } from "../hooks";

interface EmptyVoiceguideStateProps {
  onAnalyze: () => void;
}

/**
 * Empty-state shown when a workspace has no BrandVoiceguide row yet.
 *
 * Three paths:
 *  1. Migrate from Brand Personality (extracts voice-velden into a new row)
 *  2. Run the website analyzer (BV-3)
 *  3. Start from scratch (PATCH with default empty fields)
 */
export function EmptyVoiceguideState({ onAnalyze }: EmptyVoiceguideStateProps) {
  const migrate = useMigrateFromPersonality();
  const update = useUpdateVoiceguide();
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    setError(null);
    try {
      await migrate.mutateAsync(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Migration failed");
    }
  };

  const handleStartFromScratch = async () => {
    setError(null);
    try {
      // Trigger upsert with empty defaults — server creates the row.
      await update.mutateAsync({ source: "manual" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not initialize voiceguide");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Set up your Brand Voice</h2>
          <p className="text-sm text-gray-500">
            Verbal identity sits next to your visual identity. Tone, vocabulary,
            channel-tones, anti-patterns and writing samples — used by every AI
            content generation across Branddock.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        <button
          onClick={handleMigrate}
          disabled={migrate.isPending}
          className="text-left p-4 rounded-lg border-2 border-teal-200 bg-teal-50/40 hover:bg-teal-50 transition-colors disabled:opacity-60"
        >
          <ArrowRightCircle className="w-5 h-5 text-teal-600 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">
            Migrate from Brand Personality
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Extract voice-fields from your existing Brand Personality asset.
            Recommended if you've filled in tone/words/sample.
          </p>
          <span className="inline-block mt-2 text-xs text-teal-700 font-medium">
            {migrate.isPending ? "Migrating…" : "Recommended →"}
          </span>
        </button>

        <button
          onClick={onAnalyze}
          className="text-left p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
        >
          <Wand2 className="w-5 h-5 text-primary mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">
            Analyze your website
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Scrape long-form text and let Claude suggest tone, vocabulary and
            channel-tones.
          </p>
          <span className="inline-block mt-2 text-xs text-primary-700 font-medium">Run analyzer →</span>
        </button>

        <button
          onClick={handleStartFromScratch}
          disabled={update.isPending}
          className="text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <Plus className="w-5 h-5 text-gray-700 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">Start from scratch</h3>
          <p className="text-xs text-gray-600 mt-1">
            Empty voiceguide. You'll fill in voice DNA, vocabulary and channel-tones
            manually.
          </p>
          <span className="inline-block mt-2 text-xs text-gray-700 font-medium">
            {update.isPending ? "Creating…" : "Create empty →"}
          </span>
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Tip: voice fields will keep working from Brand Personality during the
          migration window. The voiceguide takes precedence as soon as it exists.
        </p>
      </div>
    </div>
  );
}
