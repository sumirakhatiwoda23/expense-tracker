import pg from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings (no timezone shifting).
pg.types.setTypeParser(1082, (value) => value);

function toISODate(value) {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

const mapExpense = (row) => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
  category: row.category,
  date: toISODate(row.expense_date),
  createdAt: row.created_at,
});

/**
 * PostgreSQL store (used in production, e.g. Render).
 * Requires DATABASE_URL. Set DATABASE_SSL=true for external (public) URLs.
 *
 * The `driver` argument exists so the store can be exercised with an
 * in-memory pg-compatible driver in tests; production uses the real `pg`.
 */
export function createPostgresStore(driver = pg) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for DB_CLIENT=postgres.");
  }

  const useSsl =
    String(process.env.DATABASE_SSL || "").toLowerCase() === "true";

  const pool = new driver.Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX || 5),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  return {
    client: "postgres",

    async init() {
      await pool.query("SELECT 1");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id SERIAL PRIMARY KEY,
          title VARCHAR(60) NOT NULL,
          amount NUMERIC(12,2) NOT NULL,
          category VARCHAR(20) NOT NULL DEFAULT 'other'
            CHECK (category IN ('food','transport','shopping','bills','fun','health','other')),
          expense_date DATE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_expense_date
        ON expenses (expense_date)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          budget NUMERIC(12,2) NOT NULL DEFAULT 0,
          currency CHAR(3) NOT NULL DEFAULT 'PKR',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        INSERT INTO settings (id, budget, currency)
        VALUES (1, 0, 'PKR')
        ON CONFLICT (id) DO NOTHING
      `);
    },

    async ping() {
      await pool.query("SELECT 1");
    },

    async listExpenses() {
      const { rows } = await pool.query(`
        SELECT id, title, amount, category, expense_date, created_at
        FROM expenses
        ORDER BY expense_date DESC, created_at DESC, id DESC
      `);
      return rows.map(mapExpense);
    },

    async createExpense(expense) {
      const { rows } = await pool.query(
        `INSERT INTO expenses (title, amount, category, expense_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id, title, amount, category, expense_date, created_at`,
        [expense.title, expense.amount, expense.category, expense.date]
      );
      return mapExpense(rows[0]);
    },

    async deleteExpense(id) {
      const result = await pool.query(
        "DELETE FROM expenses WHERE id = $1",
        [id]
      );
      return result.rowCount > 0;
    },

    async clearExpenses() {
      await pool.query("DELETE FROM expenses");
    },

    async getSettings() {
      const { rows } = await pool.query(
        "SELECT budget, currency FROM settings WHERE id = 1"
      );
      if (rows.length === 0) return { budget: 0, currency: "PKR" };
      return {
        budget: Number(rows[0].budget),
        currency: rows[0].currency.trim(),
      };
    },

    async saveSettings({ budget, currency }) {
      await pool.query(
        `UPDATE settings
         SET budget = $1, currency = $2, updated_at = NOW()
         WHERE id = 1`,
        [budget, currency]
      );
      return { budget, currency };
    },

    async eraseAll() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM expenses");
        await client.query(
          "UPDATE settings SET budget = 0, updated_at = NOW() WHERE id = 1"
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
