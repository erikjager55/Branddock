# Performance Benchmarks — Branddock

## Targets (Core Web Vitals)

| Metric | Target | Description |
|--------|--------|-------------|
| **CLS** | < 0.1 | Cumulative Layout Shift — visual stability |
| **LCP** | < 2500ms | Largest Contentful Paint — loading performance |
| **FID** | < 200ms | First Input Delay — best-effort only; requires real user input, typically null in automated tests |

## Test Suite

Performance is measured via Playwright E2E tests in `e2e/tests/global/performance.spec.ts`.

### Measured Pages

| Page | What's measured |
|------|----------------|
| Dashboard | LCP, CLS, FID after auth → dashboard load |
| Brand Foundation | LCP, CLS after sidebar navigation |
| Campaigns | LCP, CLS after sidebar navigation |

### Additional Benchmarks

| Benchmark | Target | Description |
|-----------|--------|-------------|
| Auth → Dashboard | < 5000ms | Full page load including authentication |
| Sidebar navigation | < 1000ms per section | Client-side section switching (includes first-load data fetching) |

## Running Benchmarks

```bash
# Run performance tests only
npm run test:e2e -- --grep "Performance"

# Run with verbose output (shows timing data)
npm run test:e2e -- --grep "Performance" --reporter=list
```

## Architecture Notes

- Branddock is a **hybrid SPA** — Next.js as framework, client-side routing via `activeSection` state
- Sidebar navigation is instant (no page reload, no server round-trip)
- Data fetching via TanStack Query with caching
- Performance Observer API used for CLS/LCP/FID measurement in browser context

## Baseline (March 2026)

Run `npm run test:e2e -- --grep "Performance"` to establish baseline values. Console output will display measured timings for each page.
