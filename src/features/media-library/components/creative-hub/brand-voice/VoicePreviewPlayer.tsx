'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface VoicePreviewPlayerProps {
  audioUrl: string | null;
  voiceName: string;
}

// ─── Helpers ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────

/** Simple audio player for brand voice sample previews. */
export const VoicePreviewPlayer = React.memo(function VoicePreviewPlayer({
  audioUrl,
  voiceName,
}: VoicePreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset state when audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [audioUrl]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        setHasError(true);
      });
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || duration <= 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setCurrentTime(audio.currentTime);
    },
    [duration],
  );

  // No audio URL — show disabled state
  if (!audioUrl) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        data-testid="voice-preview-disabled"
      >
        <VolumeX className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="text-xs text-gray-400">No sample available</span>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2"
      data-testid="voice-preview-player"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      />

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={hasError}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        aria-label={isPlaying ? `Pause ${voiceName}` : `Play ${voiceName}`}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {/* Progress bar */}
      <div
        className="flex-1 h-1.5 bg-gray-100 rounded-full cursor-pointer relative"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Playback progress for ${voiceName}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-teal-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Volume2 className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-500 tabular-nums min-w-[3rem] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Error state */}
      {hasError && (
        <span className="text-[10px] text-red-500">Error loading audio</span>
      )}
    </div>
  );
});
