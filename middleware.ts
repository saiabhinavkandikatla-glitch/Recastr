import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/projects",
  "/generate",
  "/schedule",
  "/tasks",
  "/settings",
  "/onboarding",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return withCors(request, withSecurityHeaders(new NextResponse(null, { status: 204 })));
  }

  let response = withSecurityHeaders(NextResponse.next({ request }));
  if (pathname === "/login" || pathname === "/signup") return response;

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let hasUser = false;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = withSecurityHeaders(NextResponse.next({ request }));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const {
        data: { user },
      } = session ? await supabase.auth.getUser() : { data: { user: null } };

      hasUser = Boolean(user);
    } catch {
      hasUser = false;
    }
  }

  if (process.env.REQUIRE_AUTH !== "false" && isProtectedPath(pathname) && !hasUser) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withCors(request, response);
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return value;
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
}

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function withCors(request: NextRequest, response: NextResponse) {
  if (!request.nextUrl.pathname.startsWith("/api")) return response;

  const allowedOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const origin = normalizeOrigin(request.headers.get("origin") ?? undefined);
  const isCrossOriginRequest = Boolean(origin);
  const isLocalhost =
    origin?.includes("localhost") ||
    origin?.includes("127.0.0.1") ||
    origin?.includes("[::1]");

  response.headers.set("Access-Control-Allow-Headers", "authorization,content-type,x-demo-mode");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");

  if (process.env.NODE_ENV !== "production" && isLocalhost) {
    response.headers.set("Access-Control-Allow-Origin", origin ?? "*");
    return response;
  }

  if (!allowedOrigin && process.env.NODE_ENV === "production" && isCrossOriginRequest) {
    return withSecurityHeaders(new NextResponse("Invalid request origin", { status: 403 }));
  }

  if (allowedOrigin && origin && !isAllowedCorsOrigin(origin, allowedOrigin)) {
    return withSecurityHeaders(new NextResponse("Invalid request origin", { status: 403 }));
  }

  response.headers.set("Access-Control-Allow-Origin", origin ?? allowedOrigin ?? "*");

  return response;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
      "frame-src https://challenges.cloudflare.com",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
}

function isAllowedCorsOrigin(origin: string, allowedOrigin: string) {
  if (origin === allowedOrigin) return true;

  try {
    const originUrl = new URL(origin);
    const allowedUrl = new URL(allowedOrigin);
    if (originUrl.protocol !== allowedUrl.protocol) return false;

    const originHost = originUrl.hostname.toLowerCase();
    const allowedHost = allowedUrl.hostname.toLowerCase();

    return (
      originHost === `www.${allowedHost}` ||
      `www.${originHost}` === allowedHost
    );
  } catch {
    return false;
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/projects/:path*",
    "/generate/:path*",
    "/schedule/:path*",
    "/tasks/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
