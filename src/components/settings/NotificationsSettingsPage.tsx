"use client";

import React, { useState } from "react";
import {
  Mail,
  Bell,
  MessageSquare,
  Check,
  X,
  Clock,
  Plug,
  Link2,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/shared";
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useConnectNotificationChannel,
} from "@/hooks/use-settings";
import type {
  NotificationMatrix,
  UpdateNotificationPrefsRequest,
} from "@/types/settings";

// ─── Constants ───────────────────────────────────────────────

const CHANNELS = [
  {
    key: "emailEnabled" as const,
    label: "Email",
    icon: Mail,
    description: "Receive notifications via email",
    color: "bg-blue-100 text-blue-600",
  },
  {
    key: "browserEnabled" as const,
    label: "Browser",
    icon: Bell,
    description: "Push notifications in your browser",
    color: "bg-purple-100 text-purple-600",
  },
  {
    key: "slackEnabled" as const,
    label: "Slack",
    icon: MessageSquare,
    description: "Get notified in your Slack workspace",
    color: "bg-green-100 text-green-600",
  },
];

const MATRIX_CATEGORIES: {
  label: string;
  types: { key: string; label: string }[];
}[] = [
  {
    label: "Research",
    types: [
      { key: "research_completed", label: "Research Completed" },
      { key: "research_insight", label: "New Insight Found" },
      { key: "research_review", label: "Pending Review" },
    ],
  },
  {
    label: "Campaigns",
    types: [
      { key: "campaign_launched", label: "Campaign Launched" },
      { key: "campaign_completed", label: "Campaign Completed" },
      { key: "campaign_feedback", label: "Content Feedback" },
    ],
  },
  {
    label: "Team",
    types: [
      { key: "team_invite", label: "New Invitation" },
      { key: "team_join", label: "Member Joined" },
      { key: "team_mention", label: "You Were Mentioned" },
    ],
  },
  {
    label: "System",
    types: [
      { key: "system_update", label: "Platform Updates" },
      { key: "system_security", label: "Security Alerts" },
      { key: "system_billing", label: "Billing Notifications" },
    ],
  },
];

const CHANNEL_KEYS = ["email", "browser", "slack"] as const;

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

// ─── Sub-components ──────────────────────────────────────────

function NotificationChannels({
  emailEnabled,
  browserEnabled,
  slackEnabled,
  onToggle,
  onConnect,
  isConnecting,
}: {
  emailEnabled: boolean;
  browserEnabled: boolean;
  slackEnabled: boolean;
  onToggle: (key: "emailEnabled" | "browserEnabled" | "slackEnabled") => void;
  onConnect: (channel: string) => void;
  isConnecting: boolean;
}) {
  const values = { emailEnabled, browserEnabled, slackEnabled };

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Notification Channels
      </h3>
      <div className="space-y-3">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isEnabled = values[ch.key];
          const isSlack = ch.key === "slackEnabled";

          return (
            <div
              key={ch.key}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${ch.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {ch.label}
                    </p>
                    {isEnabled ? (
                      <Badge variant="success" size="sm">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        Not connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{ch.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSlack && !isEnabled ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Link2}
                    onClick={() => onConnect("slack")}
                    isLoading={isConnecting}
                  >
                    Connect
                  </Button>
                ) : (
                  <button
                    onClick={() => onToggle(ch.key)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      isEnabled ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                        isEnabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NotificationMatrixSection({
  matrix,
  onToggle,
}: {
  matrix: NotificationMatrix;
  onToggle: (type: string, channel: string) => void;
}) {
  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          Notification Types
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure which notifications you receive on each channel
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-5 py-3 border-b border-gray-100 text-xs font-medium text-gray-500">
        <div>Type</div>
        <div className="text-center">Email</div>
        <div className="text-center">Browser</div>
        <div className="text-center">Slack</div>
      </div>

      {MATRIX_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {cat.label}
            </span>
          </div>
          {cat.types.map((type) => {
            const row = matrix[type.key] ?? {};
            return (
              <div
                key={type.key}
                className="grid grid-cols-[1fr,80px,80px,80px] gap-2 px-5 py-3 border-b border-gray-50 last:border-0 items-center"
              >
                <span className="text-sm text-gray-700">{type.label}</span>
                {CHANNEL_KEYS.map((ch) => (
                  <div key={ch} className="flex justify-center">
                    <button
                      onClick={() => onToggle(type.key, ch)}
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        row[ch]
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                      }`}
                    >
                      {row[ch] ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

function QuietHoursSection({
  enabled,
  start,
  end,
  onToggle,
  onChangeStart,
  onChangeEnd,
}: {
  enabled: boolean;
  start: string | null;
  end: string | null;
  onToggle: () => void;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  const [activeDays, setActiveDays] = useState<string[]>([
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
  ]);

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Quiet Hours</h3>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Pause all notifications during specified hours
      </p>

      {enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Start
              </label>
              <input
                type="time"
                value={start ?? "22:00"}
                onChange={(e) => onChangeStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                End
              </label>
              <input
                type="time"
                value={end ?? "08:00"}
                onChange={(e) => onChangeEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              Active days
            </label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeDays.includes(day.key)
                      ? "bg-primary/10 text-primary"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function NotificationsSettingsPage() {
  const { data: prefsData, isLoading } = useNotificationPrefs();
  const updateMutation = useUpdateNotificationPrefs();
  const connectMutation = useConnectNotificationChannel();

  const prefs = prefsData?.preferences;

  const handleChannelToggle = (
    key: "emailEnabled" | "browserEnabled" | "slackEnabled"
  ) => {
    if (!prefs) return;
    updateMutation.mutate({ [key]: !prefs[key] });
  };

  const handleMatrixToggle = (type: string, channel: string) => {
    if (!prefs) return;
    const currentMatrix = prefs.matrix ?? {};
    const currentRow = currentMatrix[type] ?? {};
    const newMatrix = {
      ...currentMatrix,
      [type]: {
        ...currentRow,
        [channel]: !currentRow[channel],
      },
    };
    updateMutation.mutate({ matrix: newMatrix });
  };

  const handleQuietHoursToggle = () => {
    if (!prefs) return;
    updateMutation.mutate({ quietHoursEnabled: !prefs.quietHoursEnabled });
  };

  const handleQuietHoursStart = (v: string) => {
    updateMutation.mutate({ quietHoursStart: v });
  };

  const handleQuietHoursEnd = (v: string) => {
    updateMutation.mutate({ quietHoursEnd: v });
  };

  const handleConnect = (channel: string) => {
    connectMutation.mutate(channel);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="space-y-1">
            <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-80 animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="lg">
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 rounded w-40" />
                <div className="h-16 bg-gray-100 rounded" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            Choose how and when you receive notifications
          </p>
        </div>

        {/* Channels */}
        <NotificationChannels
          emailEnabled={prefs.emailEnabled}
          browserEnabled={prefs.browserEnabled}
          slackEnabled={prefs.slackEnabled}
          onToggle={handleChannelToggle}
          onConnect={handleConnect}
          isConnecting={connectMutation.isPending}
        />

        {/* Matrix */}
        <NotificationMatrixSection
          matrix={prefs.matrix}
          onToggle={handleMatrixToggle}
        />

        {/* Quiet Hours */}
        <QuietHoursSection
          enabled={prefs.quietHoursEnabled}
          start={prefs.quietHoursStart}
          end={prefs.quietHoursEnd}
          onToggle={handleQuietHoursToggle}
          onChangeStart={handleQuietHoursStart}
          onChangeEnd={handleQuietHoursEnd}
        />
      </div>
    </div>
  );
}
