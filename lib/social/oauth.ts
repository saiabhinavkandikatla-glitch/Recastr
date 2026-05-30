import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type { OAuthTokenResponse, PublishingPlatform, SocialProfile } from "@/lib/social/types";

export type OAuthStatePayload = {
  userId: string;
  platform: PublishingPlatform;
  nonce: string;
  iat: number;
  codeVerifier?: string;
};

export function createOAuthState(payload: OAuthStatePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function parseOAuthState(state: string): OAuthStatePayload {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("Invalid OAuth state");

  const expected = sign(encoded);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
  if (Date.now() - payload.iat > 10 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }
  return payload;
}

export function randomNonce() {
  return randomBytes(24).toString("base64url");
}

export function getAuthorizationUrl(platform: PublishingPlatform, state: string, codeVerifier?: string) {
  const redirectUri = redirectUriFor(platform);

  if (platform === "twitter") {
    requireCredentials(env.TWITTER_CLIENT_ID, env.TWITTER_CLIENT_SECRET, "Twitter");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.TWITTER_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeVerifier ?? state.slice(0, 43),
      code_challenge_method: "plain",
    });
    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  if (platform === "linkedin") {
    requireCredentials(env.LINKEDIN_CLIENT_ID, env.LINKEDIN_CLIENT_SECRET, "LinkedIn");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "openid profile email w_member_social",
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  requireCredentials(env.INSTAGRAM_CLIENT_ID, env.INSTAGRAM_CLIENT_SECRET, "Instagram");
  const params = new URLSearchParams({
    client_id: env.INSTAGRAM_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "user_profile,user_media",
    response_type: "code",
    state,
  });
  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(
  platform: PublishingPlatform,
  code: string,
  codeVerifier?: string,
): Promise<OAuthTokenResponse> {
  const redirectUri = redirectUriFor(platform);

  if (platform === "twitter") {
    requireCredentials(env.TWITTER_CLIENT_ID, env.TWITTER_CLIENT_SECRET, "Twitter");
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier ?? "",
    });
    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWITTER_CLIENT_ID}:${env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    return readTokenResponse(response, "Twitter");
  }

  if (platform === "linkedin") {
    requireCredentials(env.LINKEDIN_CLIENT_ID, env.LINKEDIN_CLIENT_SECRET, "LinkedIn");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.LINKEDIN_CLIENT_ID!,
      client_secret: env.LINKEDIN_CLIENT_SECRET!,
    });
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return readTokenResponse(response, "LinkedIn");
  }

  requireCredentials(env.INSTAGRAM_CLIENT_ID, env.INSTAGRAM_CLIENT_SECRET, "Instagram");
  const body = new URLSearchParams({
    client_id: env.INSTAGRAM_CLIENT_ID!,
    client_secret: env.INSTAGRAM_CLIENT_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return readTokenResponse(response, "Instagram");
}

export async function fetchSocialProfile(
  platform: PublishingPlatform,
  token: string,
): Promise<SocialProfile> {
  if (platform === "twitter") {
    const response = await fetch("https://api.twitter.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return {};
    const data = (await response.json()) as { data?: { id?: string; username?: string } };
    return {
      handle: data.data?.username ? `@${data.data.username}` : undefined,
      platformId: data.data?.id,
    };
  }

  if (platform === "linkedin") {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return {};
    const data = (await response.json()) as { sub?: string; name?: string };
    return { handle: data.name, platformId: data.sub };
  }

  const response = await fetch("https://graph.instagram.com/me?fields=id,username", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return {};
  const data = (await response.json()) as { id?: string; username?: string };
  return {
    handle: data.username ? `@${data.username}` : undefined,
    platformId: data.id,
  };
}

function redirectUriFor(platform: PublishingPlatform) {
  return `${env.appUrl}/api/social/callback/${platform}`;
}

async function readTokenResponse(response: Response, provider: string): Promise<OAuthTokenResponse> {
  if (!response.ok) {
    throw new Error(`${provider} token exchange failed: ${response.status}`);
  }
  const data = (await response.json()) as OAuthTokenResponse;
  if (!data.access_token) throw new Error(`${provider} token response was missing access_token`);
  return data;
}

function requireCredentials(clientId: string | undefined, clientSecret: string | undefined, provider: string) {
  if (!clientId || !clientSecret) {
    throw new Error(`${provider} OAuth is not configured`);
  }
}

function sign(value: string) {
  return createHmac("sha256", stateSecret()).update(value).digest("base64url");
}

function stateSecret() {
  return (
    env.SOCIAL_TOKEN_ENCRYPTION_KEY ??
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "recastr-local-oauth-state"
  );
}
