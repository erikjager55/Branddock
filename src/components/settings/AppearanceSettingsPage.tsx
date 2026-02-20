"use client";

import React, { useEffect } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Type,
  Layout,
  Sparkles,
  PanelLeft,
  RotateCcw,
  Save,
} from "lucide-react";
import { Card, Button } from "@/components/shared";
import {
  useAppearance,
  useUpdateAppearance,
  useResetAppearance,
} from "@/hooks/use-settings";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type {
  ThemeOption,
  AccentColorOption,
  FontSizeOption,
  SidebarPositionOption,
  AppearanceData,
} from "@/types/settings";

// ─── Constants ───────────────────────────────────────────────

const THEMES: {
  id: ThemeOption;
  label: string;
  icon: React.ElementType;
  previewBg: string;
  previewFg: string;
}[] = [
  {
    id: "LIGHT",
    label: "Light",
    icon: Sun,
    previewBg: "bg-white",
    previewFg: "bg-gray-200",
  },
  {
    id: "DARK",
    label: "Dark",
    icon: Moon,
    previewBg: "bg-gray-900",
    previewFg: "bg-gray-700",
  },
  {
    id: "SYSTEM",
    label: "System",
    icon: Monitor,
    previewBg: "bg-gradient-to-br from-white to-gray-900",
    previewFg: "bg-gray-400",
  },
];

const ACCENT_COLORS: {
  id: AccentColorOption;
  label: string;
  swatch: string;
  ring: string;
}[] = [
  { id: "BLUE", label: "Blue", swatch: "bg-blue-500", ring: "ring-blue-200" },
  {
    id: "PURPLE",
    label: "Purple",
    swatch: "bg-purple-500",
    ring: "ring-purple-200",
  },
  {
    id: "GREEN",
    label: "Green",
    swatch: "bg-green-500",
    ring: "ring-green-200",
  },
  {
    id: "ORANGE",
    label: "Orange",
    swatch: "bg-orange-500",
    ring: "ring-orange-200",
  },
  { id: "PINK", label: "Pink", swatch: "bg-pink-500", ring: "ring-pink-200" },
  { id: "TEAL", label: "Teal", swatch: "bg-primary", ring: "ring-teal-200" },
];

