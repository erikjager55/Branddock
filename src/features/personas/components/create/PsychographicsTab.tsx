"use client";

import { Target, AlertCircle, Heart, Sparkles } from "lucide-react";
import { RepeatableListInput } from "./RepeatableListInput";
import type { CreatePersonaBody } from "../../types/persona.types";

interface PsychographicsTabProps {
  form: CreatePersonaBody;
  onUpdate: <K extends keyof CreatePersonaBody>(
    key: K,
    value: CreatePersonaBody[K],
  ) => void;
}

export function PsychographicsTab({ form, onUpdate }: PsychographicsTabProps) {
  return (
    <div className="space-y-6">
      <RepeatableListInput
        label="Goals"
        description="What does this persona want to achieve?"
        icon={Target}
        items={form.goals ?? []}
        onChange={(items) => onUpdate("goals", items)}
        placeholder="Enter a goal..."
        addLabel="Add Goal"
      />

      <RepeatableListInput
        label="Frustrations"
        description="What challenges or pain points does this persona face?"
        icon={AlertCircle}
        items={form.frustrations ?? []}
        onChange={(items) => onUpdate("frustrations", items)}
        placeholder="Enter a frustration..."
        addLabel="Add Frustration"
      />

      <RepeatableListInput
        label="Motivations"
        description="What drives this persona's decisions and actions?"
        icon={Heart}
        items={form.motivations ?? []}
        onChange={(items) => onUpdate("motivations", items)}
        placeholder="Enter a motivation..."
        addLabel="Add Motivation"
      />

      <RepeatableListInput
        label="Values"
        description="What principles and beliefs are important to this persona?"
        icon={Sparkles}
        items={form.coreValues ?? []}
        onChange={(items) => onUpdate("coreValues", items)}
        placeholder="Enter a value..."
        addLabel="Add Value"
      />
    </div>
  );
}
