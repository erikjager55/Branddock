import { test, expect } from '../../fixtures/auth.fixture';
import { navigateTo } from '../../helpers/navigation';
import type { Page } from '@playwright/test';

/**
 * Agents UI smoke — catalogus → detail → run → inbox → artefact-acties.
 *
 * De agents-API wordt gemockt (page.route): de catalogus-route
 * (GET /api/agents) landt pas met agents-motor-wiring en echte runs
 * kosten AI-geld. De mocks pinnen exact op het foundation-contract;
 * de modal-/state-flows (confirm, accept/dismiss — gotcha 2026-06-17)
 * worden hiermee in een echte browser afgedekt.
 */

const AGENT = {
  id: 'research-analyst',
  persona: { name: 'Nova', role: 'Research Analyst', icon: 'Telescope' },
  useCases: [{ id: 'deep-research', label: 'Deep research report' }],
};

const NOW = Date.now();
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const REPORT_ARTIFACT = {
  id: 'artifact-report-1',
  runId: 'run-completed-1',
  type: 'REPORT',
  title: 'Market research report',
  content: { markdown: '## Key findings\n\n- Finding one\n- Finding two' },
  fidelityScore: null,
  acceptedAt: null,
  dismissedAt: null,
  createdAt: iso(60_000),
};

const PROPOSAL_ARTIFACT = {
  id: 'artifact-proposal-1',
  runId: 'run-awaiting-1',
  type: 'PROPOSAL',
  title: 'Create deliverable',
  content: {
    description: 'Create a LinkedIn post deliverable in campaign Q3.',
    entityType: 'deliverable',
    entityName: 'Q3 Campaign',
    changes: [
      { field: 'title', label: 'Title', currentValue: null, proposedValue: 'New LinkedIn post' },
    ],
  },
  fidelityScore: 82,
  acceptedAt: null,
  dismissedAt: null,
  createdAt: iso(30_000),
};

const RUNS = [
  {
    id: 'run-awaiting-1',
    agentId: AGENT.id,
    status: 'AWAITING_CONFIRMATION',
    triggerType: 'manual',
    latencyMs: 5200,
    totalCostUsd: 0.012,
    truncated: false,
    error: null,
    createdAt: iso(30_000),
    completedAt: iso(20_000),
    artifacts: [summaryOf(PROPOSAL_ARTIFACT)],
  },
  {
    id: 'run-completed-1',
    agentId: AGENT.id,
    status: 'COMPLETED',
    triggerType: 'manual',
    latencyMs: 8400,
    totalCostUsd: 0.03,
    truncated: false,
    error: null,
    createdAt: iso(60_000),
    completedAt: iso(50_000),
    artifacts: [summaryOf(REPORT_ARTIFACT)],
  },
  {
    id: 'run-failed-1',
    agentId: AGENT.id,
    status: 'FAILED',
    triggerType: 'manual',
    latencyMs: 1200,
    totalCostUsd: 0.001,
    truncated: false,
    error: 'AI provider returned an overloaded error',
    createdAt: iso(120_000),
    completedAt: iso(110_000),
    artifacts: [],
  },
  {
    id: 'run-stale-1',
    agentId: AGENT.id,
    status: 'RUNNING',
    triggerType: 'manual',
    latencyMs: 0,
    totalCostUsd: 0,
    truncated: false,
    error: null,
    // Ouder dan de 15-min-drempel → "mogelijk vastgelopen" i.p.v. spinner.
    createdAt: iso(20 * 60_000),
    completedAt: null,
    artifacts: [],
  },
];

function summaryOf(artifact: typeof REPORT_ARTIFACT | typeof PROPOSAL_ARTIFACT) {
  return {
    id: artifact.id,
    type: artifact.type,
    title: artifact.title,
    fidelityScore: artifact.fidelityScore,
    acceptedAt: artifact.acceptedAt,
    dismissedAt: artifact.dismissedAt,
  };
}

