import "dotenv/config";
import { app } from "./app.js";
import { initStore, closeStore } from "./store/index.js";

const port = Number(process.env.PORT || 4000);

let info;
try {
  info = await initStore();
  if (info.client === "mysql") {
    console.log("[db] MySQL connected and schema ready");
  } else if (info.client === "postgres") {
    console.log("[db] PostgreSQL connected and schema ready");
  } else {
    console.log("[db] Using SQLite (MySQL not available)");
    console.log(`[db] File: ${info.file}`);
    if (info.mysqlError) console.log(`[db] MySQL said: ${info.mysqlError}`);
    console.log(
      "[db] To switch to MySQL: run backend/setup.sql, then restart the server."
    );
  }
} catch (err) {
  console.error("\n[db] Could not start the database layer.");
  console.error(`     ${err.message}\n`);
  process.exit(1);
}

const server = app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] database: ${info.client}`);
});

async function shutdown(signal) {
  console.log(`\n[api] ${signal} received, shutting down…`);
  server.close(async () => {
    await closeStore().catch(() => {});
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
