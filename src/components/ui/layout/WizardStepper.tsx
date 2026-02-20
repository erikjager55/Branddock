import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants/design-tokens';

interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  /** Klik op stap om te navigeren (optioneel, alleen voor bezochte stappen) */
  onStepClick?: (index: number) => void;
  className?: string;
}

export function WizardStepper({ steps, currentStep, onStepClick, className }: WizardStepperProps) {
  return (
    <div className={cn('flex items-center w-full', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = onStepClick && index <= currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-initial">
            <button
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-3 group',
                isClickable && 'cursor-pointer'
              )}
            >
              {/* Step circle */}
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors',
                isCompleted && 'bg-primary text-white',
                isCurrent && 'bg-primary text-white ring-4 ring-primary/20',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}>
                {isCompleted ? (
                  <Check className={ICON_SIZES.sm} />
                ) : (
                  index + 1
                )}
              </div>
              {/* Step text */}
              <div className="hidden sm:block text-left">
                <p className={cn(
                  'text-sm font-medium',
                  (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </button>
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-4',
                isCompleted ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
