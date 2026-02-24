"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/ui/layout";
import { useCreatePersona } from "../../hooks";

interface CreatePersonaPageProps {
  onBack?: () => void;
  onCreated?: (personaId: string) => void;
}

/**
 * CreatePersonaPage — instantly creates a blank persona and redirects to detail page.
 * The detail page in edit mode serves as the actual editor.
 */
export function CreatePersonaPage({ onBack, onCreated }: CreatePersonaPageProps) {
  const createMutation = useCreatePersona();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    createMutation.mutate(
      { name: "New Persona" },
      {
        onSuccess: (result) => {
          onCreated?.(result.persona.id);
        },
        onError: () => {
          // If creation fails, go back to overview
          onBack?.();
        },
      },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageShell maxWidth="5xl">
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        <p className="text-sm text-gray-500">Creating persona...</p>
      </div>
    </PageShell>
  );
}
