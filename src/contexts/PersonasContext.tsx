import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { logger } from "../utils/logger";
import { fetchPersonas } from "../lib/api/personas";
import type { Persona } from "../types/persona";
import { useWorkspace } from "../hooks/use-workspace";

interface PersonasContextType {
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  getPersona: (id: string) => Persona | undefined;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  addPersona: (persona: Persona) => void;
  removePersona: (id: string) => void;
  isLoading: boolean;
}

const PersonasContext = createContext<PersonasContextType | undefined>(undefined);

export function PersonasProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      logger.info("No workspace available, showing empty personas");
      setPersonas([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchPersonas()
      .then((response) => {
        if (cancelled) return;
        logger.info(`Loaded ${response.personas.length} personas from API`);
        setPersonas(response.personas);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn("Personas API fetch failed:", error);
        setPersonas([]);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [workspaceId, wsLoading]);

  const getPersona = (id: string) => personas.find((p) => p.id === id);

  const updatePersona = (id: string, updates: Partial<Persona>) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addPersona = (persona: Persona) => {
    setPersonas((prev) => [...prev, persona]);
  };

  const removePersona = (id: string) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <PersonasContext.Provider
      value={{
        personas, setPersonas, getPersona, updatePersona,
        addPersona, removePersona, isLoading,
      }}
    >
      {children}
    </PersonasContext.Provider>
  );
}

export function usePersonas() {
  const context = useContext(PersonasContext);
  if (context === undefined) {
    throw new Error("usePersonas must be used within a PersonasProvider");
  }
  return context;
}