const FONT_SIZES: { id: FontSizeOption; label: string; iconSize: string }[] = [
  { id: "SMALL", label: "Small", iconSize: "h-3 w-3" },
  { id: "MEDIUM", label: "Medium", iconSize: "h-4 w-4" },
  { id: "LARGE", label: "Large", iconSize: "h-5 w-5" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

// ─── Sub-components ──────────────────────────────────────────

function ThemeSelector({
  current,
  onChange,
}: {
  current: ThemeOption;
  onChange: (t: ThemeOption) => void;
}) {
  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Theme</h3>
      <p className="text-xs text-gray-500 mb-4">
        Choose your preferred color scheme
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {THEMES.map((theme) => {
          const Icon = theme.icon;
          const isActive = current === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onChange(theme.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-primary ring-2 ring-primary/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className={`h-20 rounded-lg mb-3 ${theme.previewBg} border border-gray-200`}
              >
                <div className="p-3 space-y-2">
                  <div
                    className={`h-2 w-12 rounded ${theme.previewFg}`}
                  />
                  <div
                    className={`h-2 w-20 rounded ${theme.previewFg}`}
                  />
                  <div
                    className={`h-2 w-8 rounded ${theme.previewFg}`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {theme.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function AccentColorPicker({
  current,
  onChange,
}: {
  current: AccentColorOption;
  onChange: (c: AccentColorOption) => void;
}) {
  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        Accent Color
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Choose your preferred accent color
      </p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {ACCENT_COLORS.map((color) => {
          const isActive = current === color.id;
          return (
            <button
              key={color.id}
              onClick={() => onChange(color.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                isActive
                  ? `border-primary ring-2 ${color.ring}`
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full ${color.swatch} flex items-center justify-center`}
              >
                {isActive && <Check className="h-4 w-4 text-white" />}
              </div>
              <span className="text-xs font-medium text-gray-700">
                {color.label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function LanguageRegion({
  language,
  fontSize,
  onChangeLanguage,
  onChangeFontSize,
}: {
  language: string;
  fontSize: FontSizeOption;
  onChangeLanguage: (l: string) => void;
  onChangeFontSize: (s: FontSizeOption) => void;
}) {
  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Language & Font
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            Font Size
          </label>
          <div className="flex gap-2">
            {FONT_SIZES.map((fs) => (
              <button
                key={fs.id}
                onClick={() => onChangeFontSize(fs.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  fontSize === fs.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Type className={fs.iconSize} />
                {fs.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LayoutSettings({
  sidebarPosition,
  compactMode,
  animations,
  onChangeSidebar,
  onToggleCompact,
  onToggleAnimations,
}: {
  sidebarPosition: SidebarPositionOption;
  compactMode: boolean;
  animations: boolean;
  onChangeSidebar: (p: SidebarPositionOption) => void;
  onToggleCompact: () => void;
  onToggleAnimations: () => void;
}) {
  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Layout</h3>
      <div className="space-y-4">
        {/* Sidebar Position */}
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1.5 block">
            Sidebar Position
          </label>
          <div className="flex gap-2">
            {(["LEFT", "RIGHT"] as SidebarPositionOption[]).map((pos) => (
              <button
                key={pos}
                onClick={() => onChangeSidebar(pos)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  sidebarPosition === pos
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <PanelLeft
                  className={`h-4 w-4 ${pos === "RIGHT" ? "rotate-180" : ""}`}
                />
                {pos === "LEFT" ? "Left" : "Right"}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle rows */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Layout className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Compact Mode</p>
              <p className="text-xs text-gray-500">
                Reduce spacing for a denser layout
              </p>
            </div>
          </div>
          <button
            onClick={onToggleCompact}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              compactMode ? "bg-primary" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                compactMode ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Animations</p>
              <p className="text-xs text-gray-500">
                Enable smooth transitions and motion
              </p>
            </div>
          </div>
          <button
            onClick={onToggleAnimations}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              animations ? "bg-primary" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                animations ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}

function AppearancePreview({ pending }: { pending: Partial<AppearanceData> }) {
  const theme = pending.theme ?? "SYSTEM";
  const accent = pending.accentColor ?? "TEAL";
  const accentDef = ACCENT_COLORS.find((c) => c.id === accent);
  const isDark = theme === "DARK";

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Preview</h3>
      <div
        className={`p-6 rounded-xl border-2 border-dashed border-gray-200 ${
          isDark ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`h-10 w-10 rounded-full ${accentDef?.swatch ?? "bg-primary"}`}
          />
          <div className="space-y-1.5">
            <div
              className={`h-3 w-28 rounded ${isDark ? "bg-gray-700" : "bg-gray-300"}`}
            />
            <div
              className={`h-2.5 w-40 rounded ${isDark ? "bg-gray-800" : "bg-gray-200"}`}
            />
          </div>
        </div>
        <div
          className={`h-16 rounded-lg ${isDark ? "bg-gray-800" : "bg-white"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}
        />
      </div>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function AppearanceSettingsPage() {
  const { data: appearanceData, isLoading } = useAppearance();
  const updateMutation = useUpdateAppearance();
  const resetMutation = useResetAppearance();
  const { pendingAppearance, setPendingAppearance } = useSettingsStore();

  // Initialize pending from server data
  useEffect(() => {
    if (appearanceData?.appearance && !pendingAppearance) {
      setPendingAppearance(appearanceData.appearance);
    }
  }, [appearanceData, pendingAppearance, setPendingAppearance]);

  const current = (pendingAppearance ?? appearanceData?.appearance) as
    | AppearanceData
    | undefined;

  const updateField = <K extends keyof AppearanceData>(
    key: K,
    value: AppearanceData[K]
  ) => {
    setPendingAppearance({
      ...pendingAppearance,
      [key]: value,
    });
  };

  const handleSave = () => {
    if (!pendingAppearance) return;
    updateMutation.mutate(pendingAppearance, {
      onSuccess: () => {
        // pendingAppearance stays in sync
      },
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        setPendingAppearance(null);
      },
    });
  };

  const hasChanges =
    !!pendingAppearance &&
    !!appearanceData?.appearance &&
    JSON.stringify(pendingAppearance) !==
      JSON.stringify(appearanceData.appearance);

  if (isLoading || !current) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="space-y-1">
            <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-72 animate-pulse" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="lg">
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 rounded w-32" />
                <div className="h-24 bg-gray-100 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
          <p className="text-sm text-gray-500">
            Customize how the application looks and feels
          </p>
        </div>

        {/* Theme */}
        <ThemeSelector
          current={current.theme}
          onChange={(t) => updateField("theme", t)}
        />

        {/* Accent Color */}
        <AccentColorPicker
          current={current.accentColor}
          onChange={(c) => updateField("accentColor", c)}
        />

        {/* Language & Font */}
        <LanguageRegion
          language={current.language}
          fontSize={current.fontSize}
          onChangeLanguage={(l) => updateField("language", l)}
          onChangeFontSize={(s) => updateField("fontSize", s)}
        />

        {/* Layout */}
        <LayoutSettings
          sidebarPosition={current.sidebarPosition}
          compactMode={current.compactMode}
          animations={current.animations}
          onChangeSidebar={(p) => updateField("sidebarPosition", p)}
          onToggleCompact={() => updateField("compactMode", !current.compactMode)}
          onToggleAnimations={() =>
            updateField("animations", !current.animations)
          }
        />

        {/* Preview */}
        <AppearancePreview pending={current} />

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={handleReset}
            isLoading={resetMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            isLoading={updateMutation.isPending}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
