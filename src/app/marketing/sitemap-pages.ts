// Publieke marketing-URL's voor de apex-sitemap (branddock.app/sitemap.xml).
// Paden relatief aan de origin; '' = de homepage (apex-root, die de host-router
// naar /marketing rewrite't — de root is de canonieke homepage-URL).
// Nieuwe marketing-pagina? Voeg 'm hier toe, anders vindt Google 'm niet.

export const MARKETING_SITEMAP_PATHS: string[] = [
  '', // homepage (apex-root)
  'marketing/platform',
  'marketing/pricing',
  'marketing/guardrails',
  'marketing/changelog',
  'marketing/about',
  'marketing/contact',
  'marketing/resources/f-val',
  'marketing/features/brand-voice',
  'marketing/features/content-canvas',
  'marketing/features/brand-alignment',
  'marketing/features/agents',
  'marketing/features/personas',
  'marketing/features/trend-radar',
  'marketing/features/campaigns',
  'marketing/solutions/marketingteams',
  'marketing/solutions/bureaus',
  'marketing/vergelijk/jasper',
  'marketing/vergelijk/chatgpt',
  'marketing/vergelijk/social-schedulers',
];
