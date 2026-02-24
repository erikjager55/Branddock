'use client';

import { ShoppingCart, Zap, Scale, CheckCircle } from 'lucide-react';
import type { PersonaWithMeta, UpdatePersonaBody } from '../../types/persona.types';
import { RepeatableListInput } from '../create/RepeatableListInput';

interface BuyingTriggersSectionProps {
  persona: PersonaWithMeta;
  isEditing: boolean;
  onUpdate: (data: UpdatePersonaBody) => void;
}

export function BuyingTriggersSection({ persona, isEditing, onUpdate }: BuyingTriggersSectionProps) {
  const triggers = persona.buyingTriggers ?? [];
  const criteria = persona.decisionCriteria ?? [];

  // Hide empty section in view mode
  if (triggers.length === 0 && criteria.length === 0 && !isEditing) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Buying Triggers & Decision Criteria</h2>
            <p className="text-sm text-gray-500">What triggers action and influences decisions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Buying Triggers */}
          <div className="bg-orange-50/30 border border-orange-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Buying Triggers
              </p>
            </div>
            {isEditing ? (
              <RepeatableListInput
                items={triggers}
                onChange={(items) => onUpdate({ buyingTriggers: items })}
                placeholder="Add a trigger..."
              />
            ) : (
              <ul className="space-y-2">
                {triggers.map((trigger, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <span>{trigger}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Decision Criteria */}
          <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Scale className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Decision Criteria
              </p>
            </div>
            {isEditing ? (
              <RepeatableListInput
                items={criteria}
                onChange={(items) => onUpdate({ decisionCriteria: items })}
                placeholder="Add a criterion..."
              />
            ) : (
              <ul className="space-y-2">
                {criteria.map((criterion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      {/* Counts footer */}
      <div className="border-t border-gray-100 mt-4 pt-3">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-gray-400" />
            {triggers.length} triggers
          </span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-gray-400" />
            {criteria.length} criteria
          </span>
        </div>
      </div>
    </section>
  );
}
