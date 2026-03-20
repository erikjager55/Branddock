import { jsPDF } from 'jspdf';
import type {
  CampaignBlueprint,
  StrategyLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  AssetPlanLayer,
  PersonaValidationResult,
  StrategicChoice,
  PrepDeliverable,
} from '@/lib/campaigns/strategy-blueprint.types';

const INTENT_LABELS: Record<string, string> = {
  brand_building: 'Brand Building',
  sales_activation: 'Sales Activation',
  hybrid: 'Hybrid',
};

const PRIORITY_LABELS: Record<string, string> = {
  'must-have': 'Must-Have',
  'should-have': 'Should-Have',
  'nice-to-have': 'Nice-to-Have',
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const ROLE_LABELS: Record<string, string> = {
  hero: 'Hero',
  hub: 'Hub',
  hygiene: 'Hygiene',
};

interface CampaignStrategyExportData {
  campaignName: string;
  campaignGoalType?: string;
  blueprint: CampaignBlueprint;
  confidence: number | null;
  generatedAt: string | null;
}

/** Safe string coercion */
function s(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return '';
}

/** Export Campaign Strategy Blueprint as a professionally formatted PDF */
export function exportCampaignStrategyPdf(data: CampaignStrategyExportData) {
  try {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const addSectionHeader = (title: string, color: [number, number, number]) => {
    checkPageBreak(14);
    doc.setTextColor(...color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 7;
  };

  const addField = (label: string, value: string) => {
    if (!value) return;
    checkPageBreak(10);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 2, y);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text(value, margin + 50, y);
    y += 5;
  };

  const addWrappedText = (text: string, indent = 2) => {
    if (!text) return;
    checkPageBreak(8);
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    checkPageBreak(lines.length * 4);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4 + 2;
  };

  const addList = (items: string[], indent = 4) => {
    items.forEach((item) => {
      if (!item) return;
      checkPageBreak(6);
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(`\u2022 ${item}`, contentWidth - indent);
      checkPageBreak(lines.length * 4);
      doc.text(lines, margin + indent, y);
      y += lines.length * 4;
    });
    y += 2;
  };

  const { blueprint } = data;

  // ── Header bar ──
  doc.setFillColor(124, 58, 237); // violet-600
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BRANDDOCK', margin, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Campaign Strategy Blueprint', pageWidth - margin, 9, { align: 'right' });
  y = 24;

  // ── Title ──
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.campaignName, margin, y);
  y += 8;

  // ── Metadata ──
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const genDate = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US');
  const confText = data.confidence != null ? `${Math.round(data.confidence)}% Confidence` : '';
  const goalText = data.campaignGoalType ? `Goal: ${data.campaignGoalType}` : '';
  const metaParts = [genDate, confText, goalText].filter(Boolean).join('  |  ');
  doc.text(metaParts, margin, y);
  y += 8;

  // ── Divider ──
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── Confidence Score ──
  if (data.confidence != null) {
    checkPageBreak(20);
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(data.confidence)}%`, margin, y + 8);
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Strategy Confidence', margin + 40, y + 2);

    // Stats
    doc.setFontSize(9);
    const phaseCount = blueprint.architecture?.journeyPhases?.length ?? 0;
    const channelCount = blueprint.channelPlan?.channels?.length ?? 0;
    const deliverableCount = blueprint.assetPlan?.totalDeliverables ?? 0;
    const personaCount = blueprint.personaValidation?.length ?? 0;
    doc.text(`Phases: ${phaseCount}  |  Channels: ${channelCount}  |  Deliverables: ${deliverableCount}  |  Personas: ${personaCount}`, margin + 40, y + 8);
    y += 18;

    // Confidence breakdown per layer
    if (blueprint.confidenceBreakdown && Object.keys(blueprint.confidenceBreakdown).length > 0) {
      checkPageBreak(10);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Confidence Breakdown', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const breakdownParts = Object.entries(blueprint.confidenceBreakdown)
        .map(([key, val]) => `${key}: ${Math.round(val)}%`)
        .join('  |  ');
      doc.text(breakdownParts, margin, y);
      y += 6;
    }

    // Variant A/B comparison scores
    if (blueprint.variantAScore != null || blueprint.variantBScore != null) {
      checkPageBreak(8);
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Variant Comparison', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const variantParts = [
        blueprint.variantAScore != null ? `Variant A: ${Math.round(blueprint.variantAScore)}` : null,
        blueprint.variantBScore != null ? `Variant B: ${Math.round(blueprint.variantBScore)}` : null,
      ].filter(Boolean).join('  |  ');
      doc.text(variantParts, margin, y);
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 1: Strategic Overview
  // ═══════════════════════════════════════════════════════════
  if (blueprint.strategy) {
    const st: StrategyLayer = blueprint.strategy;

    addSectionHeader('Strategic Overview', [124, 58, 237]);

    addField('Intent', INTENT_LABELS[st.strategicIntent] ?? s(st.strategicIntent));
    if (st.intentRatio) {
      addField('Ratio', `Brand ${st.intentRatio.brand}% / Activation ${st.intentRatio.activation}%`);
    }
    addField('Theme', s(st.campaignTheme));
    y += 2;

    // Positioning
    if (st.positioningStatement) {
      checkPageBreak(12);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Positioning Statement', margin + 2, y);
      y += 5;
      addWrappedText(st.positioningStatement);
    }

    // Messaging Hierarchy
    if (st.messagingHierarchy) {
      checkPageBreak(12);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Messaging Hierarchy', margin + 2, y);
      y += 5;
      addField('Brand Message', s(st.messagingHierarchy.brandMessage));
      addField('Campaign Message', s(st.messagingHierarchy.campaignMessage));
      if (st.messagingHierarchy.proofPoints?.length) {
        checkPageBreak(6);
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.text('Proof Points', margin + 2, y);
        y += 4;
        addList(st.messagingHierarchy.proofPoints);
      }
    }

    // JTBD Framing
    if (st.jtbdFraming) {
      checkPageBreak(12);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Jobs To Be Done', margin + 2, y);
      y += 5;
      addField('Job Statement', s(st.jtbdFraming.jobStatement));
      addField('Functional', s(st.jtbdFraming.functionalJob));
      addField('Emotional', s(st.jtbdFraming.emotionalJob));
      addField('Social', s(st.jtbdFraming.socialJob));
    }

    // Strategic Choices
    if (st.strategicChoices?.length) {
      checkPageBreak(12);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Strategic Choices', margin + 2, y);
      y += 5;

      st.strategicChoices.forEach((choice) => {
        if (typeof choice === 'string') {
          addWrappedText(choice);
        } else {
          const sc = choice as StrategicChoice;
          checkPageBreak(16);
          doc.setTextColor(17, 24, 39);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(s(sc.choice), margin + 4, y);
          y += 4;
          if (sc.rationale) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(55, 65, 81);
            const lines = doc.splitTextToSize(`Rationale: ${sc.rationale}`, contentWidth - 6);
            checkPageBreak(lines.length * 4);
            doc.text(lines, margin + 4, y);
            y += lines.length * 4;
          }
          if (sc.tradeoff) {
            doc.setTextColor(156, 163, 175);
            doc.setFontSize(8);
            const lines = doc.splitTextToSize(`Trade-off: ${sc.tradeoff}`, contentWidth - 6);
            checkPageBreak(lines.length * 4);
            doc.text(lines, margin + 4, y);
            y += lines.length * 4;
          }
          y += 2;
        }
      });
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 2: Persona Validation
  // ═══════════════════════════════════════════════════════════
  if (blueprint.personaValidation?.length) {
    addSectionHeader('Persona Validation', [219, 39, 119]); // pink-600

    blueprint.personaValidation.forEach((pv: PersonaValidationResult) => {
      checkPageBreak(30);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s(pv.personaName), margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Score: ${pv.overallScore}/10  |  Preferred: Variant ${s(pv.preferredVariant)}`, margin + 60, y);
      y += 5;

      if (pv.feedback) {
        addWrappedText(pv.feedback, 4);
      }

      if (pv.resonates?.length) {
        checkPageBreak(6);
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Resonates', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        addList(pv.resonates, 6);
      }

      if (pv.concerns?.length) {
        checkPageBreak(6);
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Concerns', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        addList(pv.concerns, 6);
      }

      if (pv.suggestions?.length) {
        checkPageBreak(6);
        doc.setTextColor(59, 130, 246);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Suggestions', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        addList(pv.suggestions, 6);
      }
      y += 2;
    });
    y += 2;
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 3: Journey Map
  // ═══════════════════════════════════════════════════════════
  if (blueprint.architecture?.journeyPhases?.length) {
    const arch: ArchitectureLayer = blueprint.architecture;

    addSectionHeader('Journey Map', [37, 99, 235]); // blue-600

    if (arch.campaignType) {
      addField('Campaign Type', s(arch.campaignType));
      y += 2;
    }

    arch.journeyPhases
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .forEach((phase) => {
        checkPageBreak(20);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Phase ${(phase.orderIndex ?? 0) + 1}: ${s(phase.name)}`, margin + 2, y);
        y += 5;

        if (phase.description) addWrappedText(phase.description, 4);
        if (phase.goal) addField('Goal', s(phase.goal));

        if (phase.kpis?.length) {
          checkPageBreak(6);
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.text('KPIs', margin + 4, y);
          y += 4;
          addList(phase.kpis, 6);
        }

        // Persona Phase Data
        if (phase.personaPhaseData?.length) {
          checkPageBreak(8);
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`Persona Insights (${phase.personaPhaseData.length})`, margin + 4, y);
          y += 4;

          phase.personaPhaseData.forEach((ppd) => {
            checkPageBreak(16);
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(s(ppd.personaName), margin + 6, y);
            y += 4;
            doc.setFont('helvetica', 'normal');

            if (ppd.mindset) {
              doc.setTextColor(107, 114, 128);
              doc.setFontSize(8);
              doc.text('Mindset', margin + 6, y);
              y += 3.5;
              doc.setTextColor(55, 65, 81);
              doc.setFontSize(9);
              const mindsetLines = doc.splitTextToSize(ppd.mindset, contentWidth - 10);
              checkPageBreak(mindsetLines.length * 3.5);
              doc.text(mindsetLines, margin + 8, y);
              y += mindsetLines.length * 3.5 + 1;
            }

            if (ppd.keyQuestion) {
              doc.setTextColor(107, 114, 128);
              doc.setFontSize(8);
              doc.text('Key Question', margin + 6, y);
              y += 3.5;
              doc.setTextColor(55, 65, 81);
              doc.setFontSize(9);
              const qLines = doc.splitTextToSize(ppd.keyQuestion, contentWidth - 10);
              checkPageBreak(qLines.length * 3.5);
              doc.text(qLines, margin + 8, y);
              y += qLines.length * 3.5 + 1;
            }

            if (ppd.needs?.length) {
              doc.setTextColor(107, 114, 128);
              doc.setFontSize(8);
              doc.text('Needs', margin + 6, y);
              y += 3.5;
              addList(ppd.needs, 8);
            }

            if (ppd.painPoints?.length) {
              doc.setTextColor(107, 114, 128);
              doc.setFontSize(8);
              doc.text('Pain Points', margin + 6, y);
              y += 3.5;
              addList(ppd.painPoints, 8);
            }

            if (ppd.triggers?.length) {
              doc.setTextColor(107, 114, 128);
              doc.setFontSize(8);
              doc.text('Triggers', margin + 6, y);
              y += 3.5;
              addList(ppd.triggers, 8);
            }
            y += 2;
          });
        }

        // Touchpoints
        if (phase.touchpoints?.length) {
          checkPageBreak(8);
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`Touchpoints (${phase.touchpoints.length})`, margin + 4, y);
          y += 4;
          doc.setFont('helvetica', 'normal');

          phase.touchpoints.forEach((tp) => {
            checkPageBreak(10);
            doc.setTextColor(17, 24, 39);
            doc.setFontSize(9);
            doc.text(`${s(tp.channel)} \u2014 ${s(tp.contentType)} (${s(tp.role)})`, margin + 6, y);
            y += 4;
            if (tp.message) {
              doc.setTextColor(107, 114, 128);
              const lines = doc.splitTextToSize(tp.message, contentWidth - 10);
              checkPageBreak(lines.length * 3.5);
              doc.text(lines, margin + 6, y);
              y += lines.length * 3.5 + 1;
            }
          });
        }
        y += 4;
      });
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 4: Channel & Media Plan
  // ═══════════════════════════════════════════════════════════
  if (blueprint.channelPlan?.channels?.length) {
    const cp: ChannelPlanLayer = blueprint.channelPlan;

    addSectionHeader('Channel & Media Plan', [5, 150, 105]); // emerald-600

    if (cp.timingStrategy) {
      addWrappedText(cp.timingStrategy);
      y += 2;
    }

    cp.channels
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .forEach((ch) => {
        checkPageBreak(18);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(s(ch.name), margin + 2, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        const roleBadge = ROLE_LABELS[ch.role] ?? s(ch.role);
        const budgetBadge = s(ch.budgetAllocation).toUpperCase();
        doc.text(`${roleBadge}  |  Budget: ${budgetBadge}`, margin + 60, y);
        y += 5;

        if (ch.objective) addWrappedText(ch.objective, 4);

        if (ch.targetPersonas?.length) {
          addField('Target Personas', ch.targetPersonas.join(', '));
        }

        if (ch.contentMix?.length) {
          checkPageBreak(6);
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.text('Content Mix', margin + 4, y);
          y += 4;
          ch.contentMix.forEach((cm) => {
            checkPageBreak(5);
            doc.setTextColor(55, 65, 81);
            doc.setFontSize(9);
            doc.text(`${s(cm.contentType)} \u2014 ${s(cm.frequency)} (${s(cm.phase)})`, margin + 6, y);
            y += 4;
          });
        }
        y += 4;
      });

    // Phase Durations
    if (cp.phaseDurations?.length) {
      checkPageBreak(12);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Phase Durations', margin + 2, y);
      y += 5;
      cp.phaseDurations.forEach((pd) => {
        checkPageBreak(5);
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${s(pd.phaseId)}: ${pd.suggestedWeeks} weeks`, margin + 4, y);
        y += 4;
      });
      y += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 5: Asset Plan
  // ═══════════════════════════════════════════════════════════
  if (blueprint.assetPlan?.deliverables?.length) {
    const ap: AssetPlanLayer = blueprint.assetPlan;

    addSectionHeader('Asset Plan', [217, 119, 6]); // amber-600

    addField('Total Deliverables', String(ap.totalDeliverables ?? ap.deliverables.length));
    if (ap.prioritySummary) addWrappedText(ap.prioritySummary);
    y += 2;

    ap.deliverables.forEach((del) => {
      checkPageBreak(20);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(s(del.title), margin + 2, y);
      y += 5;

      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const priority = PRIORITY_LABELS[del.productionPriority] ?? s(del.productionPriority);
      const effort = EFFORT_LABELS[del.estimatedEffort] ?? s(del.estimatedEffort);
      doc.text(
        `${s(del.contentType)}  |  ${s(del.channel)}  |  ${s(del.phase)}  |  ${priority}  |  Effort: ${effort}`,
        margin + 2, y,
      );
      y += 5;

      if (del.targetPersonas?.length) {
        doc.text(`Personas: ${del.targetPersonas.join(', ')}`, margin + 2, y);
        y += 4;
      }

      // Brief
      if (del.brief) {
        if (del.brief.objective) {
          addField('Objective', s(del.brief.objective));
        }
        if (del.brief.keyMessage) {
          addField('Key Message', s(del.brief.keyMessage));
        }
        if (del.brief.toneDirection) {
          addField('Tone', s(del.brief.toneDirection));
        }
        if (del.brief.callToAction) {
          addField('CTA', s(del.brief.callToAction));
        }
        if (del.brief.contentOutline?.length) {
          checkPageBreak(6);
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(8);
          doc.text('Content Outline', margin + 4, y);
          y += 4;
          addList(del.brief.contentOutline, 6);
        }
      }
      y += 2;
    });

    // Prep Deliverables (Week 0)
    if (ap.prepDeliverables?.length) {
      checkPageBreak(14);
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Prep Deliverables (Week 0)', margin + 2, y);
      y += 5;

      ap.prepDeliverables.forEach((prep: PrepDeliverable) => {
        checkPageBreak(14);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(s(prep.title), margin + 4, y);
        y += 4;

        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const prepMeta = [
          prep.category ? `Category: ${prep.category}` : null,
          prep.owner ? `Owner: ${prep.owner}` : null,
          prep.estimatedEffort ? `Effort: ${EFFORT_LABELS[prep.estimatedEffort] ?? prep.estimatedEffort}` : null,
        ].filter(Boolean).join('  |  ');
        if (prepMeta) {
          doc.text(prepMeta, margin + 4, y);
          y += 4;
        }

        if (prep.description) {
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(9);
          const descLines = doc.splitTextToSize(prep.description, contentWidth - 6);
          checkPageBreak(descLines.length * 3.5);
          doc.text(descLines, margin + 4, y);
          y += descLines.length * 3.5 + 2;
        }
      });
      y += 2;
    }
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, 280, pageWidth - margin, 280);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(8);
    doc.text('Generated by Branddock  |  Confidential', pageWidth / 2, 284, { align: 'center' });
  }

  const filename = data.campaignName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'campaign-strategy';
  doc.save(`campaign-strategy-${filename}.pdf`);
  } catch (error) {
    console.error('[exportCampaignStrategyPdf] Failed to generate PDF:', error);
    alert('Failed to generate PDF. Please try again.');
  }
}
