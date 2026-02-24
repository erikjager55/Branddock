"use client";

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Building2,
  Euro,
  Users,
  GraduationCap,
  MessageCircle,
  CheckCircle,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Mic,
  FlaskConical,
  Plus,
} from "lucide-react";
import { OptimizedImage } from "@/components/shared";
import type { PersonaWithMeta, PersonaResearchMethodType } from "../types/persona.types";
import type { LucideIcon } from "lucide-react";

interface PersonaCardProps {
  persona: PersonaWithMeta;
  onClick?: () => void;
  onChat?: () => void;
}

const DEMO_ICONS: Record<string, LucideIcon> = {
  age: Calendar,
  location: MapPin,
  occupation: Building2,
  income: Euro,
  familyStatus: Users,
  education: GraduationCap,
};

const METHOD_CONFIG: Record<PersonaResearchMethodType, { icon: LucideIcon; label: string; description: string; priceLabel?: string }> = {
  AI_EXPLORATION: {
    icon: Sparkles,
    label: "AI Exploration",
    description: "AI-assisted analysis and ideation for brand strategy",
    priceLabel: "FREE",
  },
  INTERVIEWS: {
    icon: Mic,
    label: "Interviews",
    description: "One-on-one deep-dive interviews with key stakeholders and customers",
  },
  QUESTIONNAIRE: {
    icon: ClipboardList,
    label: "Questionnaire",
    description: "Comprehensive surveys distributed to broader audience for quantitative insights",
    priceLabel: "From $500",
  },
  USER_TESTING: {
    icon: FlaskConical,
    label: "User Testing",
    description: "Observe users interacting with product to validate assumptions",
  },
};

const LEFT_FIELDS = ["age", "occupation", "income"];
const RIGHT_FIELDS = ["location", "education", "familyStatus"];

export function PersonaCard({ persona, onClick, onChat }: PersonaCardProps) {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED",
  ).length;

  const initials = persona.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Profile completeness calculation
  const profileFields = [
    persona.name, persona.tagline, persona.avatarUrl,
    persona.age, persona.gender, persona.location, persona.occupation,
    persona.education, persona.income, persona.familyStatus,
    persona.personalityType,
    (persona.coreValues?.length ?? 0) > 0 ? 'filled' : null,
    (persona.interests?.length ?? 0) > 0 ? 'filled' : null,
    (persona.goals?.length ?? 0) > 0 ? 'filled' : null,
    (persona.motivations?.length ?? 0) > 0 ? 'filled' : null,
    (persona.frustrations?.length ?? 0) > 0 ? 'filled' : null,
    (persona.behaviors?.length ?? 0) > 0 ? 'filled' : null,
    persona.quote, persona.bio,
    persona.strategicImplications,
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

  // Validation score: based on research methods
  const totalMethods = persona.researchMethods.length || 1;
  const validationScore = Math.round((completedMethods / totalMethods) * 100);

  const allFields: Record<string, string | null | undefined> = {
    age: persona.age,
    location: persona.location,
    occupation: persona.occupation,
    income: persona.income,
    familyStatus: persona.familyStatus,
    education: persona.education,
  };

  const leftDemos = LEFT_FIELDS.map((key) => ({ key, value: allFields[key] })).filter((f) => f.value);
  const rightDemos = RIGHT_FIELDS.map((key) => ({ key, value: allFields[key] })).filter((f) => f.value);

  return (
    <div
      data-testid={`persona-card-${persona.id}`}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:shadow-md hover:border-emerald-200"
      onClick={onClick}
    >
      {/* Header */}
      <div className="relative mb-4 flex items-start gap-4">
        {/* Avatar */}
        <OptimizedImage
          src={persona.avatarUrl}
          alt={persona.name}
          avatar="lg"
          className="ring-2 ring-white"
          fallback={
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700 ring-2 ring-white">
              {initials}
            </div>
          }
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">
            {persona.name}
          </h3>
          {persona.tagline && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {persona.tagline}
            </p>
          )}
        </div>

        {/* Completeness + Validation Badges */}
        <div className="absolute right-0 top-0 flex items-center gap-1.5">
          <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            profileCompleteness >= 80 ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
            profileCompleteness >= 50 ? 'border-amber-200 text-amber-600 bg-amber-50' :
            'border-red-200 text-red-500 bg-red-50'
          }`}>
            {profileCompleteness}% complete
          </div>
          <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            validationScore >= 80 ? 'border-emerald-200 text-emerald-600 bg-emerald-50' :
            validationScore >= 50 ? 'border-amber-200 text-amber-600 bg-amber-50' :
            'border-gray-200 text-gray-500 bg-gray-50'
          }`}>
            {validationScore}% validated
          </div>
        </div>
      </div>

      {/* Demographic Fields — icon + value only, two columns */}
      {(leftDemos.length > 0 || rightDemos.length > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {/* Left column */}
          <div className="space-y-3">
            {leftDemos.map(({ key, value }) => {
              const Icon = DEMO_ICONS[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                  <span className="truncate text-xs text-gray-700">{value}</span>
                </div>
              );
            })}
          </div>
          {/* Right column */}
          <div className="space-y-3">
            {rightDemos.map(({ key, value }) => {
              const Icon = DEMO_ICONS[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                  <span className="truncate text-xs text-gray-700">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Button — outline, left-aligned */}
      <div className="mb-3">
        <button
          data-testid={`persona-chat-button-${persona.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onChat?.();
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Chat with {persona.name.split(" ")[0]}
        </button>
      </div>

      {/* Validation Methods — Accordion */}
      <div className="mb-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between py-2"
          onClick={(e) => {
            e.stopPropagation();
            setIsAccordionOpen(!isAccordionOpen);
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Validation Methods ({completedMethods}/{persona.researchMethods.length})</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isAccordionOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Accordion content — conditional render for reliability */}
        {isAccordionOpen && (
          <div className="mt-2 space-y-2">
            {persona.researchMethods
            .filter((m) => {
              // When locked, hide non-started methods
              if (!persona.isLocked) return true;
              return m.status === "COMPLETED" || m.status === "VALIDATED" || m.status === "IN_PROGRESS";
            })
            .map((m) => {
              const config = METHOD_CONFIG[m.method as PersonaResearchMethodType];
              if (!config) return null;
              const MethodIcon = config.icon;
              const isValidated = m.status === "COMPLETED" || m.status === "VALIDATED";

              return (
                <div
                  key={m.method}
                  className={`rounded-lg p-3 ${
                    isValidated
                      ? "border border-emerald-200 bg-emerald-50/30"
                      : "border border-dashed border-gray-300"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        isValidated ? "bg-emerald-100" : "bg-gray-100"
                      }`}>
                        <MethodIcon className={`h-4 w-4 ${
                          isValidated ? "text-emerald-600" : "text-gray-400"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900">
                          {config.label}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                          {config.description}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {isValidated ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle className="h-3 w-3" />
                            VALIDATED
                          </span>
                          <span className="text-[10px] font-medium text-emerald-600 hover:underline cursor-pointer">
                            View Results
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            <Plus className="h-3 w-3" />
                            AVAILABLE
                          </span>
                          {config.priceLabel && (
                            <span className="text-[10px] text-gray-400">
                              {config.priceLabel}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Last updated */}
      {persona.updatedAt && (
        <p className="text-xs text-gray-400">
          Last updated: {new Date(persona.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
