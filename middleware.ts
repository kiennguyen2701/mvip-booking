import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/admin/:path*",
    "/api/supplier/:path*",
    "/api/agent/:path*",
    "/api/customer/:path*",
    "/auth/callback",
  ],
};