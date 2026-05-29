/**
 * Smoke-test voor #6 spike — Visual Brand-Fit judge skip-pad.
 *
 * Run: npx tsx scripts/smoke-tests/web-page-builder-phase34-visual-brand-fit-judge.ts
 */
import { judgeVisualBrandFit, visualBrandFitWeight } from "../../src/lib/landing-pages/visual-brand-fit-judge";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`); fail++; }
}
function group(name: string): void { console.log(`\n${name}`); }

async function main() {
  group("#6 — skip wanneer screenshotBuffer ontbreekt");
  {
    const result = await judgeVisualBrandFit({
      screenshotBuffer: null,
      designPhilosophy: "Quiet luxury via generous whitespace",
    });
    assert("status=skipped-missing-screenshot", result.status === "skipped-missing-screenshot");
    assert("score=null", result.score === null);
    assert("reasoning=null", result.reasoning === null);
  }

  group("#6 — skip wanneer designPhilosophy ontbreekt (gate 1)");
  {
    const fakeBuf = Buffer.from([0]);
    const result = await judgeVisualBrandFit({
      screenshotBuffer: fakeBuf,
      designPhilosophy: null,
    });
    assert("status=skipped-missing-philosophy", result.status === "skipped-missing-philosophy");
    assert("score=null", result.score === null);

    const empty = await judgeVisualBrandFit({
      screenshotBuffer: fakeBuf,
      designPhilosophy: "   ",
    });
    assert("empty-string philosophy → skipped", empty.status === "skipped-missing-philosophy");
  }

  group("#6 — screenshot + philosophy aanwezig: vision-call wordt geprobeerd");
  {
    // Skip live vision-call in smoke (vereist Anthropic API + cost).
    // Test alleen dat de input-validatie door beide gates komt.
    // Live test: laat een Anthropic API key + lokale Playwright run.
    if (process.env.SKIP_VISION_TEST !== "0") {
      assert("vision-test overgeslagen (SKIP_VISION_TEST default)", true);
    } else {
      const fakeBuf = Buffer.from([137, 80, 78, 71]);  // fake PNG header
      const result = await judgeVisualBrandFit({
        screenshotBuffer: fakeBuf,
        designPhilosophy: "Quiet luxury",
        brandName: "LINFI",
      });
      assert("vision call returnt result", result.status === "scored" || result.status === "error");
    }
  }

  group("#6 — weight = 0.1 (10% van composite)");
  {
    assert("weight=0.1", visualBrandFitWeight() === 0.1);
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
