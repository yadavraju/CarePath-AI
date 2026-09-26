import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — add it to .env.local (local) or the project's environment variables (Vercel).");
  return drizzle(neon(url), { schema });
}

type DB = ReturnType<typeof connect>;
let instance: DB | null = null;

/**
 * Connected on first use, not at import. `next build` imports every route to
 * collect its config, and a build must not need runtime secrets — a missing
 * DATABASE_URL should fail the first query with a clear message, not the deploy.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    instance ??= connect();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
