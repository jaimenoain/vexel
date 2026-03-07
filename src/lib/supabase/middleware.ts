import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { tenantConfig } from "../../../tenant-system.config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const ALLOWED_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/auth/callback",
]);

function isProtectedPath(pathname: string): boolean {
  return tenantConfig.routing.protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );
}

/** Redirect while preserving Set-Cookie headers from the session response. */
function redirectWithCookies(response: NextResponse, url: URL): NextResponse {
  const redirectResponse = NextResponse.redirect(url, 307);
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    redirectResponse.headers.append("Set-Cookie", cookie);
  }
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (ALLOWED_PATHS.has(pathname)) {
    if (supabaseUrl && supabaseKey) {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      await supabase.auth.getUser();
    }
    return response;
  }

  let user: { id: string; app_metadata?: Record<string, unknown> } | null = null;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  const tenantId = user?.app_metadata?.tenant_id as string | undefined;

  if (!user) {
    if (isProtectedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirectWithCookies(response, url);
    }
    return response;
  }

  if (tenantId == null || tenantId === "") {
    if (pathname !== tenantConfig.routing.onboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = tenantConfig.routing.onboardingRoute;
      return redirectWithCookies(response, url);
    }
    return response;
  }

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  if (isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = tenantConfig.routing.postOnboardingRoute;
    return redirectWithCookies(response, url);
  }

  return response;
}
