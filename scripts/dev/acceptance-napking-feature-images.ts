/**
 * Acceptatie-run lp-feature-image-diversity (audit §4 fase 4): de echte
 * Napking LP-sectieteksten door de volledige nieuwe pipeline — server-side
 * prompts (brief-pad) → 4 generaties met per-slot seeds → paired G4-coherence
 * → set-diversity-judge → gate → evt. gerichte retry.
 *
 * Acceptatiecriterium: 4 onderscheidende beelden die elk hun sectietekst
 * visualiseren; coherence-scores in de log. Kosten: ~$0,53-0,79.
 *
 * Run: npx tsx scripts/dev/acceptance-napking-feature-images.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"] });

import { writeFile } from "node:fs/promises";

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const { assembleCanvasContext } = await import("../../src/lib/ai/canvas-context");
  const { buildFeatureVisualPrompts, sharpenFeaturePromptForRetry } = await import("../../src/lib/landing-pages/feature-visual-prompts");
  const { decideFeatureRegenerations } = await import("../../src/lib/landing-pages/feature-visual-gate");
  const { runCopyImageCoherenceJudge } = await import("../../src/lib/brand-fidelity/copy-image-coherence-judge");
  const { runFeatureSetDiversityJudge } = await import("../../src/lib/brand-fidelity/feature-set-diversity-judge");
  const { generateFalImage } = await import("../../src/lib/integrations/fal/fal-client");
  const { buildNegativePrompt } = await import("../../src/lib/ai/image-quality/negative-prompts");
  const { selectModelForStyle } = await import("../../src/lib/ai/visual-brief-prompts");
  const { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } = await import("../../src/lib/security/fetch-with-limit");

  // De echte Napking screenshot-deliverable (symptoom-pagina).
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: "apking" } },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error("Napking workspace niet gevonden");
  const deliverable = await prisma.deliverable.findFirst({
    where: { campaign: { workspaceId: workspace.id }, contentType: { contains: "landing" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, settings: true },
  });
  if (!deliverable) throw new Error("Napking LP-deliverable niet gevonden");
  const sv = (deliverable.settings as { structuredVariant?: { hero?: { headline?: string }; features?: { items?: Array<{ heading?: string; body?: string }> } } }).structuredVariant;
  const items = sv?.features?.items ?? [];
  if (items.length < 3) throw new Error("structuredVariant.features ontbreekt");
  console.log(`Deliverable ${deliverable.id} — ${items.length} features:`);
  items.forEach((it, i) => console.log(`  ${i}: ${it.heading}`));

  // Briefs zoals een verse Step-2 run ze levert (vorm gevalideerd in de live
  // fase-2-test) — per sectie het BEWIJS, onderling verschillende sceneTypes.
  const BRIEFS = [
    { subject: "Industriële wasstraat met witte tafellinnen in de trommel, digitaal display toont 85 graden", sceneType: "object" as const, composition: "frontaal zicht op machine en display, heldere verlichting", avoid: "personen frontaal in beeld, huishoudelijke wasmachine" },
    { subject: "Open voorraadkast in restaurantkeuken met strak gestapelde gestreken servetten en telkaart", sceneType: "detail" as const, composition: "close-up van de stapels, natuurlijk zijlicht", avoid: "personen, rommel" },
    { subject: "Wit tafellinnen met GOTS- en Oeko-Tex-label zichtbaar in de zoom, liggend op houten tafel", sceneType: "detail" as const, composition: "macro-opname van het label, ondiepe scherptediepte", avoid: "losse certificaat-papieren, digitale mockups" },
    { subject: "Elektrische bezorgbus geparkeerd voor restaurant, chauffeur laadt kratten textiel uit", sceneType: "process" as const, composition: "zijaanzicht, stedelijke straat, ochtendlicht", avoid: "frontale pose naar camera" },
  ];

  const slots = items.slice(0, 4).map((it, i) => ({
    index: i,
    heading: it.heading ?? "feature",
    body: it.body ?? "",
    imageBrief: BRIEFS[i] ?? null,
  }));

  const stack = await assembleCanvasContext(deliverable.id, workspace.id);
  const modelId = selectModelForStyle(stack.visualBrief?.styleDirection ?? null, {
    contentTypeId: stack.deliverableTypeId ?? null,
    hasTrainedLora: false,
  });
  console.log(`\nModel: ${modelId}`);

  const built = buildFeatureVisualPrompts(slots, sv?.hero?.headline ?? "", {
    brand: stack.brand,
    brandTokens: stack.brandTokens,
  });
  built.forEach((b) => console.log(`\nPROMPT ${b.index} (seed ${b.seed}):\n${b.prompt}`));

  const generateOne = async (slot: (typeof built)[number]) => {
    const negativePrompt = buildNegativePrompt({
      brandImageryDonts: stack.brand?.brandImageryDonts ?? [],
      userNegations: slot.avoid ? [slot.avoid] : [],
    });
    const result = await generateFalImage(modelId, slot.prompt, {
      imageSize: "landscape_4_3",
      numImages: 1,
      negativePrompt,
      seed: slot.seed,
    });
    const url = result.images?.[0]?.url;
    if (!url) return null;
    const bytes = await fetchWithSizeLimit(url, AI_IMAGE_SIZE_CAP);
    return { index: slot.index, bytes };
  };

  console.log("\nGenereren (4 parallel)…");
  const generated = await Promise.all(built.map((b) => generateOne(b)));

  console.log("Judges…");
  const coherence: Array<number | null> = await Promise.all(
    generated.map(async (g, pos) => {
      if (!g) return null;
      const r = await runCopyImageCoherenceJudge(
        { type: "base64", mediaType: "image/png", data: g.bytes.toString("base64") },
        `${slots[pos].heading}\n${slots[pos].body}`,
      );
      return r?.score ?? null;
    }),
  );
  const diversity = await runFeatureSetDiversityJudge(
    generated.filter((g): g is NonNullable<typeof g> => Boolean(g)).map((g) => ({ index: g.index, buffer: g.bytes, mediaType: "image/png" as const })),
  );
  console.log(`Coherence: [${coherence.join(", ")}] | dupes: ${JSON.stringify(diversity?.duplicatePairs ?? [])} | ${diversity?.rationale ?? ""}`);

  const decision = decideFeatureRegenerations(
    generated.map((g, pos) => (g ? { index: g.index, coherenceScore: coherence[pos] } : null)).filter((s): s is NonNullable<typeof s> => Boolean(s)),
    diversity?.duplicatePairs ?? [],
  );
  if (decision.regenerate.length > 0) {
    console.log(`Gate: regenereer [${decision.regenerate.join(", ")}] (${[...decision.reasons.entries()].map(([k, v]) => `${k}=${v}`).join(", ")})`);
    for (const index of decision.regenerate) {
      const pos = built.findIndex((b) => b.index === index);
      const reason = decision.reasons.get(index);
      const sharpened = sharpenFeaturePromptForRetry(
        built[pos],
        reason === "duplicate"
          ? { kind: "duplicate", otherSubject: BRIEFS[index]?.subject ?? slots[pos].heading }
          : { kind: "low-coherence", subject: BRIEFS[index]?.subject ?? slots[pos].heading },
      );
      const retry = await generateOne(sharpened);
      if (retry) generated[pos] = retry;
    }
  } else {
    console.log("Gate: geen regeneraties nodig.");
  }

  for (const g of generated) {
    if (!g) continue;
    const p = `/tmp/acceptance-napking-${g.index}.png`;
    await writeFile(p, g.bytes);
    console.log(`Beeld ${g.index} → ${p}`);
  }
  await prisma.$disconnect();
  console.log("\nACCEPTANCE-RUN KLAAR");
}

main().catch((err) => {
  console.error("Acceptance-run faalde:", err instanceof Error ? err.message : err);
  process.exit(1);
});
