---
id: 2026-02-15-prisma7-pg-adapter
title: Prisma 7 met @prisma/adapter-pg + pg driver
status: accepted
date: 2026-02-15
supersedes: -
superseded-by: -
---

# Context

Branddock heeft een complex datamodel (76+ Prisma modellen, ~28 enums, polymorphic relations zoals `ResourceVersion`, `AICallTrace`, `LearningEvent`). Vereisten:
- Type-safety end-to-end (DB → API → UI)
- pgvector support voor embeddings (BrandVoiceguide centroid, AgentMemory, AICallSnapshot dedup)
- Migration-safe (geen data loss bij schema-wijzigingen)
- Werkt met PostgreSQL 17 lokaal + Neon op productie

Prisma 7 introduceerde een driver-adapter architectuur: `PrismaClient` accepteert geen `connectionString` direct meer, maar een driver-adapter (zoals `@prisma/adapter-pg` met `pg` driver). Dit is een breaking change tov Prisma 6.

# Decision

Adopteer **Prisma 7.4** met:
- `@prisma/adapter-pg` als driver-adapter
- `pg` als underlying driver
- Configuratie in `prisma/prisma.config.ts` (NIET de `url` in `schema.prisma` zelf)
- Generator op `prisma-client-js` (niet `prisma-client` — die werkt niet met `tsx` voor seed scripts)
- `PrismaClient` instantiatie via singleton pattern in `src/lib/prisma.ts`
- pgvector extensie geïnstalleerd op lokaal Postgres + Neon (productie)
- HNSW cosine index op embedding-kolommen via raw SQL (`USING hnsw (embedding vector_cosine_ops)`)

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

# Y-statement

In de context van **complex multi-tenant datamodel met embeddings**, facing **Prisma 7 driver-adapter architectuur als breaking change**, I decided **Prisma 7 + @prisma/adapter-pg + pg + pgvector + HNSW**, to achieve **type-safe schema + native embeddings**, accepting tradeoff **complexere setup dan Prisma 6 + manuele HNSW index via raw SQL**.

# Consequences

## Positief
- End-to-end type-safety (Prisma → TS → React)
- pgvector werkt native — embeddings als first-class kolommen
- Driver-adapter pattern toekomstbestendig (kan later switchen naar `node-postgres-pool`, `Neon serverless`, etc.)
- Migration-safe via `prisma db push` voor dev en `prisma migrate deploy` voor productie

## Negatief / tradeoffs
- Setup is complexer dan Prisma 6 — config-file + adapter + driver i.p.v. één env var
- pgvector kolommen moeten `Unsupported("vector(1536)")` zijn — geen native Prisma-type
- HNSW index niet via Prisma schema definieerbaar — vereist raw SQL na `db push`
- `tsx` werkt niet met `prisma-client` generator — alleen `prisma-client-js`

## Neutraal
- DB user `erikjager` (no password lokaal), DB `branddock`
- Postgres pad: `/opt/homebrew/opt/postgresql@17/bin/psql`

# Alternatives considered

- **Drizzle ORM**: lichter en sneller, maar minder mature voor pgvector + complex polymorphic relations (`AICallTrace` met `parentEntityType`)
- **TypeORM**: ouder, complexer migration-systeem, slechtere TS-inferentie
- **Plain SQL + Kysely**: hoge controle maar geen schema-gegenereerde types

# Notes

pgvector setup:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX IF NOT EXISTS agent_memory_embedding_idx
  ON "AgentMemory" USING hnsw (embedding vector_cosine_ops);
```

Vector literal interpolatie in raw SQL:
```typescript
// src/lib/ai/embeddings.ts
export function toPgVectorLiteral(vec: number[]): string {
  if (!vec.every(Number.isFinite)) throw new Error('non-finite');
  return `[${vec.join(',')}]`;
}
```
