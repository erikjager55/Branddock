import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { mockPersonas } from "../data/mock-personas";
import { saveToStorage, loadFromStorage, StorageKeys } from "../utils/storage";
import { logger } from "../utils/logger";
import { fetchPersonas } from "../lib/api/personas";
import { apiPersonasToMockFormat, type MockPersona } from "../lib/api/persona-adapter";

type ResearchMethodStatus = string;

function migratePersonaStatus(oldStatus: string): ResearchMethodStatus {
  switch (oldStatus) {
    case "available": return "not-started";
    case "running": return "in-progress";
    case "completed": return "completed";
    case "cancelled": return "cancelled";
    case "locked": return "cancelled";
    case "not-started": return "not-started";
    case "in-progress": return "in-progress";
    default: return "not-started";
  }
}

function migratePersonaData(personas: MockPersona[]): MockPersona[] {
  return personas.map((persona) => ({
    ...persona,
    researchMethods: persona.researchMethods.map((method) => ({
      ...method,
      status: migratePersonaStatus(method.status),
    })),
  }));
}

interface PersonasContextType {
  personas: MockPersona[];
  setPersonas: (personas: MockPersona[]) => void;
  getPersona: (id: string) => MockPersona | undefined;
  updatePersona: (id: string, updates: Partial<MockPersona>) => void;
  addPersona: (persona: MockPersona) => void;
  removePersona: (id: string) => void;
  dataSource: "api" | "mock";
  isLoading: boolean;
}

const PersonasContext = createContext<PersonasContextType | undefined>(undefined);

const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID;

export function PersonasProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState<MockPersona[]>(() => {
    const stored = loadFromStorage<MockPersona[]>(StorageKeys.PERSONAS, []);
    if (stored.length === 0) return mockPersonas as MockPersona[];
    return migratePersonaData(stored);
  });

  const [dataSource, setDataSource] = useState<"api" | "mock">("mock");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!WORKSPACE_ID) {
      logger.info("No WORKSPACE_ID configured, personas using mock data");
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchPersonas(WORKSPACE_ID)
      .then((response) => {
        if (cancelled) return;
        const mapped = apiPersonasToMockFormat(response.personas);
        logger.info(`Loaded ${mapped.length} personas from API`);
        setPersonas(mapped);
        setDataSource("api");
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn("Personas API fetch failed, keeping current data:", error);
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (dataSource === "mock" && personas && personas.length > 0) {
      saveToStorage(StorageKeys.PERSONAS, personas);
    }
  }, [personas, dataSource]);

  const getPersona = (id: string) => personas.find((p) => p.id === id);

  const updatePersona = (id: string, updates: Partial<MockPersona>) => {
    setPersonas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addPersona = (persona: MockPersona) => {
    setPersonas((prev) => [...prev, persona]);
  };

  const removePersona = (id: string) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <PersonasContext.Provider
      value={{
        personas, setPersonas, getPersona, updatePersona,
        addPersona, removePersona, dataSource, isLoading,
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
