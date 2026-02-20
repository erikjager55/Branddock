"use client";

import { useState } from "react";
import { ArrowLeft, Users, X, Plus } from "lucide-react";
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
        {/* Back link */}
        <button
          data-testid="persona-back-link"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Personas
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Purple persona icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500">
              <Users className="h-5 w-5 text-white" />
            </div>

            {/* Editable name + tagline */}
            <div className="space-y-1 min-w-0">
              <input
                data-testid="persona-name-input"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter persona name"
                className="block w-full text-xl font-semibold text-gray-900 placeholder:text-gray-400 bg-transparent border-none outline-none focus:ring-0 p-0"
              />
              <input
                data-testid="persona-tagline-input"
                value={form.tagline ?? ""}
                onChange={(e) => updateField("tagline", e.target.value)}
                placeholder="Enter persona tagline"
                className="block w-full text-sm text-muted-foreground placeholder:text-muted-foreground/60 bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <Button
              data-testid="save-persona-button"
              variant="cta"
              icon={Plus}
              onClick={handleSave}
              disabled={!form.name.trim()}
              isLoading={createMutation.isPending}
            >
              Create Persona
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <PersonaFormTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div>
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
      </div>
    </PageShell>
  );
}
