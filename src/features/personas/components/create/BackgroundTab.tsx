"use client";

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
      {/* Frustrations */}
      <RepeatableListInput
        label="Frustrations"
        items={form.frustrations ?? []}
        onChange={(items) => onUpdate("frustrations", items)}
        placeholder="Add a frustration..."
      />

      {/* Behaviors */}
      <RepeatableListInput
        label="Behaviors"
        items={form.behaviors ?? []}
        onChange={(items) => onUpdate("behaviors", items)}
        placeholder="Add a behavior..."
      />
    </div>
  );
}
