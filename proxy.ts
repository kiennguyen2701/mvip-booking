// proxy.ts — Next.js 16 convention (thay thế middleware.ts)
// Không thay đổi logic auth/role guard — chỉ sửa redirect loop

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const PUBLIC_ROUTES = [
  "/api",
  "/",
  "/login",
  "/register",
  "/restaurants",
  "/auth/callback",
];

const GUEST_ONLY_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function isGuestOnlyRoute(pathname: string) {
  return GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function getDashboardPath(role?: string | null) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "supplier") return "/dashboard/supplier";
  if (role === "agent") return "/dashboard/agent";
  return "/dashboard/customer";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession() = local JWT decode, 0 DB round-trip
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;
  const role = user?.user_metadata?.role as string | undefined;

  // Đã login + vào trang guest-only → redirect về đúng dashboard
  // Exception: nếu URL có ?_loop_guard=1 thì đây là redirect từ trang bị lỗi auth
  // → cho qua để user thấy login form và tự đăng nhập lại, không bounce loop
  const hasLoopGuard = request.nextUrl.searchParams.has("_loop_guard");
  if (user && isGuestOnlyRoute(pathname) && !hasLoopGuard) {
    return NextResponse.redirect(
      new URL(getDashboardPath(role), request.url),
    );
  }

  // Chưa login + vào route protected → redirect về login
  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /dashboard exact → redirect về đúng dashboard của role, 0 DB query
  // Tránh dashboard/page.tsx phải chạy 4 DB queries chỉ để dispatch
  if (user && pathname === "/dashboard") {
    return NextResponse.redirect(
      new URL(getDashboardPath(role), request.url),
    );
  }

  // Role guard tại Edge
  if (user && pathname.startsWith("/dashboard")) {
    const isAdmin = role === "admin";
    const isSupplier = role === "supplier";
    const isAgent = role === "agent";

    if (pathname.startsWith("/dashboard/admin") && !isAdmin) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url),
      );
    }

    if (
      pathname.startsWith("/dashboard/supplier") &&
      !isSupplier &&
      !isAdmin
    ) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url),
      );
    }

    if (pathname.startsWith("/dashboard/agent") && !isAgent && !isAdmin) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url),
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
}