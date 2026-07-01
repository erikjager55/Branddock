import { z } from "zod";

const envSchema = z.object({
  // Required — app will not start without these
  // NOTE: These must also be provided in .github/workflows/ci.yml for the build step
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),

  // Optional with warning — AI features won't work without these
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Production-critical optional — losing these in production breaks features
  // Warned-not-required om dev-bootstrap niet te blokkeren.
  TOKEN_ENCRYPTION_KEY: z.string().optional(), // verlies = bricked OAuth tokens
  CRON_SECRET: z.string().optional(),
  WEBHOOK_TRIGGER_SECRET: z.string().optional(),

  // Stripe billing (vereist post stripe-billing-live task)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Sentry error tracking (production-only)
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // R2 / object storage (productie uploads)
  // Canonieke namen matchen de storage-code (src/lib/storage/r2-storage.ts):
  // R2_BUCKET_NAME + optionele R2_PUBLIC_URL (volledige CDN-base-URL). De oude
  // R2_BUCKET / R2_PUBLIC_DOMAIN werden door de code NOOIT gelezen → uploads
  // gingen stil naar de default-bucket zonder public URL.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Optional silent — enrichment and integrations
  ARENA_API_TOKEN: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  S2_API_KEY: z.string().optional(),
  FAL_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RUNWAYML_API_SECRET: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  EMAILIT_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  DEVELOPER_EMAILS: z.string().optional(),
});

let validated = false;

export function validateEnv(): void {
  // Only validate once per process
  if (validated) return;
  validated = true;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.message !== undefined)
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`);

    throw new Error(
      `Missing required environment variables:\n${missing.join("\n")}\n\n` +
      `Check your .env.local file or see .env.example for reference.`
    );
  }

  // Warn for missing AI provider keys
  const aiWarnings: string[] = [];
  if (!result.data.OPENAI_API_KEY) aiWarnings.push("OPENAI_API_KEY");
  if (!result.data.ANTHROPIC_API_KEY) aiWarnings.push("ANTHROPIC_API_KEY");
  if (!result.data.GEMINI_API_KEY) aiWarnings.push("GEMINI_API_KEY");

  if (aiWarnings.length > 0) {
    console.warn(
      `\u26a0\ufe0f WARNING: Missing AI provider keys: ${aiWarnings.join(", ")}. ` +
      `AI features will not work without these.`
    );
  }

  // Production-only warnings: vars die in prod kritisch zijn maar in dev geen
  // probleem. Alleen waarschuwen als NODE_ENV=production zodat dev-bootstrap
  // niet vol log-noise zit.
  if (process.env.NODE_ENV === 'production') {
    const prodWarnings: string[] = [];
    if (!result.data.TOKEN_ENCRYPTION_KEY) prodWarnings.push("TOKEN_ENCRYPTION_KEY (OAuth tokens niet versleuteld)");
    if (!result.data.NEXT_PUBLIC_SENTRY_DSN) prodWarnings.push("NEXT_PUBLIC_SENTRY_DSN (geen error-tracking)");
    if (!result.data.CRON_SECRET) prodWarnings.push("CRON_SECRET (cron endpoint niet beveiligd)");
    if (prodWarnings.length > 0) {
      console.warn(
        `\u26a0\ufe0f PRODUCTION WARNING: Missing critical vars:\n${prodWarnings.map((w) => `  - ${w}`).join("\n")}`
      );
    }
  }
}
