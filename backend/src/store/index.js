import { createMysqlStore } from "./mysql.js";
import { createSqliteStore } from "./sqlite.js";

let current = null;

/**
 * DB_CLIENT:
 *   auto   → try MySQL, fall back to SQLite (default)
 *   mysql  → require MySQL
 *   sqlite → use the embedded SQLite file
 */
export async function initStore() {
  const mode = String(process.env.DB_CLIENT || "auto").toLowerCase();

  if (mode === "sqlite") {
    current = createSqliteStore();
    await current.init();
    return { client: "sqlite", file: current.file };
  }

  if (mode === "mysql") {
    current = createMysqlStore();
    await current.init();
    return { client: "mysql" };
  }

  if (mode !== "auto") {
    throw new Error(`Unknown DB_CLIENT "${mode}" — use auto, mysql or sqlite.`);
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
