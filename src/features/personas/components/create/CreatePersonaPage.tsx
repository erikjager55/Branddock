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
  const onCreatedRef = useRef(onCreated);
  const onBackRef = useRef(onBack);

  // Keep refs in sync with latest props
  onCreatedRef.current = onCreated;
  onBackRef.current = onBack;

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    async function create() {
      try {
        const result = await createMutation.mutateAsync({ name: "New Persona" });
        onCreatedRef.current?.(result.persona.id);
      } catch {
        onBackRef.current?.();
      }
    }

    create();
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
