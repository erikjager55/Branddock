-- Voegt VOICEGUIDE toe aan VersionedResourceType enum.
-- Nodig voor alignment-fix reroute path (ADR 2026-05-15): wanneer een fix
-- contentGuidelines / writingGuidelines op een Brandstyle entity targette en
-- via fix-generator naar BrandVoiceguide gerouteerd wordt, krijgt de
-- ResourceVersion snapshot nu de juiste resourceType in plaats van een
-- mis-attributed STYLEGUIDE label.

ALTER TYPE "VersionedResourceType" ADD VALUE 'VOICEGUIDE';
