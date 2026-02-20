"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronUp, FlaskConical, Info, Users, Target } from "lucide-react";

export function WhatArePersonasPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-gray-700">
            What are Personas?
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Learn More
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold border border-border rounded-full px-2 py-0.5">User-Centered</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-500">
                Research-based representations of your real target audience segments.
              </p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold border border-border rounded-full px-2 py-0.5">Strategic Tool</span>
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-500">
                Guide brand strategy, product decisions, and marketing campaigns.
              </p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold border border-border rounded-full px-2 py-0.5">Living Documents</span>
                <FlaskConical className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-500">
                Continuously validated and improved through ongoing research.
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800 mb-2">Why Personas Matter</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">
                  Personas combine demographic data, psychographic insights, goals, and motivations to create a vivid picture of who your customers are.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">
                  They help teams make confident, user-centered decisions across brand strategy, product development, and marketing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
