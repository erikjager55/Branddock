// Nederlandse UI-strings — `asset-content` namespace.
const ns = {
  simpleText: {
    title: 'Content',
    subtitle: 'Definieer de kerninhoud voor dit asset',
    placeholder: 'Voer content in...',
    empty: 'Nog geen content gedefinieerd. Klik op "Content bewerken" om content toe te voegen.',
  },
  thinkFeelAct: {
    dimensions: {
      think: {
        title: 'Denken',
        subtitle: 'Cognitief doel',
        description: 'Wat je wilt dat je publiek denkt en gelooft',
      },
      feel: {
        title: 'Voelen',
        subtitle: 'Emotioneel doel',
        description: 'De emoties die je bij je publiek wilt oproepen',
      },
      act: {
        title: 'Doen',
        subtitle: 'Gedragsdoel',
        description: 'De specifieke acties die je wilt aansturen',
      },
    },
    placeholder: '{{dimension}}-doel invoeren...',
    empty: 'Nog geen {{dimension}}-doel gedefinieerd.',
  },
  esg: {
    dimensions: {
      environmental: {
        title: 'Milieu',
        description: 'Duurzaamheid en ecologische impact',
      },
      social: {
        title: 'Sociaal',
        description: 'Maatschappelijke verantwoordelijkheid en impact op de gemeenschap',
      },
      governance: {
        title: 'Bestuur',
        description: 'Corporate governance en ethische praktijken',
      },
    },
    impact: {
      high: 'hoge impact',
      medium: 'gemiddelde impact',
      low: 'lage impact',
    },
    placeholder: '{{dimension}}-commitment invoeren...',
    empty: 'Nog geen {{dimension}}-commitment gedefinieerd.',
  },
} as const;

export default ns;
