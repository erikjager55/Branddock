'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/shared';
import { useCreateStrategy } from '../hooks';
import { useBusinessStrategyStore } from '../stores/useBusinessStrategyStore';
import type { StrategyType, InitialObjective } from '../types/business-strategy.types';
import { WizardStepIndicator } from './wizard/WizardStepIndicator';
import { WizardStep1TypeName } from './wizard/WizardStep1TypeName';
import { WizardStep2Timeline } from './wizard/WizardStep2Timeline';
import { WizardStep3Objectives } from './wizard/WizardStep3Objectives';

// Step 2 vision is stored but sent in the body as `vision`


interface CreateStrategyModalProps {
  onNavigateToDetail?: (strategyId: string) => void;
}

export function CreateStrategyModal({ onNavigateToDetail }: CreateStrategyModalProps) {
  const { isCreateModalOpen, setCreateModalOpen, createWizardStep, setCreateWizardStep } =
    useBusinessStrategyStore();
  const createStrategy = useCreateStrategy();

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<StrategyType>('GROWTH');

  // Step 2
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  // Step 3
  const [objectives, setObjectives] = useState<InitialObjective[]>([]);

  // Template-applied vision (sent in body)
  const [vision, setVision] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('GROWTH');
    setStartDate('');
    setEndDate('');
    setFocusAreas([]);
    setObjectives([]);
    setVision('');
    setCreateWizardStep(1);
  };

  const handleApplyTemplate = (tmpl: {
    name: string;
    description: string;
    type: StrategyType;
    vision: string;
    focusAreas: string[];
    objectives: InitialObjective[];
  }) => {
    setName(tmpl.name);
    setDescription(tmpl.description);
    setType(tmpl.type);
    setVision(tmpl.vision);
    setFocusAreas(tmpl.focusAreas);
    setObjectives(tmpl.objectives);
  };

  const handleClose = () => {
    setCreateModalOpen(false);
    resetForm();
  };

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;

    // Filter out objectives without titles
    const validObjectives = objectives.filter((o) => o.title.trim());

    createStrategy.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        type,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        vision: vision.trim() || undefined,
        focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
        initialObjectives: validObjectives.length > 0 ? validObjectives : undefined,
      },
      {
        onSuccess: (data) => {
          handleClose();
          if (data?.strategy?.id) {
            onNavigateToDetail?.(data.strategy.id);
          }
        },
      },
    );
  };

  const isStep1Valid = name.trim().length > 0 && description.trim().length > 0;

  const handleNext = () => {
    if (createWizardStep < 3) {
      setCreateWizardStep(createWizardStep + 1);
    }
  };

  const handleBack = () => {
    if (createWizardStep > 1) {
      setCreateWizardStep(createWizardStep - 1);
    }
  };

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Choose Type & Name', subtitle: 'Select the strategy type and give it a name' },
    2: { title: 'Set Timeline', subtitle: 'Define the timeline and focus areas' },
    3: { title: 'Add Objectives', subtitle: 'Optionally add initial objectives' },
  };

  const { title, subtitle } = stepTitles[createWizardStep] ?? stepTitles[1];

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        <div className="flex justify-between">
          <div>
            {createWizardStep > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {createWizardStep < 3 ? (
              <Button
                variant="cta"
                onClick={handleNext}
                disabled={createWizardStep === 1 && !isStep1Valid}
              >
                Next
              </Button>
            ) : (
              <Button
                data-testid="create-strategy-submit"
                variant="cta"
                onClick={handleSubmit}
                disabled={!isStep1Valid || createStrategy.isPending}
                isLoading={createStrategy.isPending}
              >
                Create Strategy
              </Button>
            )}
          </div>
        </div>
      }
    >
      <WizardStepIndicator currentStep={createWizardStep} />

      {createWizardStep === 1 && (
        <WizardStep1TypeName
          name={name}
          description={description}
          type={type}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onTypeChange={setType}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

      {createWizardStep === 2 && (
        <WizardStep2Timeline
          startDate={startDate}
          endDate={endDate}
          focusAreas={focusAreas}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onFocusAreasChange={setFocusAreas}
        />
      )}

      {createWizardStep === 3 && (
        <WizardStep3Objectives
          objectives={objectives}
          onObjectivesChange={setObjectives}
        />
      )}
    </Modal>
  );
}
