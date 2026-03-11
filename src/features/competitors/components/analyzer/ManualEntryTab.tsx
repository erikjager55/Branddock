"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/shared";
import { useCreateCompetitor } from "../../hooks";
import { TIER_OPTIONS } from "../../constants/competitor-constants";

interface ManualEntryTabProps {
  onBack: () => void;
  onNavigateToDetail: (id: string) => void;
}

/** Manual entry form for adding a competitor */
export function ManualEntryTab({ onBack, onNavigateToDetail }: ManualEntryTabProps) {
  const createCompetitor = useCreateCompetitor();
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tier, setTier] = useState("DIRECT");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a competitor name");
      return;
    }

    createCompetitor
      .mutateAsync({
        name: name.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        tier: tier as "DIRECT" | "INDIRECT" | "ASPIRATIONAL",
        description: description.trim() || undefined,
        status: "DRAFT",
        source: "MANUAL",
      })
      .then((created) => {
        onNavigateToDetail(created.id);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to create competitor";
        setError(message);
      });
  };

  return (
    <div className="max-w-lg space-y-5">
      <Input
        label="Competitor name"
        placeholder="e.g. Acme Corp"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={!name.trim() && error ? "Name is required" : undefined}
      />

      <Input
        label="Website URL (optional)"
        placeholder="https://competitor.com"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
      />

      <Select
        label="Competitor tier"
        value={tier}
        onChange={(v) => setTier(v ?? "DIRECT")}
        options={TIER_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this competitor..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          Cancel
        </Button>
        <Button
          variant="cta"
          onClick={handleSubmit}
          isLoading={createCompetitor.isPending}
        >
          Create Competitor
        </Button>
      </div>
    </div>
  );
}
