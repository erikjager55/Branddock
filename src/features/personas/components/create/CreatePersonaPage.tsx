"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/shared";
import { PageShell } from "@/components/ui/layout";
import { useCreatePersona } from "../../hooks";
import { PersonaFormTabs } from "./PersonaFormTabs";
import { OverviewTab } from "./OverviewTab";
import { PsychographicsTab } from "./PsychographicsTab";
import { BackgroundTab } from "./BackgroundTab";
import type { CreatePersonaBody } from "../../types/persona.types";

interface CreatePersonaPageProps {
  onBack?: () => void;
  onCreated?: (personaId: string) => void;
}

export function CreatePersonaPage({
  onBack,
  onCreated,
}: CreatePersonaPageProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "psychographics" | "background"
  >("overview");

  const [form, setForm] = useState<CreatePersonaBody>({
    name: "",
    tagline: "",
    age: "",
    gender: "",
    location: "",
    occupation: "",
    education: "",
    income: "",
    familyStatus: "",
    personalityType: "",
    coreValues: [],
    interests: [],
    goals: [],
    motivations: [],
    frustrations: [],
    behaviors: [],
  });

  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const createMutation = useCreatePersona();

  const updateField = <K extends keyof CreatePersonaBody>(
    key: K,
    value: CreatePersonaBody[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;

    // Clean up empty strings
    const data: CreatePersonaBody = { name: form.name };
    if (form.tagline) data.tagline = form.tagline;
    if (form.age) data.age = form.age;
    if (form.gender) data.gender = form.gender;
    if (form.location) data.location = form.location;
    if (form.occupation) data.occupation = form.occupation;
    if (form.education) data.education = form.education;
    if (form.income) data.income = form.income;
    if (form.familyStatus) data.familyStatus = form.familyStatus;
    if (form.personalityType) data.personalityType = form.personalityType;
    if (form.coreValues?.length) data.coreValues = form.coreValues;
    if (form.interests?.length) data.interests = form.interests;
    if (form.goals?.length) data.goals = form.goals;
    if (form.motivations?.length) data.motivations = form.motivations;
    if (form.frustrations?.length) data.frustrations = form.frustrations;
    if (form.behaviors?.length) data.behaviors = form.behaviors;

    createMutation.mutate(data, {
      onSuccess: (result) => {
        onCreated?.(result.persona.id);
      },
    });
  };

  return (
    <PageShell maxWidth="5xl">
      <div data-testid="create-persona-page" className="space-y-6">
        {/* Breadcrumb */}
        <button
          data-testid="persona-back-link"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Personas
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Persona
          </h1>
          <p className="text-sm text-gray-500">
            Define a research-based audience representation
          </p>
        </div>

        {/* Tabs */}
        <PersonaFormTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {activeTab === "overview" && (
            <OverviewTab
              form={form}
              avatarUrl={avatarUrl}
              onUpdate={updateField}
              onAvatarChange={setAvatarUrl}
            />
          )}
          {activeTab === "psychographics" && (
            <PsychographicsTab form={form} onUpdate={updateField} />
          )}
          {activeTab === "background" && (
            <BackgroundTab form={form} onUpdate={updateField} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button
            data-testid="save-persona-button"
            variant="cta"
            onClick={handleSave}
            disabled={!form.name.trim()}
            isLoading={createMutation.isPending}
          >
            Save Persona
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
