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
  group("#6 — skip wanneer screenshotUrl ontbreekt");
  {
    const result = await judgeVisualBrandFit({
      screenshotUrl: null,
      designPhilosophy: "Quiet luxury via generous whitespace",
    });
    assert("status=skipped-missing-screenshot", result.status === "skipped-missing-screenshot");
    assert("score=null", result.score === null);
    assert("reasoning=null", result.reasoning === null);
  }

  group("#6 — skip wanneer designPhilosophy ontbreekt");
  {
    const result = await judgeVisualBrandFit({
      screenshotUrl: "https://example.com/screenshot.png",
      designPhilosophy: null,
    });
    assert("status=skipped-missing-philosophy", result.status === "skipped-missing-philosophy");
    assert("score=null", result.score === null);

    const empty = await judgeVisualBrandFit({
      screenshotUrl: "https://example.com/x.png",
      designPhilosophy: "   ",
    });
    assert("empty-string philosophy → skipped", empty.status === "skipped-missing-philosophy");
  }

  group("#6 — beide aanwezig → error TODO-pad (vision-API nog niet)");
  {
    const result = await judgeVisualBrandFit({
      screenshotUrl: "https://example.com/x.png",
      designPhilosophy: "Quiet luxury",
      brandName: "LINFI",
    });
    assert("status=error", result.status === "error");
    assert("reasoning vermeldt TODO", result.reasoning?.includes("TODO v2") === true);
    assert("score=null", result.score === null);
  }

  group("#6 — weight = 0.1 (10% van composite)");
  {
    assert("weight=0.1", visualBrandFitWeight() === 0.1);
  }

  console.log(`\n${pass} PASS, ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
