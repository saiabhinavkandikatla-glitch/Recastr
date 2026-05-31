"use client";

export const hasSupabaseBrowserConfig = Boolean(
  normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const canUseLocalAuthFallback =
  process.env.NODE_ENV !== "production" && !hasSupabaseBrowserConfig;

export async function createSupabaseBrowserClient() {
  const { createBrowserClient } = await import("@supabase/ssr");

  return createBrowserClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
      },
    },
  );
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return value;
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
}
