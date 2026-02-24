'use client';

/**
 * AvatarGeneratingOverlay — Animated loading state for persona avatar generation.
 * Shows a dark background with pulsing silhouette, shimmer sweep, and floating sparkle icon.
 */

import { Sparkles } from 'lucide-react';

export function AvatarGeneratingOverlay() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Animated gradient sweep */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'linear-gradient(110deg, transparent 25%, rgba(99,200,180,0.25) 37%, rgba(56,189,248,0.18) 50%, transparent 63%)',
          backgroundSize: '250% 100%',
          animation: 'avatarShimmer 2s ease-in-out infinite',
        }}
      />

      {/* Soft radial glow in center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(45,212,191,0.2) 0%, transparent 65%)',
          animation: 'avatarPulse 2.5s ease-in-out infinite',
        }}
      />

      {/* Silhouette placeholder */}
      <svg
        viewBox="0 0 96 96"
        className="absolute inset-0 w-full h-full"
        style={{ animation: 'avatarPulse 2.5s ease-in-out infinite' }}
      >
        <circle cx="48" cy="34" r="14" fill="rgba(148,163,184,0.25)" />
        <ellipse cx="48" cy="78" rx="24" ry="18" fill="rgba(148,163,184,0.2)" />
      </svg>

      {/* Sparkle icon — subtle float */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ animation: 'avatarFloat 2s ease-in-out infinite' }}>
          <Sparkles className="h-5 w-5 text-teal-300/70" />
        </div>
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-1.5 inset-x-0 text-center">
        <span
          className="text-[8px] font-semibold uppercase tracking-widest text-teal-300/80"
          style={{ animation: 'avatarPulse 2.5s ease-in-out infinite' }}
        >
          Generating
        </span>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes avatarShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes avatarPulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
