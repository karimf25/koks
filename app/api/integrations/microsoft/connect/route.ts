import { NextResponse } from "next/server";
import { getAuthorizeUrl, isMicrosoftConfigured } from "@/lib/microsoft/graph";

// Starts the OAuth flow: set a CSRF state cookie and redirect to Microsoft.
export async function GET() {
  if (!isMicrosoftConfigured()) {
    return NextResponse.json(
      { error: "Microsoft integration not configured (set MS_CLIENT_ID and MS_CLIENT_SECRET)" },
      { status: 503 }
    );
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(getAuthorizeUrl(state));
  res.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
