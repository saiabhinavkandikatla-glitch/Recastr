"use client";

export const hasSupabaseBrowserConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const canUseLocalAuthFallback =
  process.env.NODE_ENV !== "production" && !hasSupabaseBrowserConfig;

export async function createSupabaseBrowserClient() {
  const { createBrowserClient } = await import("@supabase/ssr");

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
      },
    },
  );
}
