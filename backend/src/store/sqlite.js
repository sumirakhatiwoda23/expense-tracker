import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/paisa.db"
);

const mapExpense = (row) => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
  category: row.category,
  date: row.expense_date,
  createdAt: row.created_at,
});

export function createSqliteStore() {
  const file = process.env.DB_SQLITE_FILE
    ? path.resolve(process.env.DB_SQLITE_FILE)
    : defaultFile;

  let db;

  return {
    client: "sqlite",
    file,

    async init() {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      db = new DatabaseSync(file);
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA foreign_keys = ON");

      db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          category TEXT NOT NULL DEFAULT 'other'
            CHECK (category IN ('food','transport','shopping','bills','fun','health','other')),
          expense_date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          budget NUMERIC NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'PKR',
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      db.prepare(
        `INSERT INTO settings (id, budget, currency)
         VALUES (1, 0, 'PKR')
         ON CONFLICT(id) DO NOTHING`
      ).run();
    },

    async ping() {
      db.prepare("SELECT 1").get();
    },

    async listExpenses() {
      return db
        .prepare(
          `SELECT id, title, amount, category, expense_date, created_at
           FROM expenses
           ORDER BY expense_date DESC, id DESC`
        )
        .all()
        .map(mapExpense);
    },

    async createExpense(expense) {
      const info = db
        .prepare(
          `INSERT INTO expenses (title, amount, category, expense_date)
           VALUES (?, ?, ?, ?)`
        )
        .run(expense.title, expense.amount, expense.category, expense.date);

      const row = db
        .prepare(
          `SELECT id, title, amount, category, expense_date, created_at
           FROM expenses WHERE id = ?`
        )
        .get(info.lastInsertRowid);

      return mapExpense(row);
    },

    async deleteExpense(id) {
      const info = db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
      return info.changes > 0;
    },

    async clearExpenses() {
      db.exec("DELETE FROM expenses");
    },

    async getSettings() {
      const row = db
        .prepare("SELECT budget, currency FROM settings WHERE id = 1")
        .get();
      if (!row) return { budget: 0, currency: "PKR" };
      return { budget: Number(row.budget), currency: row.currency };
    },

    async saveSettings({ budget, currency }) {
      db.prepare(
        "UPDATE settings SET budget = ?, currency = ?, updated_at = datetime('now') WHERE id = 1"
      ).run(budget, currency);
      return { budget, currency };
    },

    async eraseAll() {
      db.exec("BEGIN");
      try {
        db.exec("DELETE FROM expenses");
        db.prepare(
          "UPDATE settings SET budget = 0, updated_at = datetime('now') WHERE id = 1"
        ).run();
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },

    async close() {
      db?.close();
    },
  };
}
