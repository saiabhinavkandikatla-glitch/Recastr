import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
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
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

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
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
}) as z.infer<typeof envSchema> & {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  demoMode: boolean;
  requireAuth: boolean;
  appUrl: string;
  openaiKey: string | undefined;
  redisUrl: string | undefined;
};

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
