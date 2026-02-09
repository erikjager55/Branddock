"use client";

import { useState } from "react";
import { Plug, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
}

const initialIntegrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Get notifications and share brand updates directly in your Slack channels.",
    category: "Communication",
    connected: true,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Track brand campaign performance and content engagement metrics.",
    category: "Analytics",
    connected: true,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description:
      "Sync email campaigns and automate brand-consistent email marketing.",
    category: "Email Marketing",
    connected: false,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description:
      "Connect your CRM to align brand strategy with customer data and pipelines.",
    category: "CRM",
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    description:
      "Automate workflows between Branddock and 5,000+ apps without code.",
    category: "Automation",
    connected: true,
  },
  {
    id: "wordpress",
    name: "WordPress",
    description:
      "Publish brand-aligned content directly to your WordPress site.",
    category: "CMS",
    connected: false,
  },
];

const logoColors: Record<string, string> = {
  slack: "bg-[#4A154B]",
  "google-analytics": "bg-[#E37400]",
  mailchimp: "bg-[#FFE01B]",
  hubspot: "bg-[#FF7A59]",
  zapier: "bg-[#FF4F00]",
  wordpress: "bg-[#21759B]",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(initialIntegrations);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, connected: !int.connected } : int
      )
    );
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-dark">Integrations</h1>
        <p className="text-sm text-text-dark/40">
          Connect Branddock with your favorite tools and services
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id} padding="lg">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${logoColors[integration.id] || "bg-surface-dark"} flex items-center justify-center`}
                  >
                    <span className="text-white text-sm font-bold">
                      {integration.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-dark">
                      {integration.name}
                    </h3>
                    <Badge variant="default" size="sm">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                <Toggle
                  checked={integration.connected}
                  onChange={() => toggleConnection(integration.id)}
                  size="sm"
                />
              </div>

              {/* Description */}
              <p className="text-xs text-text-dark/60">
                {integration.description}
              </p>

              {/* Status */}
              <div className="flex items-center justify-between pt-2 border-t border-border-dark">
                <Badge
                  variant={integration.connected ? "success" : "default"}
                  size="sm"
                  dot
                >
                  {integration.connected ? "Connected" : "Disconnected"}
                </Badge>
                {integration.connected && (
                  <button className="text-xs text-text-dark/40 hover:text-text-dark flex items-center gap-1 transition-colors">
                    Configure
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
