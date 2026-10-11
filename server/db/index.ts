import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __safetrailSql?: ReturnType<typeof postgres> };

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare: false keeps this compatible with Supabase's transaction pooler.
  return postgres(url, { prepare: false, max: 10, onnotice: () => {} });
}

const sql = globalForDb.__safetrailSql ?? client();
if (process.env.NODE_ENV !== "production") globalForDb.__safetrailSql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema, sql as pg };
