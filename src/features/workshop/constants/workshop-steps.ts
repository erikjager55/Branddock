export const WORKSHOP_STEPS_TEMPLATE = [
  { stepNumber: 1, title: 'Introduction & Warm-up', duration: '15 min', prompt: 'What brought you to this workshop today? What do you hope to achieve?' },
  { stepNumber: 2, title: 'Define the Core Purpose', duration: '30 min', prompt: 'Why does your organization exist beyond making a profit? What change do you want to see in the world?' },
  { stepNumber: 3, title: 'Identify Your Unique Approach', duration: '30 min', prompt: 'What makes your approach fundamentally different? How do you solve problems in ways others cannot?' },
  { stepNumber: 4, title: 'Map Customer Connections', duration: '20 min', prompt: 'What specific products or services do you offer? How do they address your customers\' most pressing challenges?' },
  { stepNumber: 5, title: 'Canvas Review & Refinement', duration: '20 min', prompt: 'Looking at the canvas, does this accurately represent your brand? What would you change or emphasize?' },
  { stepNumber: 6, title: 'Synthesis & Action Planning', duration: '15 min', prompt: 'What are the 3 most important things you learned today? What actions will you take in the next 30 days?' },
] as const;

export const TOTAL_WORKSHOP_STEPS = WORKSHOP_STEPS_TEMPLATE.length;
