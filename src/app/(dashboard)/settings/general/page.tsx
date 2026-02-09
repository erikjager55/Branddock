"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Card } from "@/components/ui/Card";

const languages = [
  { value: "en", label: "English" },
  { value: "nl", label: "Dutch" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
];

const timezones = [
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "America/New_York", label: "America/New York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT)" },
];

export default function GeneralSettingsPage() {
  const [workspaceName, setWorkspaceName] = useState("Branddock");
  const [workspaceSlug, setWorkspaceSlug] = useState("branddock");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Amsterdam");
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-dark">General</h1>
        <p className="text-sm text-text-dark/40">
          Manage your workspace settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Workspace Info */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Workspace
          </h3>
          <div className="space-y-4">
            <Input
              label="Workspace Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <Input
              label="Workspace Slug"
              value={workspaceSlug}
              onChange={(e) => setWorkspaceSlug(e.target.value)}
              helperText="Used in URLs: app.branddock.com/your-slug"
            />
          </div>
        </Card>

        {/* Language & Timezone */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Localization
          </h3>
          <div className="space-y-4">
            <Select
              label="Default Language"
              options={languages}
              value={language}
              onChange={setLanguage}
            />
            <Select
              label="Timezone"
              options={timezones}
              value={timezone}
              onChange={setTimezone}
              searchable
            />
          </div>
        </Card>

        {/* Appearance */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-dark">Dark Mode</p>
              <p className="text-xs text-text-dark/40">
                Use dark theme across the application
              </p>
            </div>
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button variant="primary">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
