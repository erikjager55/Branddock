import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Palette,
  Monitor,
  Sun,
  Moon,
  Globe,
  Type,
  Layout,
  Sidebar,
  Save,
  Sparkles,
} from 'lucide-react';

export function AppearanceSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'system',
    accentColor: 'blue',
    language: 'en',
    fontSize: 'medium',
    sidebarPosition: 'left',
    compactMode: false,
    animations: true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const themes = [
    { id: 'light', name: 'Light', icon: Sun, preview: 'bg-white border-2' },
    { id: 'dark', name: 'Dark', icon: Moon, preview: 'bg-gray-900 border-2 border-gray-700' },
    { id: 'system', name: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-gray-900 border-2' },
  ];

  const accentColors = [
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'orange', name: 'Orange', color: 'bg-orange-500' },
    { id: 'pink', name: 'Pink', color: 'bg-pink-500' },
    { id: 'teal', name: 'Teal', color: 'bg-teal-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Appearance Settings</h1>
          <p className="text-muted-foreground">
            Customize how the application looks and feels
          </p>
        </div>

        {/* Theme Selection */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Theme</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose your preferred color scheme
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ ...settings, theme: theme.id })}
                  className={`p-4 border-2 rounded-lg transition-all hover:scale-105 ${
                    settings.theme === theme.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`h-24 rounded-lg mb-3 ${theme.preview}`} />
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold">{theme.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Accent Color */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accent Color</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose your preferred accent color
          </p>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {accentColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSettings({ ...settings, accentColor: color.id })}
                className={`p-3 border-2 rounded-lg transition-all hover:scale-105 ${
                  settings.accentColor === color.id
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-12 w-full rounded ${color.color}`} />
                <p className="text-xs mt-2 text-center font-medium">{color.name}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* Language & Region */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Language & Region</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="nl">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Nederlands</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="es">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Español</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fr">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Français</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontSize">Font Size</Label>
              <Select value={settings.fontSize} onValueChange={(value) => setSettings({ ...settings, fontSize: value })}>
                <SelectTrigger id="fontSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">
                    <div className="flex items-center gap-2">
                      <Type className="h-3 w-3" />
                      <span>Small</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="large">
                    <div className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      <span>Large</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Layout Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Layout</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sidebarPosition">Sidebar Position</Label>
              <Select value={settings.sidebarPosition} onValueChange={(value) => setSettings({ ...settings, sidebarPosition: value })}>
                <SelectTrigger id="sidebarPosition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">
                    <div className="flex items-center gap-2">
                      <Sidebar className="h-4 w-4" />
                      <span>Left</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="right">
                    <div className="flex items-center gap-2">
                      <Sidebar className="h-4 w-4 rotate-180" />
                      <span>Right</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Layout className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Compact Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing for a more compact layout
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
                className="w-5 h-5 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold">Animations</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable smooth transitions and animations
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.animations}
                onChange={(e) => setSettings({ ...settings, animations: e.target.checked })}
                className="w-5 h-5 cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="p-6 border-2 border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary" />
              <div>
                <div className="h-4 w-32 bg-foreground/20 rounded mb-2" />
                <div className="h-3 w-48 bg-foreground/10 rounded" />
              </div>
            </div>
            <div className="h-24 bg-foreground/5 rounded" />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline">Reset to Defaults</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
