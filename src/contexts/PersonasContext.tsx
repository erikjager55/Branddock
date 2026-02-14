/**
 * Personas Context
 * 
 * Global state management for personas data.
 * Provides CRUD operations and persona-related queries.
 * Includes localStorage persistence.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Persona, ResearchMethodStatus } from '../types/persona';
import { mockPersonas } from '../data/mock-personas';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';
import { logger } from '../utils/logger';

// Migration helper: Convert old status values to new ones
function migratePersonaStatus(oldStatus: string): ResearchMethodStatus {
  switch (oldStatus) {
    case 'available': return 'not-started';
    case 'running': return 'in-progress';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    case 'locked': return 'cancelled';
    // Already correct values
    case 'not-started': return 'not-started';
    case 'in-progress': return 'in-progress';
    default: return 'not-started';
  }
}

// Migration helper: Update persona data to use correct status types
function migratePersonaData(personas: Persona[]): Persona[] {
  return personas.map(persona => ({
    ...persona,
    researchMethods: persona.researchMethods.map(method => ({
      ...method,
      status: migratePersonaStatus(method.status)
    }))
  }));
}

interface PersonasContextType {
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  getPersona: (id: string) => Persona | undefined;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  addPersona: (persona: Persona) => void;
  removePersona: (id: string) => void;
}

const PersonasContext = createContext<PersonasContextType | undefined>(undefined);

export function PersonasProvider({ children }: { children: ReactNode }) {
  const [personas, setPersonas] = useState<Persona[]>(() => {
    // Load from localStorage on mount
    const stored = loadFromStorage<Persona[]>(StorageKeys.PERSONAS, []);
    
    // If no stored data, use mock data
    if (stored.length === 0) {
      logger.info('No stored personas found, using mock data');
      return mockPersonas;
    }
    
    logger.info(`Loaded ${stored.length} personas from storage`);
    return migratePersonaData(stored);
  });

  // Persist to localStorage whenever personas changes
  useEffect(() => {
    if (personas && personas.length > 0) {
      saveToStorage(StorageKeys.PERSONAS, personas);
      logger.debug(`Persisted ${personas.length} personas`);
    }
  }, [personas]);

  const getPersona = (id: string): Persona | undefined => {
    return personas.find(persona => persona.id === id);
  };

  const updatePersona = (id: string, updates: Partial<Persona>) => {
    setPersonas(prev =>
      prev.map(persona =>
        persona.id === id ? { ...persona, ...updates } : persona
      )
    );
  };

  const addPersona = (persona: Persona) => {
    setPersonas(prev => [...prev, persona]);
  };

  const removePersona = (id: string) => {
    setPersonas(prev => prev.filter(persona => persona.id !== id));
  };

  return (
    <PersonasContext.Provider
      value={{
        personas,
        setPersonas,
        getPersona,
        updatePersona,
        addPersona,
        removePersona,
      }}
    >
      {children}
    </PersonasContext.Provider>
  );
}

export function usePersonas() {
  const context = useContext(PersonasContext);
  if (context === undefined) {
    throw new Error('usePersonas must be used within a PersonasProvider');
  }
  return context;
}