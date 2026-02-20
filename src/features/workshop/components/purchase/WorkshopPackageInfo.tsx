"use client";

import { CheckCircle, Clock, Users, Monitor } from "lucide-react";
import { Card } from "@/components/shared";

const INCLUDED_ITEMS = [
  "6-step guided brand strategy workshop",
  "AI-generated executive summary & findings",
  "Golden Circle canvas output",
  "Participant response capture per step",
  "Actionable recommendations report",
  "Photo & notes documentation",
];

const SPECS = [
  { icon: Clock, label: "Duration", value: "~90 minutes" },
  { icon: Users, label: "Participants", value: "Up to 12" },
  { icon: Monitor, label: "Format", value: "In-person or virtual" },
];

export function WorkshopPackageInfo() {
  return (
    <Card padding="none">
      <Card.Header>
        <h2 className="text-xl font-semibold text-gray-900">
          Canvas Workshop
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          A facilitated brand strategy workshop combining proven frameworks with
          AI-powered analysis to uncover your brand&apos;s core identity.
        </p>
      </Card.Header>
      <Card.Body>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              What&apos;s Included
            </h3>
            <ul className="space-y-2">
              {INCLUDED_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-3 gap-4">
              {SPECS.map((spec) => (
                <div key={spec.label} className="text-center">
                  <spec.icon className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{spec.label}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
