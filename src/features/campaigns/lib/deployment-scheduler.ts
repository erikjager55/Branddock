/**
 * Beat-Slot Deployment Scheduler
 *
 * Pure client-side algorithm that computes a deployment timeline from
 * the asset plan and architecture layers of a campaign blueprint.
 *
 * 3-layer algorithm:
 * 1. Beat Assignment — map suggestedOrder to beat indices using phase durations
 * 2. Collision Detection — check channel capacity per beat (research-backed limits)
 * 3. Continuity Check — detect persona gaps (2+ empty consecutive beats)
 */

import type {
  AssetPlanLayer,
  ArchitectureLayer,
  ChannelPlanLayer,
  ScheduledDeliverable,
  DeploymentCollision,
  ContinuityGap,
  DeploymentSchedule,
} from '@/lib/campaigns/strategy-blueprint.types';
import { normalizeChannel, getChannelCapacity } from './channel-frequency';

/** Minimum consecutive empty beats before flagging a continuity gap */
const GAP_THRESHOLD = 4;

/**
 * Compute a complete deployment schedule from blueprint layers.
 *
 * Gracefully handles missing suggestedOrder by falling back to
 * original array order.
 */
export function computeDeploymentSchedule(
  assetPlan: AssetPlanLayer,
  architecture: ArchitectureLayer,
  channelPlan: ChannelPlanLayer,
): DeploymentSchedule {
  // ── 1. Build phase boundaries ──────────────────────────────
  const phases = (architecture.journeyPhases ?? [])
    .slice()
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  // Build duration map with both original and lowercase keys for case-insensitive lookup
  const durationMap = new Map<string, number>();
  for (const pd of channelPlan.phaseDurations ?? []) {
    durationMap.set(pd.phaseId, pd.suggestedWeeks);
    durationMap.set(pd.phaseId.toLowerCase(), pd.suggestedWeeks);
  }

  const phaseBoundaries: DeploymentSchedule['phaseBoundaries'] = [];
  let beatCursor = 0;

  for (const phase of phases) {
    const duration = durationMap.get(phase.id) ?? durationMap.get(phase.name) ?? durationMap.get(phase.name.toLowerCase()) ?? 2;
    phaseBoundaries.push({
      phase: phase.name,
      startBeat: beatCursor,
      endBeat: beatCursor + duration - 1,
    });
    beatCursor += duration;
  }

  const totalBeats = beatCursor || 1;

  // ── 2. Assign beats ─────────────────────────────────────────
  const deliverables = assetPlan.deliverables ?? [];

  // Build multi-key lookup: lowercase key → phase boundary index.
  // AI may set deliverable.phase to the phase name, id, or a variation,
  // so we index on both name and id for each phase.
  const phaseKeyToIndex = new Map<string, number>();
  for (let pi = 0; pi < phases.length; pi++) {
    const p = phases[pi];
    phaseKeyToIndex.set(p.name.toLowerCase(), pi);
    if (p.id) phaseKeyToIndex.set(p.id.toLowerCase(), pi);
    // Also add slug-ified name (e.g. "Awareness & Discovery" → "awareness-discovery")
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (slug) phaseKeyToIndex.set(slug, pi);
  }

  // Group deliverables by resolved phase index
  const byPhaseIndex = new Map<number, typeof deliverables>();
  const unmatched: typeof deliverables = [];

  for (const d of deliverables) {
    const key = (d.phase ?? '').toLowerCase();
    const pi = phaseKeyToIndex.get(key);
    if (pi !== undefined) {
      if (!byPhaseIndex.has(pi)) byPhaseIndex.set(pi, []);
      byPhaseIndex.get(pi)!.push(d);
    } else {
      unmatched.push(d);
    }
  }

  const scheduled: ScheduledDeliverable[] = [];

  for (let pi = 0; pi < phaseBoundaries.length; pi++) {
    const pb = phaseBoundaries[pi];
    const phaseDeliverables = byPhaseIndex.get(pi) ?? [];
    const phaseDuration = pb.endBeat - pb.startBeat + 1;

    // Sort by suggestedOrder (fallback to array index)
    const sorted = phaseDeliverables
      .map((d, idx) => ({ d, order: d.suggestedOrder ?? idx + 1 }))
      .sort((a, b) => a.order - b.order);

    if (sorted.length === 0) continue;

    const maxOrder = Math.max(sorted[sorted.length - 1].order, 1);

    for (const { d, order } of sorted) {
      // Map order to beat: spread evenly across the full phase duration.
      // order 1 → first beat, maxOrder → last beat of the phase.
      const beatOffset = maxOrder <= 1
        ? 0
        : Math.round(((order - 1) / (maxOrder - 1)) * (phaseDuration - 1));
      const beatIndex = pb.startBeat + Math.min(beatOffset, phaseDuration - 1);

      const norm = normalizeChannel(d.channel);
      const isShared = (d.targetPersonas ?? []).length === 0;

      scheduled.push({
        deliverable: d,
        beatIndex,
        phaseIndex: pi,
        channel: d.channel,
        normalizedChannel: norm,
        targetPersonas: d.targetPersonas ?? [],
        isShared,
        priority: d.productionPriority,
      });
    }
  }

  // Spread unmatched deliverables evenly across the full timeline
  for (let i = 0; i < unmatched.length; i++) {
    const d = unmatched[i];
    const beatIndex = unmatched.length <= 1
      ? 0
      : Math.round((i / (unmatched.length - 1)) * (totalBeats - 1));

    scheduled.push({
      deliverable: d,
      beatIndex,
      phaseIndex: 0,
      channel: d.channel,
      normalizedChannel: normalizeChannel(d.channel),
      targetPersonas: d.targetPersonas ?? [],
      isShared: (d.targetPersonas ?? []).length === 0,
      priority: d.productionPriority,
    });
  }

  // ── 3. Detect collisions ────────────────────────────────────
  const collisions: DeploymentCollision[] = [];

  // Group by (beatIndex, normalizedChannel)
  const beatChannelMap = new Map<string, ScheduledDeliverable[]>();
  for (const s of scheduled) {
    const key = `${s.beatIndex}:${s.normalizedChannel}`;
    if (!beatChannelMap.has(key)) beatChannelMap.set(key, []);
    beatChannelMap.get(key)!.push(s);
  }

  for (const [key, items] of beatChannelMap) {
    const colonIdx = key.indexOf(':');
    const beatIndex = parseInt(key.slice(0, colonIdx), 10);
    const channel = key.slice(colonIdx + 1);
    const capacity = getChannelCapacity(channel);

    if (items.length > capacity.maxPerBeat) {
      collisions.push({
        beatIndex,
        channel,
        items,
        capacity: capacity.maxPerBeat,
        severity: items.length > capacity.maxPerBeat * 2 ? 'overload' : 'warning',
      });
    }
  }

  // ── 4. Detect continuity gaps ───────────────────────────────
  const gaps: ContinuityGap[] = [];

  // Collect all unique personas
  const allPersonas = new Set<string>();
  for (const s of scheduled) {
    for (const p of s.targetPersonas) allPersonas.add(p);
  }

  for (const persona of allPersonas) {
    // Build presence array (which beats have this persona)
    const presence = new Set<number>();
    for (const s of scheduled) {
      if (s.isShared || s.targetPersonas.includes(persona)) {
        presence.add(s.beatIndex);
      }
    }

    // Scan for runs of consecutive empty beats
    let gapStart: number | null = null;
    for (let beat = 0; beat < totalBeats; beat++) {
      if (!presence.has(beat)) {
        if (gapStart === null) gapStart = beat;
      } else {
        if (gapStart !== null) {
          const gapLength = beat - gapStart;
          if (gapLength >= GAP_THRESHOLD) {
            gaps.push({
              persona,
              startBeat: gapStart,
              endBeat: beat - 1,
              gapLength,
            });
          }
          gapStart = null;
        }
      }
    }
    // Check trailing gap
    if (gapStart !== null) {
      const gapLength = totalBeats - gapStart;
      if (gapLength >= GAP_THRESHOLD) {
        gaps.push({
          persona,
          startBeat: gapStart,
          endBeat: totalBeats - 1,
          gapLength,
        });
      }
    }
  }

  return { scheduled, collisions, gaps, totalBeats, phaseBoundaries };
}
