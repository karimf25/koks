import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getMe } from "@/lib/microsoft/graph";
import { upsertIntegration } from "@/lib/integrations";

// OAuth redirect target. Verifies state, exchanges the code, stores tokens.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const settingsUrl = new URL("/settings", origin);

  const oauthError = searchParams.get("error");
  if (oauthError) {
    settingsUrl.searchParams.set("ms", "error");
    settingsUrl.searchParams.set("msg", searchParams.get("error_description") ?? oauthError);
    return NextResponse.redirect(settingsUrl);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("ms_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    settingsUrl.searchParams.set("ms", "error");
    settingsUrl.searchParams.set("msg", "Invalid or expired sign-in state. Please try again.");
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete("ms_oauth_state");
    return res;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const me = await getMe(tokens.access_token);
    await upsertIntegration({
      provider: "microsoft",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      metadata: { account: me.mail || me.userPrincipalName || me.displayName || "Microsoft account" },
    });
    settingsUrl.searchParams.set("ms", "connected");
  } catch (e) {
    settingsUrl.searchParams.set("ms", "error");
    settingsUrl.searchParams.set("msg", e instanceof Error ? e.message : String(e));
  }

  const res = NextResponse.redirect(settingsUrl);
  res.cookies.delete("ms_oauth_state");
  return res;
}
