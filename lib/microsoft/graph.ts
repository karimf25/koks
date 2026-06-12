import { getIntegration, upsertIntegration } from "@/lib/integrations";

// ── Config ─────────────────────────────────────────────────────────────────────

const TENANT = process.env.MS_TENANT || "consumers";
const AUTHORITY = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";

// offline_access -> refresh tokens; Tasks.ReadWrite -> To Do; User.Read -> account info
export const MS_SCOPES = "offline_access Tasks.ReadWrite User.Read";

export function getRedirectUri(): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/microsoft/callback`;
}

export function isMicrosoftConfigured(): boolean {
  return Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

// ── OAuth ──────────────────────────────────────────────────────────────────────

export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID as string,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    response_mode: "query",
    scope: MS_SCOPES,
    state,
  });
  return `${AUTHORITY}/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    throw new Error(`Microsoft token request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return tokenRequest({
    client_id: process.env.MS_CLIENT_ID as string,
    client_secret: process.env.MS_CLIENT_SECRET as string,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    scope: MS_SCOPES,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({
    client_id: process.env.MS_CLIENT_ID as string,
    client_secret: process.env.MS_CLIENT_SECRET as string,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MS_SCOPES,
  });
}

/** Returns a valid access token, refreshing if expired. Null if not connected. */
export async function getValidAccessToken(): Promise<string | null> {
  const integ = await getIntegration("microsoft");
  if (!integ) return null;

  const expSoon = !integ.expiresAt || integ.expiresAt.getTime() < Date.now() + 60_000;
  if (!expSoon) return integ.accessToken;

  if (!integ.refreshToken) return null;
  const tokens = await refreshAccessToken(integ.refreshToken);
  await upsertIntegration({
    provider: "microsoft",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? integ.refreshToken, // MS rotates refresh tokens
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    metadata: integ.metadata as Record<string, unknown>,
  });
  return tokens.access_token;
}

// ── Graph API ──────────────────────────────────────────────────────────────────

async function graph<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `Graph ${init?.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`
    );
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export type MsAccount = { displayName?: string; mail?: string; userPrincipalName?: string };

export async function getMe(token: string): Promise<MsAccount> {
  return graph<MsAccount>(token, "me");
}

export type MsList = {
  id: string;
  displayName: string;
  wellknownListName?: string;
  isOwner?: boolean;
};

export async function listTodoLists(token: string): Promise<MsList[]> {
  const data = await graph<{ value: MsList[] }>(token, "me/todo/lists");
  return data.value;
}

export type MsTask = {
  id: string;
  title: string;
  status: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred";
  importance: "low" | "normal" | "high";
  body?: { content?: string; contentType?: string };
  dueDateTime?: { dateTime: string; timeZone: string } | null;
  completedDateTime?: { dateTime: string; timeZone: string } | null;
  createdDateTime: string;
  lastModifiedDateTime: string;
};

export async function listAllTasks(token: string, listId: string): Promise<MsTask[]> {
  const tasks: MsTask[] = [];
  let url = `me/todo/lists/${listId}/tasks?$top=200`;
  // follow @odata.nextLink for pagination
  // (nextLink is an absolute URL; strip the GRAPH prefix for our helper)
  while (url) {
    const data = await graph<{ value: MsTask[]; "@odata.nextLink"?: string }>(token, url);
    tasks.push(...data.value);
    const next = data["@odata.nextLink"];
    url = next ? next.replace(`${GRAPH}/`, "") : "";
  }
  return tasks;
}

export type MsTaskBody = {
  title?: string;
  status?: MsTask["status"];
  importance?: MsTask["importance"];
  body?: { content: string; contentType: "text" };
  dueDateTime?: { dateTime: string; timeZone: string } | null;
};

export async function createTask(token: string, listId: string, body: MsTaskBody): Promise<MsTask> {
  return graph<MsTask>(token, `me/todo/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTask(
  token: string,
  listId: string,
  taskId: string,
  body: MsTaskBody
): Promise<MsTask> {
  return graph<MsTask>(token, `me/todo/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTask(token: string, listId: string, taskId: string): Promise<void> {
  await graph<null>(token, `me/todo/lists/${listId}/tasks/${taskId}`, { method: "DELETE" });
}
