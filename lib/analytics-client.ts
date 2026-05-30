export const postHogClientConfig = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
};
