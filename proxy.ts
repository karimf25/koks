import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/integrations/microsoft/callback",
];

const MCP_PATH = "/api/mcp";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // MCP endpoint: bearer token auth
  if (pathname.startsWith(MCP_PATH)) {
    const auth = request.headers.get("authorization");
    const expected = `Bearer ${process.env.MCP_API_KEY}`;
    if (!auth || auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // All other routes: require session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, {
    password: process.env.SESSION_SECRET as string,
    cookieName: "lifeos-session",
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
  });

  if (!session.authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
