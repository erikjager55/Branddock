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

  // Optional silent — enrichment and integrations
  ARENA_API_TOKEN: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  S2_API_KEY: z.string().optional(),
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
  const warnings: string[] = [];
  if (!result.data.OPENAI_API_KEY) warnings.push("OPENAI_API_KEY");
  if (!result.data.ANTHROPIC_API_KEY) warnings.push("ANTHROPIC_API_KEY");
  if (!result.data.GEMINI_API_KEY) warnings.push("GEMINI_API_KEY");

  if (warnings.length > 0) {
    console.warn(
      `\u26a0\ufe0f WARNING: Missing AI provider keys: ${warnings.join(", ")}. ` +
      `AI features will not work without these.`
    );
  }
}
