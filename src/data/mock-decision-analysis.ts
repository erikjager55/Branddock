import { DecisionAnalysis } from '../types/decision-analysis';

export const mockDecisionAnalysis: DecisionAnalysis = {
  id: 'da-001',
  mainQuestion: 'Wat betekent deze analyse voor onze merkpositionering?',
  readiness: 'ready',
  readinessLabel: 'Beslisklaar – Laag risico',
  readinessDescription: 'Voldoende data en duidelijke richting. Je kunt nu een weloverwogen besluit nemen.',
  risks: [
    {
      id: 'r1',
      severity: 'low',
      category: 'Data kwaliteit',
      description: 'Analyse is gebaseerd op AI-exploratie zonder menselijke validatie',
      mitigation: 'Valideer met een stakeholder workshop (€199)'
    }
  ],
  decisionBlocks: [
    {
      id: 'db1',
      question: 'Wat is onze kernwaarde?',
      metric: {
        label: 'Brand coherentie',
        value: '87%',
        trend: 'up',
        status: 'good'
      },
      keyInsight: 'Innovatie en betrouwbaarheid komen consistent naar voren in alle analyses',
      implication: 'Je hebt een sterke basis voor merkpositionering met duidelijke differentiatie',
      recommendedAction: 'Focus op innovatie als primaire kernwaarde, ondersteund door betrouwbaarheid',
      confidence: 87
    },
    {
      id: 'db2',
      question: 'Wie is onze doelgroep?',
      metric: {
        label: 'Doelgroep match',
        value: '92%',
        trend: 'stable',
        status: 'good'
      },
      keyInsight: 'Tech-savvy professionals (25-45) met focus op efficiency en innovatie',
      implication: 'Duidelijk profiel maakt gerichte communicatie mogelijk',
      recommendedAction: 'Ontwikkel persona\'s en test messaging met interviews (€149)',
      confidence: 92
    },
    {
      id: 'db3',
      question: 'Wat is onze merkpersoonlijkheid?',
      metric: {
        label: 'Archetype helderheid',
        value: '78%',
        trend: 'down',
        status: 'warning'
      },
      keyInsight: 'Mix van "Innovator" en "Expert" archetype, niet volledig consistent',
      implication: 'Enige onduidelijkheid kan leiden tot verwarrende merkboodschappen',
      recommendedAction: 'Kies één primair archetype en valideer met questionnaire (€99)',
      confidence: 78
    },
    {
      id: 'db4',
      question: 'Hoe onderscheiden we ons?',
      metric: {
        label: 'Differentiatie score',
        value: '85%',
        trend: 'up',
        status: 'good'
      },
      keyInsight: 'Unieke combinatie van mensgerichte technologie en wetenschappelijke aanpak',
      implication: 'Sterke positionering mogelijk in een competitieve markt',
      recommendedAction: 'Formuleer merkbelofte die deze unieke combinatie benadrukt',
      confidence: 85
    }
  ],
  dataSource: {
    type: 'ai-analysis',
    date: '2026-01-13',
    assumptions: [
      'AI-analyse gebaseerd op input van 1 stakeholder',
      'Geen marktonderzoek of concurrent analyse uitgevoerd',
      'Aannames over doelgroep niet gevalideerd met echte gebruikers'
    ]
  },
  generatedAt: '2026-01-13T14:32:00Z'
};

