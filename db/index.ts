import "server-only"; // hard guard: fail the build if the DB layer is ever pulled into a client bundle
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL as string, {
  max: 1,
  ssl: "require",
  prepare: false,
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

export const db = drizzle(client, { schema });
export * from "./schema";
