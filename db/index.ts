import "server-only"; // hard guard: fail the build if the DB layer is ever pulled into a client bundle
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createClient() {
  return postgres(process.env.DATABASE_URL as string, {
    max: 1,
    ssl: "require",
    prepare: false,
    idle_timeout: 20, // release idle pooler connections quickly
    types: {
      // OID 1082 = date — return as YYYY-MM-DD string so PgDateString.mapFromDriverValue
      // receives a string and short-circuits instead of calling .toISOString() on a Date.
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: string | Date) =>
          x instanceof Date ? x.toISOString().split("T")[0] : x,
        parse: (x: string) => x,
      },
    },
  });
}

// Cache the client on globalThis. In dev, Turbopack/HMR re-evaluates this module
// on every change; without this each reload would open a NEW postgres pool and
// leak connections until the Supabase pooler refuses new ones (queries then fail).
const globalForDb = globalThis as unknown as { _pgClient?: ReturnType<typeof createClient> };
const client = globalForDb._pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema });
export * from "./schema";
