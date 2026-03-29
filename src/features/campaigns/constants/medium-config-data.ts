// =============================================================
// Medium Config Data — video models, AI voices, music tracks
// =============================================================

import type { VideoModel, AiVoice, MusicTrack } from '../types/medium-config.types';

export const VIDEO_MODELS: VideoModel[] = [
  { id: 'model-1', name: 'Alex Rivera', age: 28, type: 'Casual' },
  { id: 'model-2', name: 'Sarah Chen', age: 34, type: 'Professional' },
  { id: 'model-3', name: 'Marcus Johnson', age: 42, type: 'Executive' },
  { id: 'model-4', name: 'Emma Larsson', age: 26, type: 'Casual' },
  { id: 'model-5', name: 'David Kim', age: 38, type: 'Corporate' },
  { id: 'model-6', name: 'Laura Martinez', age: 31, type: 'Professional' },
];

export const AI_VOICES: AiVoice[] = [
  { id: 'voice-1', name: 'Aria', gender: 'Female', tone: 'Warm & Friendly', accent: 'American' },
  { id: 'voice-2', name: 'Marcus', gender: 'Male', tone: 'Authoritative', accent: 'British' },
  { id: 'voice-3', name: 'Sofia', gender: 'Female', tone: 'Energetic', accent: 'American' },
  { id: 'voice-4', name: 'James', gender: 'Male', tone: 'Conversational', accent: 'Australian' },
  { id: 'voice-5', name: 'Luna', gender: 'Female', tone: 'Professional', accent: 'British' },
];

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'track-1', label: 'Upbeat Corporate' },
  { id: 'track-2', label: 'Inspirational Piano' },
  { id: 'track-3', label: 'Modern Tech' },
  { id: 'track-4', label: 'Chill Lo-Fi' },
  { id: 'track-5', label: 'Energetic Pop' },
  { id: 'track-6', label: 'No Music' },
];
