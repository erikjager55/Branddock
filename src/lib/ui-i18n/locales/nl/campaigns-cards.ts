// Nederlandse UI-strings — `campaigns-cards` namespace.
// Data-gestuurde labels op de Aanmaken-kaarten (campagne- + content-kaarten):
// stoplicht-gereedheid, content-status, type-pill, kwaliteitsniveau.
const campaignsCards = {
  trafficLight: {
    completed: 'Voltooid',
    archived: 'Gearchiveerd',
    noContent: 'Geen content',
    inProgress: 'Bezig',
    percentComplete: '{{progress}}% klaar',
  },
  contentStatus: {
    published: 'Gepubliceerd',
    scheduled: 'Ingepland',
    ready: 'Klaar',
    notStarted: 'Niet gestart',
    needsReview: 'Controle nodig',
    inProgress: 'Bezig',
  },
  overdue: 'te laat',
  typePill: {
    creative: 'Creatief',
    strategic: 'Strategisch',
    format: 'Format',
    quick: 'Snel',
  },
  quality: {
    excellent: 'Uitstekend',
    good: 'Goed',
    needsWork: 'Kan beter',
  },
} as const;

export default campaignsCards;
