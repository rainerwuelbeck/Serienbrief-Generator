import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isValidCookie } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidCookie(cookie)) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Alles außer Login-Seite/-API, Next-interne Assets und öffentliche statische Dateien.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|fonts/|stock-photos/).*)",
  ],
};
