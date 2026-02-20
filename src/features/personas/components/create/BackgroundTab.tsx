"use client";

import { Zap, Lightbulb } from "lucide-react";
import { RepeatableListInput } from "./RepeatableListInput";
import type { CreatePersonaBody } from "../../types/persona.types";

interface BackgroundTabProps {
  form: CreatePersonaBody;
  onUpdate: <K extends keyof CreatePersonaBody>(
    key: K,
    value: CreatePersonaBody[K],
  ) => void;
}

export function BackgroundTab({ form, onUpdate }: BackgroundTabProps) {
  return (
    <div className="space-y-6">
      <RepeatableListInput
        label="Behaviors"
        description="How does this persona typically act or behave?"
        icon={Zap}
        items={form.behaviors ?? []}
        onChange={(items) => onUpdate("behaviors", items)}
        placeholder="Enter a behavior..."
        addLabel="Add Behavior"
      />

      <RepeatableListInput
        label="Interests"
        description="What hobbies, topics, or activities interest this persona?"
        icon={Lightbulb}
        items={form.interests ?? []}
        onChange={(items) => onUpdate("interests", items)}
        placeholder="Enter an interest..."
        addLabel="Add Interest"
      />
    </div>
  );
}
