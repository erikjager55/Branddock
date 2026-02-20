"use client";

import { useState } from "react";
import { Sparkles, ImageIcon, Lightbulb } from "lucide-react";
import { Button, Input } from "@/components/shared";

interface PersonaImageGeneratorProps {
  name: string;
  avatarUrl: string;
  demographics?: {
    age?: string;
    gender?: string;
    occupation?: string;
  };
  onAvatarChange: (url: string) => void;
}

export function PersonaImageGenerator({
  name,
  avatarUrl,
  demographics,
  onAvatarChange,
}: PersonaImageGeneratorProps) {
  const [manualUrl, setManualUrl] = useState("");

  const hasDemographics = demographics?.age || demographics?.gender || demographics?.occupation;

  const handleGenerate = () => {
    const seed = encodeURIComponent(name || "persona");
    const url = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
    onAvatarChange(url);
  };

  const handleManualUrlSubmit = () => {
    if (manualUrl.trim()) {
      onAvatarChange(manualUrl.trim());
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-gray-900">Persona Image</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a realistic photo based on persona demographics
        </p>
      </div>

      {/* Image preview / empty state */}
      {avatarUrl ? (
        <div className="rounded-lg overflow-hidden aspect-square bg-gray-100">
          <img
            src={avatarUrl}
            alt={name || "Persona"}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg aspect-square flex flex-col items-center justify-center gap-2">
          <ImageIcon className="w-10 h-10 text-gray-300" />
          <span className="text-sm text-muted-foreground">No image generated yet</span>
        </div>
      )}

      {/* Tip */}
      {!hasDemographics && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">Tip:</span> Add age, gender, or occupation for better results
          </p>
        </div>
      )}

      {/* Generate button */}
      <Button
        variant="cta"
        icon={Sparkles}
        fullWidth
        onClick={handleGenerate}
      >
        Generate Image
      </Button>

      {/* Manual URL */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Or enter a custom image URL</p>
        <div className="flex gap-2">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualUrlSubmit}
            disabled={!manualUrl.trim()}
          >
            Set
          </Button>
        </div>
      </div>
    </div>
  );
}
