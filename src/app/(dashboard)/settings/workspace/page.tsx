"use client";

import { useState } from "react";
import { Upload, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

const defaultBrandAssets = [
  "Mission Statement",
  "Vision",
  "Brand Values",
  "Brand Voice",
  "Visual Identity",
  "Tagline",
];

export default function WorkspaceSettingsPage() {
  const [name, setName] = useState("Branddock Workspace");
  const [description, setDescription] = useState(
    "Our main workspace for brand management and content creation."
  );

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-dark">Workspace</h1>
        <p className="text-sm text-text-dark/40">
          Manage your workspace settings and brand assets
        </p>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Workspace Logo
          </h3>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-xl bg-surface-dark border-2 border-dashed border-border-dark flex items-center justify-center">
              <Upload className="w-6 h-6 text-text-dark/30" />
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload Logo
              </Button>
              <p className="text-xs text-text-dark/40">
                PNG, JPG or SVG. Max 2MB. Recommended 256x256px.
              </p>
            </div>
          </div>
        </Card>

        {/* Workspace Details */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-4">
            Details
          </h3>
          <div className="space-y-4">
            <Input
              label="Workspace Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
        </Card>

        {/* Default Brand Assets */}
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-text-dark mb-2">
            Default Brand Assets
          </h3>
          <p className="text-xs text-text-dark/40 mb-4">
            These brand asset types are automatically created for new projects.
          </p>
          <div className="flex flex-wrap gap-2">
            {defaultBrandAssets.map((asset) => (
              <Badge key={asset} variant="default" size="md" removable>
                {asset}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button variant="primary">Save Changes</Button>
        </div>

        {/* Danger Zone */}
        <Card padding="lg" className="border-red-500/30">
          <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-text-dark/40 mb-4">
            Permanently delete this workspace and all its data. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Workspace
          </Button>
        </Card>
      </div>
    </div>
  );
}