async function mockAgentsApi(page: Page) {
  await page.route('**/api/agents', (route) =>
    route.fulfill({ json: { agents: [AGENT] } }),
  );
  await page.route('**/api/agents/runs', (route) =>
    route.fulfill({ json: { runs: RUNS } }),
  );
  await page.route('**/api/agents/runs/run-completed-1', (route) =>
    route.fulfill({
      json: { run: { ...RUNS[1], input: { message: 'topic' }, artifacts: [REPORT_ARTIFACT] } },
    }),
  );
  await page.route('**/api/agents/runs/run-awaiting-1', (route) =>
    route.fulfill({
      json: { run: { ...RUNS[0], input: { message: 'topic' }, artifacts: [PROPOSAL_ARTIFACT] } },
    }),
  );
  await page.route('**/api/agents/runs/run-failed-1', (route) =>
    route.fulfill({ json: { run: { ...RUNS[2], input: { message: 'topic' }, artifacts: [] } } }),
  );
}

test.describe('Agents UI', () => {
  test('sidebar shows Agents and the catalog renders (empty state without registry)', async ({
    authenticatedPage: page,
  }) => {
    await navigateTo(page, 'agents');
    await expect(page.locator('[data-testid="page-header"] h1')).toHaveText('Agents');
    // Afbakenings-copy Claw ↔ Agents (ADR D6) is een acceptatiecriterium.
    await expect(page.locator('[data-testid="agents-scope-note"]')).toBeVisible();
    // Zonder motor-wiring: lege registry → nette empty state; mét: kaarten.
    const emptyState = page.locator('[data-testid="empty-state"]');
    const agentCard = page.locator('[data-testid="agent-card"]');
    await expect(emptyState.or(agentCard.first())).toBeVisible();
  });

  test('catalog → detail → run → inbox flow with report accept/dismiss', async ({
    authenticatedPage: page,
  }) => {
    await mockAgentsApi(page);
    await page.route('**/api/agents/run', (route) =>
      route.fulfill({
        json: {
          runId: 'run-completed-1',
          status: 'COMPLETED',
          artifactIds: [REPORT_ARTIFACT.id],
          totalCostUsd: 0.03,
          latencyMs: 8400,
          truncated: false,
          error: null,
        },
      }),
    );

    await navigateTo(page, 'agents');
    const card = page.locator('[data-testid="agent-card"]');
    await expect(card).toHaveCount(1);
    await card.click();

    // Detail: persona + use-case → formulier → run.
    await expect(page.getByText(AGENT.persona.name).first()).toBeVisible();
    await page.getByText(AGENT.useCases[0].label).first().click();
    // Lege input → inline validatie, geen request.
    await page.locator('[data-testid="use-case-run"]').click();
    await expect(page.locator('[data-testid="use-case-validation-error"]')).toBeVisible();
    await page.locator('[data-testid="use-case-input"]').fill('AI trends in retail');
    await page.locator('[data-testid="use-case-run"]').click();
    await expect(page.locator('[data-testid="run-result"]')).toHaveAttribute(
      'data-run-status',
      'COMPLETED',
    );

    // Naar de inbox via het resultaat — focust de run.
    await page.locator('[data-testid="run-result-inbox"]').click();
    await expect(page.locator('[data-testid="page-header"] h1')).toHaveText('Results Inbox');

    // Gefocuste run is uitgeklapt: REPORT-markdown gerenderd (h2 uit ## kop).
    const reportViewer = page.locator('[data-artifact-type="REPORT"]');
    await expect(reportViewer).toBeVisible();
    await expect(
      page.locator('[data-testid="artifact-report-markdown"] h2'),
    ).toHaveText('Key findings');

    // Accept → accepted-status + "opgeslagen in Knowledge Library"-referentie.
    await page.route('**/api/agents/artifacts/artifact-report-1', async (route) => {
      const action = (route.request().postDataJSON() as { action: string }).action;
      const accepted = action === 'accept';
      await route.fulfill({
        json: {
          artifact: {
            ...REPORT_ARTIFACT,
            acceptedAt: accepted ? new Date().toISOString() : null,
            dismissedAt: accepted ? null : new Date().toISOString(),
            content: accepted
              ? { ...REPORT_ARTIFACT.content, knowledgeResourceId: 'kr-1' }
              : REPORT_ARTIFACT.content,
          },
          materialized: accepted ? { knowledgeResourceId: 'kr-1' } : null,
        },
      });
    });
    // Detail-refetch ná accept levert het geaccepteerde artefact.
    let detailAccepted = false;
    await page.route('**/api/agents/runs/run-completed-1', (route) =>
      route.fulfill({
        json: {
          run: {
            ...RUNS[1],
            input: { message: 'topic' },
            artifacts: [
              detailAccepted
                ? {
                    ...REPORT_ARTIFACT,
                    acceptedAt: new Date().toISOString(),
                    content: { ...REPORT_ARTIFACT.content, knowledgeResourceId: 'kr-1' },
                  }
                : REPORT_ARTIFACT,
            ],
          },
        },
      }),
    );
    detailAccepted = true;
    await reportViewer.locator('[data-testid="artifact-accept"]').click();
    await expect(reportViewer.locator('[data-testid="artifact-accepted"]')).toBeVisible();
    await expect(reportViewer.locator('[data-testid="artifact-open-library"]')).toBeVisible();
  });

  test('inbox shows failed run error and stale RUNNING as possibly stuck', async ({
    authenticatedPage: page,
  }) => {
    await mockAgentsApi(page);
    await navigateTo(page, 'agents');
    await page.locator('[data-testid="open-inbox"]').click();

    const failedCard = page.locator('[data-run-id="run-failed-1"]');
    await expect(failedCard.locator('[data-testid="run-error"]')).toContainText(
      'AI provider returned an overloaded error',
    );
    await expect(
      failedCard.locator('[data-testid="run-status-badge"]'),
    ).toHaveAttribute('data-status', 'FAILED');

    const staleCard = page.locator('[data-run-id="run-stale-1"]');
    await expect(staleCard.locator('[data-testid="run-stale-note"]')).toBeVisible();
    await expect(
      staleCard.locator('[data-testid="run-status-badge"]'),
    ).toHaveAttribute('data-status', 'STALE');
  });

  test('proposal confirm-card approves via the confirm route and resolves', async ({
    authenticatedPage: page,
  }) => {
    await mockAgentsApi(page);
    let confirmBody: { artifactId?: string; approved?: boolean } | null = null;
    await page.route('**/api/agents/runs/run-awaiting-1/confirm', (route) => {
      confirmBody = route.request().postDataJSON() as { artifactId: string; approved: boolean };
      return route.fulfill({ json: { executed: true, runStatus: 'COMPLETED' } });
    });

    await navigateTo(page, 'agents');
    await page.locator('[data-testid="open-inbox"]').click();

    const awaitingCard = page.locator('[data-run-id="run-awaiting-1"]');
    await expect(
      awaitingCard.locator('[data-testid="run-status-badge"]'),
    ).toHaveAttribute('data-status', 'AWAITING_CONFIRMATION');
    await awaitingCard.locator('[data-testid="run-card-toggle"]').click();

    const proposal = page.locator('[data-testid="proposal-confirm-card"]');
    await expect(proposal).toBeVisible();
    await expect(proposal.getByText('New LinkedIn post')).toBeVisible();
    await proposal.locator('[data-testid="proposal-approve"]').click();

    // Double-toggle-gotcha: na approve is de confirm-kaart wég,
    // vervangen door de resolved-status.
    await expect(proposal).toBeHidden();
    await expect(page.locator('[data-testid="proposal-resolved"]')).toBeVisible();
    expect(confirmBody).toEqual({ artifactId: PROPOSAL_ARTIFACT.id, approved: true });
  });

  test('global Claw overlay stays unscoped after visiting agents', async ({
    authenticatedPage: page,
  }) => {
    await mockAgentsApi(page);
    await navigateTo(page, 'agents');

    // Open de globale Brand Assistant vanuit de TopNav.
    await page.locator('[data-testid="top-nav"] button', { hasText: 'Brand Assistant' }).click();
    await expect(page.locator('[data-testid="claw-header-title"]')).not.toHaveText(
      AGENT.persona.name,
    );
    await expect(page.locator('[data-testid="claw-agent-scope"]')).toHaveCount(0);
  });
});
