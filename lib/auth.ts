import { cookies } from "next/headers";
import { getIronSession, IronSession } from "iron-session";

export interface SessionData {
  userId: string;
  authenticated: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "lifeos-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getIronSessionInstance(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getSession(): Promise<SessionData | null> {
  const session = await getIronSessionInstance();
  if (!session.authenticated) return null;
  return session;
}

export async function createSession(): Promise<void> {
  const session = await getIronSessionInstance();
  session.userId = "owner";
  session.authenticated = true;
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getIronSessionInstance();
  session.destroy();
}
