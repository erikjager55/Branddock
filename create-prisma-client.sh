#!/bin/bash
set -e
echo "🔧 Prisma client singleton aanmaken"

# 1. Maak src/lib directory aan
mkdir -p src/lib

# 2. Schrijf prisma.ts
cat > src/lib/prisma.ts << 'EOF'
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is niet geconfigureerd in .env");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
EOF

echo "✅ src/lib/prisma.ts aangemaakt"

# 3. Check of PostgreSQL lokaal draait
echo ""
echo "🔍 Database check..."
if command -v psql &> /dev/null; then
  psql "postgresql://erikjager:@localhost:5432/branddock" -c "SELECT 1;" 2>&1 && echo "✅ Database bereikbaar" || echo "⚠️  Database niet bereikbaar — draai: createdb branddock"
else
  echo "⚠️  psql niet gevonden. Zorg dat PostgreSQL geïnstalleerd en actief is."
fi

echo ""
echo "✅ Commit:"
echo "   git add -A && git commit -m 'feat: add Prisma client singleton (src/lib/prisma.ts)'"
