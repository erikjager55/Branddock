/**
 * Env-preload. MOET als eerste geïmporteerd worden (vóór `src/lib/prisma`),
 * zodat `.env.local` geladen is voordat de Prisma-client `DATABASE_URL` op
 * module-eval leest. dotenv overschrijft bestaande shell-vars NIET, dus een
 * expliciete `DATABASE_URL=…`-prefix wint (runbook), en een kale run valt
 * veilig terug op de lokale DB uit .env.local i.p.v. een verdwaalde prod-URL.
 */
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
