// =============================================================
// Medium Configuration Types — categories, fields, variants, video
// =============================================================

// ─── Medium Categories ───────────────────────────────────────
export type MediumCategory =
  | 'video'
  | 'social-post'
  | 'carousel'
  | 'email'
  | 'web-page'
  | 'podcast'
  | 'advertising';

// ─── Config Field Definitions (registry-driven) ─────────────
export type ConfigFieldType =
  | 'select'
  | 'button-group'
  | 'slider'
  | 'toggle'
  | 'radio-group'
  | 'number'
  | 'color-grid';

export interface ConfigFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: ConfigFieldType;
  options?: ConfigFieldOption[];
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  showWhen?: { field: string; value: unknown };
  columns?: number;
  helpText?: string;
}

export interface ConfigSectionDefinition {
  id: string;
  title: string;
  icon?: string;
  fields: ConfigFieldDefinition[];
}

export interface MediumCategoryConfig {
  category: MediumCategory;
  label: string;
  sections: ConfigSectionDefinition[];
}

// ─── Video-specific types ────────────────────────────────────
export type VideoDuration = '15s' | '30s' | '60s';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';
export type VideoQuality = '720p' | '1080p' | '4k';
export type FootageType = 'real-person' | 'stock' | 'animation' | 'mixed';
export type TextOverlayStyle = 'bold-headlines' | 'minimal' | 'dynamic-captions';
export type ColorGrade = 'warm' | 'cool' | 'vibrant' | 'natural';
export type VoiceType = 'ai' | 'human' | 'none';

export interface VideoModel {
  id: string;
  name: string;
  age: number;
  type: 'Professional' | 'Casual' | 'Executive' | 'Corporate';
}

export interface AiVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  tone: string;
  accent: string;
}

export interface MusicTrack {
  id: string;
  label: string;
}

// ─── Shared: Medium Variant ──────────────────────────────────
export interface MediumVariant {
  id: 'A' | 'B' | 'C';
  title: string;
  description: string;
  configSnapshot: Record<string, unknown>;
}
