import { WizardStepper } from 'branddock-app';

const campagneStappen = [
  { id: 'setup', label: 'Setup', description: 'Doel en doelgroep' },
  { id: 'briefing', label: 'Briefing', description: 'Boodschap en toon' },
  { id: 'strategie', label: 'Strategie', description: 'Kanalen en planning' },
  { id: 'deliverables', label: 'Deliverables', description: 'Wat er gemaakt wordt' },
];

export const EersteStap = () => <WizardStepper steps={campagneStappen} currentStep={0} />;

export const Halverwege = () => <WizardStepper steps={campagneStappen} currentStep={2} />;

export const LaatsteStap = () => (
  <WizardStepper steps={campagneStappen} currentStep={campagneStappen.length - 1} />
);

export const ZonderBeschrijving = () => (
  <WizardStepper
    steps={[
      { id: 'merk', label: 'Merk' },
      { id: 'stijl', label: 'Stijl' },
      { id: 'stem', label: 'Stem' },
    ]}
    currentStep={1}
  />
);
