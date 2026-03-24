/**
 * Test script for the 9-phase campaign strategy pipeline.
 * Signs in via Better Auth, then calls each phase endpoint.
 * Run: node test-pipeline.mjs
 */

const BASE_URL = 'http://localhost:3000';

// ─── Auth ─────────────────────────────────────────────────

async function signIn() {
  console.log('🔑 Signing in...');
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
    },
    body: JSON.stringify({
      email: 'erik@branddock.com',
      password: 'Password123!',
    }),
    redirect: 'manual',
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Sign-in failed: ${res.status} ${res.statusText}`);
    console.error('   Body:', text || '(empty)');
    process.exit(1);
  }

  // Extract Set-Cookie headers
  const cookies = res.headers.getSetCookie?.() ?? [];

  const cookieStr = cookies
    .map(c => c.split(';')[0])
    .join('; ');

  if (!cookieStr) {
    console.error('❌ No session cookies received');
    process.exit(1);
  }

  console.log(`✅ Signed in. Cookies: ${cookieStr.substring(0, 80)}...`);
  return cookieStr;
}

// ─── SSE Helper (streaming) ──────────────────────────────

async function callSSE(cookies, endpoint, body, label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🚀 ${label}: POST ${endpoint}`);
  console.log(`${'─'.repeat(60)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 min

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.error(`❌ ${label} fetch failed: ${err.message}`);
    return null;
  }

  if (!res.ok) {
    clearTimeout(timeout);
    const text = await res.text();
    console.error(`❌ ${label} failed: ${res.status}`);
    console.error('   Body:', text);
    return null;
  }

  console.log(`📡 Streaming SSE events...`);

  // Stream the response body chunk by chunk
  let result = null;
  let buffer = '';
  try {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (separated by \n\n)
      const parts = buffer.split('\n\n');
      buffer = parts.pop(); // keep incomplete last part

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        let event;
        try {
          event = JSON.parse(part.replace('data: ', ''));
        } catch {
          continue;
        }

        if (event.type === 'complete') {
          console.log(`✅ ${label} complete!`);
          console.log(`   Result keys: ${Object.keys(event.result || {}).join(', ')}`);
          result = event.result;
        } else if (event.type === 'error') {
          console.error(`❌ ${label} error: ${event.error}`);
          clearTimeout(timeout);
          return null;
        } else if (event.type === 'enrichment') {
          console.log(`   🔬 Enrichment: ${event.status} (sources: ${JSON.stringify(event.sources || {})})`);
        } else if (event.step) {
          const icon = event.status === 'complete' ? '✅' : event.status === 'running' ? '⏳' : '⏸️';
          console.log(`   ${icon} Step ${event.step}: ${event.name} — ${event.label}`);
        }
      }
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error(`❌ ${label} timed out after 15 minutes`);
    } else {
      console.error(`❌ ${label} stream error: ${err.message}`);
    }
    return result; // return partial result if we got one
  }

  clearTimeout(timeout);

  if (result) return result;
  console.log(`⚠️ No complete event received`);
  return null;
}

// ─── Pipeline Test ────────────────────────────────────────

async function testPipeline() {
  console.log('═'.repeat(60));
  console.log(' 9-Phase Campaign Strategy Pipeline Test');
  console.log('═'.repeat(60));

  const cookies = await signIn();

  // ─── Test 1: Validate Briefing ──────────────────────────
  const wizardContext = {
    campaignName: 'Test Pipeline Campaign',
    campaignDescription: 'A test campaign to validate the 9-phase pipeline.',
    campaignGoalType: 'BRAND_AWARENESS',
    briefing: {
      occasion: 'Spring product launch',
      audienceObjective: 'Increase brand awareness among 25-35 tech professionals',
      coreMessage: 'Innovation that works for you',
      tonePreference: 'Professional yet approachable',
      constraints: 'Budget under 50k, 3-month timeline',
    },
  };

  const briefingResult = await callSSE(
    cookies,
    '/api/campaigns/wizard/strategy/validate-briefing',
    {
      strategicIntent: 'hybrid',
      wizardContext,
    },
    'Phase 1: Validate Briefing',
  );

  if (!briefingResult) {
    console.log('\n⛔ Pipeline stopped at Phase 1');
    return;
  }

  console.log(`   Score: ${briefingResult.overallScore}/100`);
  console.log(`   Complete: ${briefingResult.isComplete}`);
  if (briefingResult.gaps?.length > 0) {
    console.log(`   Gaps: ${briefingResult.gaps.join(', ')}`);
  }

  // ─── Test 2: Build Foundation ───────────────────────────
  const foundationResult = await callSSE(
    cookies,
    '/api/campaigns/wizard/strategy/build-foundation',
    {
      strategicIntent: 'hybrid',
      wizardContext,
    },
    'Phase 2: Build Strategy Foundation',
  );

  if (!foundationResult) {
    console.log('\n⛔ Pipeline stopped at Phase 2');
    return;
  }

  const { foundation, enrichmentContext } = foundationResult;
  console.log(`   Strategic Direction: ${foundation?.strategicDirection?.substring(0, 100)}...`);
  console.log(`   Key Insights: ${foundation?.keyInsights?.length ?? 0}`);
  console.log(`   Audience Insights: ${foundation?.audienceInsights?.length ?? 0}`);
  console.log(`   BCTs: ${foundation?.behavioralStrategy?.selectedBCTs?.length ?? 0}`);

  // ─── Test 3: Generate Hooks ─────────────────────────────
  const hooksResult = await callSSE(
    cookies,
    '/api/campaigns/wizard/strategy/generate-hooks',
    {
      strategicIntent: 'hybrid',
      wizardContext,
      foundation,
      enrichmentContext,
    },
    'Phase 3: Generate Creative Hooks',
  );

  if (!hooksResult) {
    console.log('\n⛔ Pipeline stopped at Phase 3');
    return;
  }

  const { hooks, hookScores, personaValidation } = hooksResult;
  console.log(`   Hooks generated: ${hooks?.length ?? 0}`);
  for (let i = 0; i < (hooks?.length ?? 0); i++) {
    const h = hooks[i];
    console.log(`   Hook ${i + 1}: "${h.hookConcept?.hookTitle}" (score: ${hookScores?.[i]?.toFixed(1)}, angle: ${h.creativeAngleName})`);
  }
  console.log(`   Persona validations: ${personaValidation?.length ?? 0}`);

  // ─── Test 4: Refine Hook ────────────────────────────────
  if (!hooks || hooks.length === 0) {
    console.log('\n⛔ No hooks to refine');
    return;
  }

  // Select the highest-scoring hook
  const bestIdx = hookScores?.indexOf(Math.max(...(hookScores ?? [0]))) ?? 0;
  console.log(`\n   Selecting hook ${bestIdx + 1} for refinement...`);

  const refineResult = await callSSE(
    cookies,
    '/api/campaigns/wizard/strategy/refine-hook',
    {
      strategicIntent: 'hybrid',
      wizardContext,
      selectedHook: hooks[bestIdx],
      foundation,
      personaValidation: personaValidation ?? [],
    },
    'Phase 4: Refine Selected Hook',
  );

  if (!refineResult) {
    console.log('\n⛔ Pipeline stopped at Phase 4');
    return;
  }

  const { strategy, architecture, hookConcept } = refineResult;
  console.log(`   Campaign Theme: ${strategy?.campaignTheme?.substring(0, 100)}`);
  console.log(`   Positioning: ${strategy?.positioningStatement?.substring(0, 100)}`);
  console.log(`   Campaign Type: ${architecture?.campaignType}`);
  console.log(`   Journey Phases: ${architecture?.journeyPhases?.length ?? 0}`);
  console.log(`   Hook Title: ${hookConcept?.hookTitle}`);
  console.log(`   Campaign Line: ${hookConcept?.campaignLine}`);

  // ─── Summary ────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(' ✅ ALL 4 PHASES COMPLETED SUCCESSFULLY');
  console.log(`${'═'.repeat(60)}`);
}

testPipeline().catch(err => {
  console.error('💥 Unhandled error:', err.message);
  process.exit(1);
});
