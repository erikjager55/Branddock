"use client";

import React, { useState, useRef } from "react";
import { Play, Pause, Film } from "lucide-react";
import { useContentStudioStore } from "@/stores/useContentStudioStore";

export function VideoPlayer() {
  const { videoUrl } = useContentStudioStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Film className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No video yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Write a prompt and click Generate to create a video
          </p>
        </div>
      </div>
    );
  }

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Video */}
        <div className="relative rounded-lg overflow-hidden bg-black shadow-lg">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-3 px-2">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          <span className="text-xs text-gray-500 w-10">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar */}
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!videoRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = pct * duration;
            }}
          >
            <div
              className="h-full bg-teal-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <span className="text-xs text-gray-500 w-10 text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
