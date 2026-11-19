import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "./store/index.js";
import { buildExpenseWorkbook, reportFilename } from "./export.js";
import { buildExpensePdf, pdfFilename } from "./exportPdf.js";
import {
  HttpError,
  parseId,
  parseExpense,
  parseBudget,
  parseCurrency,
} from "./validate.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

/* ------------------------------------------------------------
   Health
   ------------------------------------------------------------ */

app.get("/api/health", async (req, res, next) => {
  try {
    const store = getStore();
    await store.ping();
    res.json({ ok: true, database: store.client });
  } catch (err) {
    err.status = 503;
    next(err);
  }
});

/* ------------------------------------------------------------
   Expenses
   ------------------------------------------------------------ */

app.get("/api/expenses", async (req, res, next) => {
  try {
    res.json({ expenses: await getStore().listExpenses() });
  } catch (err) {
    next(err);
  }
});

app.post("/api/expenses", async (req, res, next) => {
  try {
    const expense = parseExpense(req.body);
    const created = await getStore().createExpense(expense);
    res.status(201).json({ expense: created });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/expenses/:id", async (req, res, next) => {
  try {
    const removed = await getStore().deleteExpense(parseId(req.params.id));
    if (!removed) throw new HttpError(404, "That expense no longer exists.");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

app.delete("/api/expenses", async (req, res, next) => {
  try {
    await getStore().clearExpenses();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   Settings (single row: budget + currency)
   ------------------------------------------------------------ */

app.get("/api/settings", async (req, res, next) => {
  try {
    res.json(await getStore().getSettings());
  } catch (err) {
    next(err);
  }
});

app.put("/api/settings", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const store = getStore();
    const current = await store.getSettings();
    const budget =
      body.budget === undefined ? current.budget : parseBudget(body.budget);
    const currency =
      body.currency === undefined
        ? current.currency
        : parseCurrency(body.currency);

    res.json(await store.saveSettings({ budget, currency }));
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   Erase everything
   ------------------------------------------------------------ */

app.delete("/api/data", async (req, res, next) => {
  try {
    await getStore().eraseAll();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   PDF report (download button)
   ------------------------------------------------------------ */

app.get("/api/export.pdf", async (req, res, next) => {
  try {
    const store = getStore();
    const [expenses, settings] = await Promise.all([
      store.listExpenses(),
      store.getSettings(),
    ]);
    const buffer = await buildExpensePdf({ expenses, settings });
    const filename = pdfFilename();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   Excel report (optional)
   ------------------------------------------------------------ */

app.get("/api/export.xlsx", async (req, res, next) => {
  try {
    const store = getStore();
    const [expenses, settings] = await Promise.all([
      store.listExpenses(),
      store.getSettings(),
    ]);
    const buffer = await buildExpenseWorkbook({ expenses, settings });
    const filename = reportFilename();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------
   Unknown API routes
   ------------------------------------------------------------ */

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

/* ------------------------------------------------------------
   Production: serve the built React app (frontend/dist)
   ------------------------------------------------------------ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../frontend/dist");

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

/* ------------------------------------------------------------
   Errors
   ------------------------------------------------------------ */

app.use((err, req, res, next) => {
  const status = Number(err.status) || 500;
  const isJsonParse = err.type === "entity.parse.failed";

  if (status >= 500) {
    console.error(`[api] ${req.method} ${req.path} —`, err.message);
  }

  res.status(isJsonParse ? 400 : status).json({
    error: isJsonParse
      ? "Request body is not valid JSON."
      : status >= 500
        ? "Something went wrong on the server."
        : err.message,
  });
});
