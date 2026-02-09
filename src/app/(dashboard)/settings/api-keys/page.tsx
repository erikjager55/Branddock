"use client";

import { useState } from "react";
import { Plus, Key, Copy, Eye, EyeOff, BarChart3, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdDate: string;
  lastUsed: string;
  requestsToday: number;
  requestsTotal: number;
  status: "active" | "revoked";
}

const apiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production API Key",
    key: "bdk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    createdDate: "Jan 10, 2025",
    lastUsed: "2 hours ago",
    requestsToday: 1247,
    requestsTotal: 45230,
    status: "active",
  },
  {
    id: "2",
    name: "Development API Key",
    key: "bdk_test_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    createdDate: "Jan 15, 2025",
    lastUsed: "5 days ago",
    requestsToday: 23,
    requestsTotal: 3842,
    status: "active",
  },
];

function MaskedKey({ apiKey, visible }: { apiKey: string; visible: boolean }) {
  if (visible) {
    return <code className="text-xs text-text-dark font-mono">{apiKey}</code>;
  }
  const prefix = apiKey.slice(0, 12);
  return (
    <code className="text-xs text-text-dark/60 font-mono">
      {prefix}{"••••••••••••••••••••••••"}
    </code>
  );
}

export default function ApiKeysPage() {
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-semibold text-text-dark">API Keys</h1>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            Generate New Key
          </Button>
        </div>
        <p className="text-sm text-text-dark/40">
          Manage API keys for programmatic access to Branddock
        </p>
      </div>

      {/* Warning */}
      <Card padding="md" className="mb-6 border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-dark">
              Keep your API keys secure
            </p>
            <p className="text-xs text-text-dark/40 mt-0.5">
              Do not share your API keys or expose them in client-side code.
              Rotate keys regularly and revoke unused keys.
            </p>
          </div>
        </div>
      </Card>

      {/* API Key Cards */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id} padding="lg">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-dark">
                      {apiKey.name}
                    </h3>
                    <p className="text-xs text-text-dark/40">
                      Created {apiKey.createdDate}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={apiKey.status === "active" ? "success" : "default"}
                  size="sm"
                  dot
                >
                  {apiKey.status === "active" ? "Active" : "Revoked"}
                </Badge>
              </div>

              {/* Key Display */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-background-dark border border-border-dark">
                <MaskedKey
                  apiKey={apiKey.key}
                  visible={visibleKeys[apiKey.id] || false}
                />
                <div className="flex-1" />
                <button
                  onClick={() => toggleVisibility(apiKey.id)}
                  className="p-1.5 rounded hover:bg-surface-dark text-text-dark/40 hover:text-text-dark transition-colors"
                  title={visibleKeys[apiKey.id] ? "Hide" : "Show"}
                >
                  {visibleKeys[apiKey.id] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => copyKey(apiKey.key)}
                  className="p-1.5 rounded hover:bg-surface-dark text-text-dark/40 hover:text-text-dark transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Usage Stats */}
              <div className="flex items-center gap-6 text-xs text-text-dark/40">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {apiKey.requestsToday.toLocaleString()} requests today
                </span>
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {apiKey.requestsTotal.toLocaleString()} total requests
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last used {apiKey.lastUsed}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-dark">
                <Button variant="ghost" size="sm">
                  Regenerate
                </Button>
                <Button variant="destructive" size="sm">
                  Revoke Key
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
