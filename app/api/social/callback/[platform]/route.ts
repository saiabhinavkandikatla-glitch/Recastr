import { NextResponse, type NextRequest } from "next/server";
import { encryptToken } from "@/lib/crypto";
import {
  exchangeOAuthCode,
  fetchSocialProfile,
  parseOAuthState,
} from "@/lib/social/oauth";
import { isPublishingPlatform } from "@/lib/social/types";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const stateCookieName = "recastr_social_oauth_state";

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } },
) {
  const settingsUrl = new URL("/settings?tab=connected", request.url);

  try {
    if (!isPublishingPlatform(params.platform)) {
      settingsUrl.searchParams.set("social_error", "unsupported");
      return NextResponse.redirect(settingsUrl);
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const cookieState = request.cookies.get(stateCookieName)?.value;
    if (!code || !state || !cookieState || state !== cookieState) {
      throw new Error("Invalid OAuth callback state");
    }

    const parsedState = parseOAuthState(state);
    if (parsedState.platform !== params.platform) throw new Error("OAuth platform mismatch");

    const token = await exchangeOAuthCode(params.platform, code, parsedState.codeVerifier);
    const profile = await fetchSocialProfile(params.platform, token.access_token);
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined;

    await prisma.socialAccount.upsert({
      where: {
        userId_platform: {
          userId: parsedState.userId,
          platform: params.platform,
        },
      },
      update: {
        accessToken: encryptToken(token.access_token),
        refreshToken: token.refresh_token ? encryptToken(token.refresh_token) : undefined,
        handle: profile.handle,
        platformId: profile.platformId,
        expiresAt,
      },
      create: {
        userId: parsedState.userId,
        platform: params.platform,
        accessToken: encryptToken(token.access_token),
        refreshToken: token.refresh_token ? encryptToken(token.refresh_token) : undefined,
        handle: profile.handle,
        platformId: profile.platformId,
        expiresAt,
      },
    });

    settingsUrl.searchParams.set("social_connected", params.platform);
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(stateCookieName);
    return response;
  } catch (error) {
    settingsUrl.searchParams.set(
      "social_error",
      error instanceof Error ? error.message : "callback_failed",
    );
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(stateCookieName);
    return response;
  }
}
