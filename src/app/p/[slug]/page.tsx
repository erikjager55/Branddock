import { notFound, permanentRedirect } from 'next/navigation';

/**
 * Legacy shim (P0 ISR-fix, verbeterplan v3): de publieke render-route leeft
 * nu op `/p/[workspace]/[slug]` (pad-params → statisch cachebaar). Deze oude
 * vorm (`/p/<slug>?workspace=<ws>`) bestond alleen als intern rewrite-target
 * van de middleware en als single-tenant-fallback voor de (inmiddels
 * hand-gecodeerde) marketing-pagina's. Voor het onwaarschijnlijke geval dat
 * een oude URL extern is blijven hangen: redirect naar de canonieke vorm;
 * zonder workspace-query is er niets te resolven → 404.
 */
interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function LegacyPublishedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { workspace } = await searchParams;

  if (workspace) {
    permanentRedirect(`/p/${encodeURIComponent(workspace)}/${encodeURIComponent(slug)}`);
  }

  notFound();
}