// Mock for blocked state
export const mockBlockedAnalysis: DecisionAnalysis = {
  id: 'da-002',
  mainQuestion: 'Kunnen we onze merkstrategie nu finaliseren?',
  readiness: 'blocked',
  readinessLabel: 'Geblokkeerd – Hoog risico',
  readinessDescription: 'Te veel openstaande vragen en tegenstrijdige data. Meer onderzoek nodig voordat je een besluit kunt nemen.',
  risks: [
    {
      id: 'r1',
      severity: 'high',
      category: 'Tegenstrijdige data',
      description: 'Kernwaarden uit AI-analyse komen niet overeen met eerdere workshop',
      mitigation: 'Organiseer alignment sessie met key stakeholders'
    },
    {
      id: 'r2',
      severity: 'high',
      category: 'Onvolledige data',
      description: 'Doelgroep profiel is gebaseerd op aannames, niet op onderzoek',
      mitigation: 'Voer interviews uit met echte doelgroep (€149)'
    },
    {
      id: 'r3',
      severity: 'medium',
      category: 'Geen validatie',
      description: 'Merkpositionering niet getest met stakeholders',
      mitigation: 'Plan validatie workshop (€199)'
    }
  ],
  decisionBlocks: [
    {
      id: 'db1',
      question: 'Wat is onze kernwaarde?',
      metric: {
        label: 'Brand coherentie',
        value: '45%',
        trend: 'down',
        status: 'critical'
      },
      keyInsight: 'Tegenstrijdige input: AI zegt "innovatie", workshop zegt "betrouwbaarheid"',
      implication: 'Zonder helderheid krijg je inconsistente merkboodschappen',
      recommendedAction: 'Organiseer beslissessie met leadership team om kernwaarde vast te stellen',
      confidence: 45
    },
    {
      id: 'db2',
      question: 'Wie is onze doelgroep?',
      metric: {
        label: 'Doelgroep zekerheid',
        value: '38%',
        trend: 'stable',
        status: 'critical'
      },
      keyInsight: 'Geen validatie met echte doelgroep, alleen aannames',
      implication: 'Risico op verkeerde merkpositionering en verspilde marketing budget',
      recommendedAction: 'Start met 5-8 interviews met potentiële klanten',
      confidence: 38
    }
  ],
  dataSource: {
    type: 'ai-analysis',
    date: '2026-01-13',
    assumptions: [
      'AI-analyse gebaseerd op beperkte input',
      'Geen stakeholder alignment',
      'Doelgroep profiel niet gevalideerd'
    ]
  },
  generatedAt: '2026-01-13T14:32:00Z'
};

// Mock for uncertain state
export const mockUncertainAnalysis: DecisionAnalysis = {
  id: 'da-003',
  mainQuestion: 'Is onze merkarchetype keuze solide genoeg?',
  readiness: 'uncertain',
  readinessLabel: 'Onzeker – Gemiddeld risico',
  readinessDescription: 'Je hebt een richting, maar enkele onduidelijkheden kunnen leiden tot suboptimale beslissingen.',
  risks: [
    {
      id: 'r1',
      severity: 'medium',
      category: 'Beperkte data',
      description: 'Analyse gebaseerd op 1 data source, geen triangulatie',
      mitigation: 'Voeg een tweede onderzoeksmethode toe voor validatie'
    },
    {
      id: 'r2',
      severity: 'low',
      category: 'Aannames',
      description: 'Enkele aannames over doelgroep niet gevalideerd',
      mitigation: 'Test met questionnaire (€99) of interviews (€149)'
    }
  ],
  decisionBlocks: [
    {
      id: 'db1',
      question: 'Past "Innovator" archetype bij ons merk?',
      metric: {
        label: 'Archetype alignment',
        value: '72%',
        trend: 'stable',
        status: 'warning'
      },
      keyInsight: 'Innovator past goed, maar heeft overlap met "Expert" archetype',
      implication: 'Mogelijk onduidelijke merkpersoonlijkheid als je niet scherp kiest',
      recommendedAction: 'Definieer primair en secundair archetype, test met stakeholders',
      confidence: 72
    }
  ],
  dataSource: {
    type: 'ai-analysis',
    date: '2026-01-13',
    assumptions: [
      'Archetype keuze gebaseerd op AI-interpretatie',
      'Geen directe stakeholder input op archetype vraag'
    ]
  },
  generatedAt: '2026-01-13T14:32:00Z'
};
