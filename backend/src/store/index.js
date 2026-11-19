import { createMysqlStore } from "./mysql.js";
import { createPostgresStore } from "./postgres.js";
import { createSqliteStore } from "./sqlite.js";

let current = null;

/**
 * DB_CLIENT:
 *   auto     → PostgreSQL if DATABASE_URL is set, else try MySQL,
 *              then fall back to SQLite (default)
 *   postgres → require DATABASE_URL
 *   mysql    → require MySQL
 *   sqlite   → use the embedded SQLite file
 */
export async function initStore() {
  const mode = String(process.env.DB_CLIENT || "auto").toLowerCase();

  if (mode === "sqlite") {
    current = createSqliteStore();
    await current.init();
    return { client: "sqlite", file: current.file };
  }

  if (mode === "postgres") {
    current = createPostgresStore();
    await current.init();
    return { client: "postgres" };
  }

  if (mode === "mysql") {
    current = createMysqlStore();
    await current.init();
    return { client: "mysql" };
  }

  if (mode !== "auto") {
    throw new Error(
      `Unknown DB_CLIENT "${mode}" — use auto, postgres, mysql or sqlite.`
    );
  }

  if (process.env.DATABASE_URL) {
    const postgres = createPostgresStore();
    await postgres.init();
    current = postgres;
    return { client: "postgres" };
  }

  const candidate = createMysqlStore();
  try {
    await candidate.init();
    current = candidate;
    return { client: "mysql" };
  } catch (err) {
    await candidate.close().catch(() => {});
    const fallback = createSqliteStore();
    await fallback.init();
    current = fallback;
    return {
      client: "sqlite",
      file: fallback.file,
      mysqlError: err.message,
    };
  }
}

export function getStore() {
  if (!current) throw new Error("Database store is not initialized.");
  return current;
}

export async function closeStore() {
  await current?.close();
  current = null;
}
