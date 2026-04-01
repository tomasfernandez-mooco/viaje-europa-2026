import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// JWT configuration for session authentication
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "europa-2026-secret-key-change-in-production"
);

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/register",
  "/api/auth/register",
  "/api/telegram/setup",
  "/api/telegram/webhook",
  "/api/telegram/debug",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    pathname.startsWith("/api/") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    // Redirect root to /trips
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/trips", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all page routes but NOT API routes, static files, or images
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
