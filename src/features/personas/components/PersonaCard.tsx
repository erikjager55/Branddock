"use client";

import {
  Calendar,
  MapPin,
  Building2,
  DollarSign,
  Users,
  GraduationCap,
  MessageCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { OptimizedImage } from "@/components/shared";
import { PersonaConfidenceBadge } from "./PersonaConfidenceBadge";
import type { PersonaWithMeta } from "../types/persona.types";
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
  income: DollarSign,
  familyStatus: Users,
  education: GraduationCap,
};

const LEFT_FIELDS = ["age", "occupation", "income"];
const RIGHT_FIELDS = ["location", "education", "familyStatus"];

export function PersonaCard({ persona, onClick, onChat }: PersonaCardProps) {
  const completedMethods = persona.researchMethods.filter(
    (m) => m.status === "COMPLETED" || m.status === "VALIDATED",
  ).length;

  const initials = persona.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
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
            <p className="line-clamp-2 text-sm text-gray-500">
              {persona.tagline}
            </p>
          )}
        </div>

        {/* Confidence Badge */}
        <div className="absolute right-0 top-0">
          <PersonaConfidenceBadge
            percentage={persona.validationPercentage}
          />
        </div>
      </div>

      {/* Demographic Fields — icon + value only, two columns */}
      {(leftDemos.length > 0 || rightDemos.length > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2">
          {/* Left column */}
          <div className="space-y-2">
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
          <div className="space-y-2">
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

      {/* Validation Methods — always visible section */}
      <div className="mb-3 border-t border-gray-100 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Validation Methods ({completedMethods}/{persona.researchMethods.length})</span>
        </div>
        <div className="space-y-1.5">
          {persona.researchMethods.map((m) => (
            <div
              key={m.method}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-gray-600">{m.method.replace("_", " ")}</span>
              {m.status === "COMPLETED" || m.status === "VALIDATED" ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <span className="text-gray-400">{m.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Last updated */}
      {persona.updatedAt && (
        <p className="text-[11px] text-gray-400">
          Last updated: {new Date(persona.updatedAt).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
