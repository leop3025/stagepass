import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAuthSecret } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicOrganizerRoutes = ["/organiser/login", "/organiser/register"];
  const needsAuth =
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/organiser") && !publicOrganizerRoutes.includes(pathname)) ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout");

  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get("tb_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    const loginPath = pathname.startsWith("/organiser") ? "/organiser/login" : "/login";
    url.pathname = loginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const role = String(payload.role ?? "CUSTOMER");
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/organiser") && role !== "ORGANISER") {
      const url = req.nextUrl.clone();
      url.pathname = "/organiser/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = pathname.startsWith("/organiser") ? "/organiser/login" : "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/organiser/:path*", "/account/:path*", "/checkout/:path*"],
};
