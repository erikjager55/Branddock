#!/bin/bash
set -e
echo "🔧 Fix: Prisma 7 config"

# 1. Maak prisma.config.ts aan
cat > prisma/prisma.config.ts << 'EOF'
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "schema.prisma"),
});
EOF
echo "✅ prisma/prisma.config.ts aangemaakt"

# 2. Verwijder url uit datasource in schema
cat > /tmp/fix-datasource.py << 'PYEOF'
import re
with open("prisma/schema.prisma", "r") as f:
    content = f.read()
content = content.replace('  url      = env("DATABASE_URL")\n', '')
with open("prisma/schema.prisma", "w") as f:
    f.write(content)
PYEOF
python3 /tmp/fix-datasource.py
echo "✅ url verwijderd uit schema.prisma"

# 3. Valideer
echo ""
echo "🔍 Validatie..."
npx prisma validate 2>&1

echo ""
echo "📊 Model count: $(grep -c 'model ' prisma/schema.prisma)"
echo ""
echo "✅ Commit:"
echo "   git add -A && git commit -m 'feat: Organization + Agency model + Prisma 7 config'"
