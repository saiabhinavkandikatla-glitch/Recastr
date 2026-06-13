import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  RECASTR_DEMO_MODE: z.string().default("false"),
  REQUIRE_AUTH: z.string().default("true"),
  OPENAI_API_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  EMAIL_PROVIDER: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  POSTING_CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return value;
  return (stripEnvValue(value) ?? "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function normalizeAppUrl(value: string | undefined) {
  const stripped = stripEnvValue(value);
  const vercelUrl = getVercelAppUrl();
  const candidate = stripped
    ? /^https?:\/\//i.test(stripped)
      ? stripped
      : `https://${stripped}`
    : vercelUrl ?? "http://localhost:3000";

  try {
    const origin = new URL(candidate).origin;
    if (process.env.NODE_ENV === "production" && isLocalAppOrigin(origin)) {
      const vercelOrigin = vercelUrl ? new URL(vercelUrl).origin : null;
      if (vercelOrigin && !isLocalAppOrigin(vercelOrigin)) return vercelOrigin;
    }
    return origin;
  } catch {
    if (process.env.NODE_ENV === "production" && vercelUrl) {
      try {
        return new URL(vercelUrl).origin;
      } catch {
        return "https://recastr.vercel.app";
      }
    }
    return "http://localhost:3000";
  }
}

function stripEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function getVercelAppUrl() {
  const productionUrl = stripEnvValue(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const deploymentUrl = stripEnvValue(process.env.VERCEL_URL);
  const candidate = productionUrl ?? deploymentUrl;
  if (!candidate) return undefined;
  return /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
}

function isLocalAppOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  RECASTR_DEMO_MODE: process.env.RECASTR_DEMO_MODE,
  REQUIRE_AUTH: process.env.REQUIRE_AUTH,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  REDIS_URL: process.env.REDIS_URL,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
  SMTP_SECURE: process.env.SMTP_SECURE,
  POSTING_CREDENTIAL_ENCRYPTION_KEY: process.env.POSTING_CREDENTIAL_ENCRYPTION_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
}) as z.infer<typeof envSchema> & {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  demoMode: boolean;
  requireAuth: boolean;
  appUrl: string;
  openaiKey: string | undefined;
  redisUrl: string | undefined;
};

env.NEXT_PUBLIC_SUPABASE_URL = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
env.NEXT_PUBLIC_APP_URL = normalizeAppUrl(env.NEXT_PUBLIC_APP_URL);
env.supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
env.supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
env.demoMode = env.RECASTR_DEMO_MODE === "true";
env.requireAuth = env.REQUIRE_AUTH === "true";
env.appUrl = env.NEXT_PUBLIC_APP_URL;
env.openaiKey = env.OPENAI_API_KEY;
env.redisUrl = env.REDIS_URL;

export function isDemoMode() {
  return env.demoMode;
}

const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !isNextProductionBuild) {
  const required = [
    ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["DATABASE_URL", env.DATABASE_URL],
  ];

  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const leakedServerSecrets = [
    ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY],
    ["NEXT_PUBLIC_OPENAI_API_KEY", process.env.NEXT_PUBLIC_OPENAI_API_KEY],
    ["NEXT_PUBLIC_RAZORPAY_KEY_SECRET", process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET],
    ["NEXT_PUBLIC_DATABASE_URL", process.env.NEXT_PUBLIC_DATABASE_URL],
  ].filter(([, value]) => Boolean(value));

  if (leakedServerSecrets.length) {
    throw new Error(
      `Server secrets must not be prefixed with NEXT_PUBLIC_: ${leakedServerSecrets
        .map(([name]) => name)
        .join(", ")}`,
    );
  }
}
