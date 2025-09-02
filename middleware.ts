import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({
              request: req,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Use a timeout for middleware auth check (500ms)
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Middleware auth timeout")), 500),
    );

    let user = null;
    try {
      const { data, error } = (await Promise.race([
        authPromise,
        timeoutPromise,
      ])) as {
        data: { user: { id: string; email?: string } | null };
        error: { message: string } | null;
      };
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // On auth timeout, let request proceed without redirect
      return supabaseResponse;
    }

    const url = req.nextUrl.clone();

    // Protected routes that require authentication
    const protectedRoutes = ["/dashboard", "/polls/create", "/polls/edit"];
    const isProtectedRoute = protectedRoutes.some((route) =>
      url.pathname.startsWith(route),
    );

    // Auth routes that should redirect if already authenticated
    const authRoutes = ["/login", "/register"];
    const isAuthRoute = authRoutes.includes(url.pathname);

    // If user is not authenticated and trying to access protected route
    if (!user && isProtectedRoute) {
      url.pathname = "/login";
      url.searchParams.set("redirectTo", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // If user is authenticated and trying to access auth route
    if (user && isAuthRoute) {
      const redirectTo = url.searchParams.get("redirectTo");
      url.pathname = redirectTo || "/dashboard";
      url.searchParams.delete("redirectTo");
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    // On any middleware error, let the request proceed
    return supabaseResponse;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handle auth separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
