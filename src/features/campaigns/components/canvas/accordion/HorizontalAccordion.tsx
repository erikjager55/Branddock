'use client';

import { useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { VerticalTab } from './VerticalTab';
import { Step1Context } from './Step1Context';
import { Step2ContentVariants } from './Step2ContentVariants';
import { Step3GenerateMedium } from './Step3GenerateMedium';
import { Step4Timeline } from './Step4Timeline';
import { FileText, Layers, Monitor, Calendar } from 'lucide-react';
import { ACCORDION } from '@/lib/constants/design-tokens';
import type { AccordionStepStatus, StepNumber } from '../../../types/accordion.types';
import type { LucideIcon } from 'lucide-react';

interface HorizontalAccordionProps {
  deliverableId: string;
}

const STEPS: { number: StepNumber; title: string; icon: LucideIcon }[] = [
  { number: 1, title: 'Review Context', icon: FileText },
  { number: 2, title: 'Content Variants', icon: Layers },
  { number: 3, title: 'Medium', icon: Monitor },
  { number: 4, title: 'Planner', icon: Calendar },
];

export function HorizontalAccordion({ deliverableId }: HorizontalAccordionProps) {
  const activeStep = useCanvasStore((s) => s.activeStep);
  const completedSteps = useCanvasStore((s) => s.completedSteps);
  const globalStatus = useCanvasStore((s) => s.globalStatus);

  // Auto-advance to step 2 when generation starts
  useEffect(() => {
    if (globalStatus === 'generating' && activeStep === 1) {
      useCanvasStore.getState().advanceToStep(2);
    }
  }, [globalStatus, activeStep]);

  const getStepStatus = useCallback(
    (stepNumber: StepNumber): AccordionStepStatus => {
      if (stepNumber === activeStep) return 'active';
      if (completedSteps.has(stepNumber)) return 'completed';
      return 'locked';
    },
    [activeStep, completedSteps],
  );

  const handleTabClick = useCallback((stepNumber: StepNumber) => {
    const store = useCanvasStore.getState();
    if (store.completedSteps.has(stepNumber) || stepNumber === store.activeStep) {
      store.goToStep(stepNumber);
    }
  }, []);

  const handleAdvance = useCallback((nextStep: StepNumber) => {
    useCanvasStore.getState().advanceToStep(nextStep);
  }, []);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentStep: StepNumber) => {
    const stepNumbers = STEPS.map((s) => s.number);
    const currentIndex = stepNumbers.indexOf(currentStep);
    let direction: 1 | -1 | null = null;
    let targetIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      direction = 1;
      targetIndex = (currentIndex + 1) % stepNumbers.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      direction = -1;
      targetIndex = (currentIndex - 1 + stepNumbers.length) % stepNumbers.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      direction = 1;
      targetIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      direction = -1;
      targetIndex = stepNumbers.length - 1;
    }

    if (targetIndex !== null && direction !== null) {
      const store = useCanvasStore.getState();
      let attempts = 0;
      while (attempts < stepNumbers.length) {
        const candidate = stepNumbers[targetIndex];
        if (candidate === store.activeStep || store.completedSteps.has(candidate)) {
          break;
        }
        targetIndex = (targetIndex + direction + stepNumbers.length) % stepNumbers.length;
        attempts++;
      }
      const targetStep = stepNumbers[targetIndex];
      const targetEl = document.getElementById(`canvas-step-tab-${targetStep}`);
      targetEl?.focus();
    }
  }, []);

  const activeStepConfig = STEPS.find((s) => s.number === activeStep);
  const ActiveIcon = activeStepConfig?.icon ?? FileText;

  const activeIndex = STEPS.findIndex((s) => s.number === activeStep);
  const precedingSteps = STEPS.slice(0, activeIndex);
  const followingSteps = STEPS.slice(activeIndex + 1);

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Preceding step tabs + active step tab (left side) */}
      <div className="flex flex-shrink-0 border-r border-gray-200" role="tablist" aria-orientation="vertical" aria-label="Content canvas steps">
        {precedingSteps.map((step) => (
          <VerticalTab
            key={step.number}
            stepNumber={step.number}
            title={step.title}
            icon={step.icon}
            status={getStepStatus(step.number)}
            onClick={() => handleTabClick(step.number)}
            onKeyDown={(e) => handleTabKeyDown(e, step.number)}
          />
        ))}
        <VerticalTab
          key={activeStepConfig?.number ?? 1}
          stepNumber={activeStepConfig?.number ?? (1 as StepNumber)}
          title={activeStepConfig?.title ?? ''}
          icon={activeStepConfig?.icon ?? FileText}
          status="active"
          onClick={() => {}}
          onKeyDown={(e) => handleTabKeyDown(e, activeStepConfig?.number ?? (1 as StepNumber))}
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
            {activeStepConfig?.title}
          </h2>
        </div>

        {/* Step content */}
        {activeStep === 1 && (
          <Step1Context deliverableId={deliverableId} />
        )}
        {activeStep === 2 && (
          <Step2ContentVariants
            deliverableId={deliverableId}
            onAdvance={() => handleAdvance(3)}
          />
        )}
        {activeStep === 3 && (
          <Step3GenerateMedium
            onAdvance={() => handleAdvance(4)}
            deliverableId={deliverableId}
          />
        )}
        {activeStep === 4 && (
          <Step4Timeline deliverableId={deliverableId} />
        )}
      </div>

      {/* Following step tabs (right side) */}
      {followingSteps.length > 0 && (
        <div className="flex flex-shrink-0 border-l border-gray-200">
          {followingSteps.map((step) => (
            <VerticalTab
              key={step.number}
              stepNumber={step.number}
              title={step.title}
              icon={step.icon}
              status={getStepStatus(step.number)}
              onClick={() => handleTabClick(step.number)}
              onKeyDown={(e) => handleTabKeyDown(e, step.number)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
