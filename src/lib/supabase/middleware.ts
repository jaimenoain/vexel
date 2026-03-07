import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/liabilities") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/entities") ||
    pathname.startsWith("/settings");
  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  let user: { id: string } | null = null;
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

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
