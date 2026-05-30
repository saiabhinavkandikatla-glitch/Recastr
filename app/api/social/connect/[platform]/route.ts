import { NextResponse, type NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth";
import {
  createOAuthState,
  getAuthorizationUrl,
  randomNonce,
} from "@/lib/social/oauth";
import { isPublishingPlatform } from "@/lib/social/types";

export const runtime = "nodejs";

const stateCookieName = "recastr_social_oauth_state";

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } },
) {
  try {
    if (!isPublishingPlatform(params.platform)) {
      return NextResponse.redirect(new URL("/settings?tab=connected&social_error=unsupported", request.url));
    }

    const user = await getRequestUser(request);
    const codeVerifier = randomNonce();
    const state = createOAuthState({
      userId: user.id,
      platform: params.platform,
      nonce: randomNonce(),
      iat: Date.now(),
      codeVerifier,
    });
    const url = getAuthorizationUrl(params.platform, state, codeVerifier);
    const response = NextResponse.redirect(url);
    response.cookies.set(stateCookieName, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "connect_failed";
    return NextResponse.redirect(
      new URL(`/settings?tab=connected&social_error=${message}`, request.url),
    );
  }
}
