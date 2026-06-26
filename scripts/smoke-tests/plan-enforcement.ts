// Smoke: plan-limit enforcement (security-audit M5).
//   DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx tsx scripts/smoke-tests/plan-enforcement.ts
//   (enforcement imports prisma transitively; billing is disabled by default so
//    the guard returns early WITHOUT a DB call — verifying the no-op path.)
import { enforcePlanLimit, checkPlanLimit } from "@/lib/stripe/enforcement";
import { PLAN_LIMITS } from "@/lib/constants/plan-limits";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.log(`  [FAIL] ${label}`); }
}

async function main() {
  // Billing disabled (NEXT_PUBLIC_BILLING_ENABLED unset) → enforcement is a no-op
  // and must NOT hit the DB (the fake DATABASE_URL would otherwise throw).
  const limited = await enforcePlanLimit("ws_fake_nonexistent", "PERSONAS");
  ok("enforcePlanLimit returns null when billing disabled (no DB hit)", limited === null);

  const check = await checkPlanLimit("ws_fake_nonexistent", "CAMPAIGNS");
  ok("checkPlanLimit allows + reports ENTERPRISE/Infinity when billing disabled",
    check.allowed === true && check.limit === Infinity && check.tier === "ENTERPRISE");

  // FREE-tier limits exist for the gated entity features (sanity on the config).
  for (const key of ["PERSONAS", "PRODUCTS", "CAMPAIGNS", "KNOWLEDGE_RESOURCES"] as const) {
    ok(`FREE plan has a finite ${key} limit`, Number.isFinite(PLAN_LIMITS.FREE[key]) && PLAN_LIMITS.FREE[key] > 0);
  }

  console.log(`\nPlan-enforcement: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
