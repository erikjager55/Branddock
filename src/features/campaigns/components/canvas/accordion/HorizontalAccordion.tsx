'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { VerticalTab } from './VerticalTab';
import { Step1Context } from './Step1Context';
import { Step2ContentVariants } from './Step2ContentVariants';
import { Step3GenerateMedium } from './Step3GenerateMedium';
import { Step4Timeline } from './Step4Timeline';
import { FileText } from 'lucide-react';
import { ACCORDION } from '@/lib/constants/design-tokens';
import { getFlowForCategory, getNextStepId, type CanvasStepDefinition } from '../../../constants/canvas-flow-registry';
import type { AccordionStepStatus } from '../../../types/accordion.types';

interface HorizontalAccordionProps {
  deliverableId: string;
}

/** Maps step componentKey → React component */
function resolveStepComponent(componentKey: string) {
  switch (componentKey) {
    case 'context': return Step1Context;
    case 'variants': return Step2ContentVariants;
    case 'medium': return Step3GenerateMedium;
    case 'planner': return Step4Timeline;
    default: return Step1Context;
  }
}

export function HorizontalAccordion({ deliverableId }: HorizontalAccordionProps) {
  const activeStep = useCanvasStore((s) => s.activeStep);
  const completedSteps = useCanvasStore((s) => s.completedSteps);
  const globalStatus = useCanvasStore((s) => s.globalStatus);
  const mediumCategory = useCanvasStore((s) => s.mediumCategory);

  // Get the flow for the current medium category
  const steps = useMemo(() => getFlowForCategory(mediumCategory), [mediumCategory]);

  // Auto-advance to step 2 when generation starts
  useEffect(() => {
    if (globalStatus === 'generating' && activeStep === steps[0]?.id) {
      const nextId = steps[1]?.id;
      if (nextId) useCanvasStore.getState().advanceToStep(nextId);
    }
  }, [globalStatus, activeStep, steps]);

  const getStepStatus = useCallback(
    (stepId: string): AccordionStepStatus => {
      if (stepId === activeStep) return 'active';
      if (completedSteps.has(stepId)) return 'completed';
      // Steps VÓÓR de huidige active step zijn altijd bereikbaar voor
      // back-nav, zelfs als ze niet expliciet 'completed' zijn (advance-
      // flow markeert step 1 niet altijd). Treat ze als 'completed' voor
      // de visuele state + klik-affordance.
      const stepIds = steps.map((s) => s.id);
      const currentIdx = stepIds.indexOf(activeStep);
      const targetIdx = stepIds.indexOf(stepId);
      if (targetIdx >= 0 && currentIdx >= 0 && targetIdx < currentIdx) {
        return 'completed';
      }
      return 'locked';
    },
    [activeStep, completedSteps, steps],
  );

  const handleTabClick = useCallback((stepId: string) => {
    const store = useCanvasStore.getState();
    // Back-nav altijd toegestaan: elke step die VÓÓR de huidige activeStep
    // zit moet bereikbaar zijn ongeacht completedSteps-tracking. Anders kan
    // user nooit terug naar step 1 (Review Context) wanneer hij via 'advance'
    // op step 2 belandt zonder dat step 1 als completed gemarkeerd is.
    // Forward-nav blijft gated op completedSteps om premature skipping te
    // voorkomen.
    const stepIds = steps.map((s) => s.id);
    const currentIdx = stepIds.indexOf(store.activeStep);
    const targetIdx = stepIds.indexOf(stepId);
    const isBackNav = targetIdx >= 0 && currentIdx >= 0 && targetIdx < currentIdx;
    if (isBackNav || store.completedSteps.has(stepId) || stepId === store.activeStep) {
      store.goToStep(stepId);
    }
  }, [steps]);

  const handleAdvance = useCallback((nextStepId: string) => {
    useCanvasStore.getState().advanceToStep(nextStepId);
  }, []);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentStepId: string) => {
    const stepIds = steps.map((s) => s.id);
    const currentIndex = stepIds.indexOf(currentStepId);
    let direction: 1 | -1 | null = null;
    let targetIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      direction = 1;
      targetIndex = (currentIndex + 1) % stepIds.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      direction = -1;
      targetIndex = (currentIndex - 1 + stepIds.length) % stepIds.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      direction = 1;
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      direction = -1;
      targetIndex = stepIds.length - 1;
    }

    if (targetIndex !== null && direction !== null) {
      const store = useCanvasStore.getState();
      const currentIdx = stepIds.indexOf(store.activeStep);
      let attempts = 0;
      while (attempts < stepIds.length) {
        const candidateId = stepIds[targetIndex];
        // Match handleTabClick: back-nav altijd ok, anders alleen completed/active.
        const isBack = targetIndex >= 0 && currentIdx >= 0 && targetIndex < currentIdx;
        if (isBack || candidateId === store.activeStep || store.completedSteps.has(candidateId)) {
          break;
        }
        targetIndex = (targetIndex + direction + stepIds.length) % stepIds.length;
        attempts++;
      }
      const targetId = stepIds[targetIndex];
      const targetEl = document.getElementById(`canvas-step-tab-${targetId}`);
      targetEl?.focus();
    }
  }, [steps]);

  // Find active step in flow
  const activeIndex = steps.findIndex((s) => s.id === activeStep);
  const activeStepDef = activeIndex >= 0 ? steps[activeIndex] : steps[0];
  const ActiveIcon = activeStepDef?.icon ?? FileText;

  const precedingSteps = activeIndex > 0 ? steps.slice(0, activeIndex) : [];
  const followingSteps = activeIndex >= 0 ? steps.slice(activeIndex + 1) : [];

  // Resolve the component for the active step
  const StepComponent = resolveStepComponent(activeStepDef?.componentKey ?? 'context');

  // Build onAdvance callback: advance to the next step in the flow
  const nextStepId = activeStepDef ? getNextStepId(mediumCategory, activeStepDef.id) : null;

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Preceding step tabs + active step tab (left side) */}
      <div className="flex flex-shrink-0 border-r border-gray-200" role="tablist" aria-orientation="vertical" aria-label="Content canvas steps">
        {precedingSteps.map((step, idx) => (
          <VerticalTab
            key={step.id}
            stepId={step.id}
            stepNumber={idx + 1}
            title={step.title}
            icon={step.icon}
            status={getStepStatus(step.id)}
            onClick={() => handleTabClick(step.id)}
            onKeyDown={(e) => handleTabKeyDown(e, step.id)}
          />
        ))}
        <VerticalTab
          key={activeStepDef?.id ?? 'context'}
          stepId={activeStepDef?.id ?? 'context'}
          stepNumber={activeIndex >= 0 ? activeIndex + 1 : 1}
          title={activeStepDef?.title ?? ''}
          icon={activeStepDef?.icon ?? FileText}
          status="active"
          onClick={() => {}}
          onKeyDown={(e) => handleTabKeyDown(e, activeStepDef?.id ?? 'context')}
        />
      </div>

      {/* Content panel */}
      <div
        className={ACCORDION.content.panel}
        role="tabpanel"
        id="canvas-step-panel"
        aria-labelledby={`canvas-step-tab-${activeStep}`}
      >
        {/* Panel header */}
        <div className={ACCORDION.content.header}>
          <ActiveIcon className={ACCORDION.content.headerIcon} />
          <h2 className={ACCORDION.content.headerTitle}>
            {activeStepDef?.title}
          </h2>
        </div>

        {/* Step content — dynamically resolved */}
        <StepComponent
          deliverableId={deliverableId}
          onAdvance={nextStepId ? () => handleAdvance(nextStepId) : () => {}}
        />
      </div>

      {/* Following step tabs (right side) */}
      {followingSteps.length > 0 && (
        <div className="flex flex-shrink-0 border-l border-gray-200">
          {followingSteps.map((step, idx) => (
            <VerticalTab
              key={step.id}
              stepId={step.id}
              stepNumber={activeIndex + 2 + idx}
              title={step.title}
              icon={step.icon}
              status={getStepStatus(step.id)}
              onClick={() => handleTabClick(step.id)}
              onKeyDown={(e) => handleTabKeyDown(e, step.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
