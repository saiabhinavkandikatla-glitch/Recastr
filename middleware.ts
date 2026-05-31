import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/projects",
  "/schedule",
  "/tasks",
  "/settings",
  "/onboarding",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  let response = NextResponse.next({ request });
  if (pathname === "/login" || pathname === "/signup") return response;

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let hasUser = false;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const {
      data: { user },
    } = session ? await supabase.auth.getUser() : { data: { user: null } };

    hasUser = Boolean(user);
  }

  if (process.env.REQUIRE_AUTH === "true" && isProtectedPath(pathname) && !hasUser) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
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

  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get("origin");
  const isCrossOriginRequest = Boolean(origin);

  if (!allowedOrigin && process.env.NODE_ENV === "production" && isCrossOriginRequest) {
    return new NextResponse("CORS origin denied", { status: 403 });
  }

  if (!allowedOrigin && process.env.NODE_ENV !== "production" && isCrossOriginRequest) {
    console.warn("NEXT_PUBLIC_APP_URL is unset; development API CORS is permissive.");
  }

  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return new NextResponse("CORS origin denied", { status: 403 });
  }

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Headers", "authorization,content-type,x-demo-mode");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/projects/:path*",
    "/schedule/:path*",
    "/tasks/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
