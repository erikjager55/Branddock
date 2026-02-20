"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Input, OptimizedImage } from "@/components/shared";

interface PersonaImageGeneratorProps {
  name: string;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
}

export function PersonaImageGenerator({
  name,
  avatarUrl,
  onAvatarChange,
}: PersonaImageGeneratorProps) {
  const [mode, setMode] = useState<"ai" | "url">("ai");

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleGenerate = () => {
    // Stub: use DiceBear placeholder
    const seed = encodeURIComponent(name || "persona");
    const url = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
    onAvatarChange(url);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Avatar
      </label>
      <div className="flex items-start gap-4">
        {/* Preview */}
        <OptimizedImage
          src={avatarUrl}
          alt={name || "Avatar"}
          avatar="2xl"
          className="ring-2 ring-gray-200"
          fallback={
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-700 ring-2 ring-gray-200">
              {initials}
            </div>
          }
        />

        {/* Controls */}
        <div className="flex-1 space-y-3">
          {mode === "ai" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={Sparkles}
                onClick={handleGenerate}
              >
                Generate with AI
              </Button>
              <button
                className="block text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setMode("url")}
              >
                Or enter URL manually
              </button>
            </>
          ) : (
            <>
              <Input
                value={avatarUrl}
                onChange={(e) => onAvatarChange(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <button
                className="block text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setMode("ai")}
              >
                Or generate with AI
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
