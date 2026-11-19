import mysql from "mysql2/promise";

const mapExpense = (row) => ({
  id: row.id,
  title: row.title,
  amount: Number(row.amount),
  category: row.category,
  date: row.expense_date,
  createdAt: row.created_at,
});

export function createMysqlStore() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "paisa",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "paisa_ledger",
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true,
    charset: "utf8mb4",
  });

  return {
    client: "mysql",

    async init() {
      await pool.query("SELECT 1");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          title VARCHAR(60) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          category ENUM('food','transport','shopping','bills','fun','health','other')
            NOT NULL DEFAULT 'other',
          expense_date DATE NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_expense_date (expense_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id TINYINT UNSIGNED NOT NULL,
          budget DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          currency CHAR(3) NOT NULL DEFAULT 'PKR',
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT chk_settings_single_row CHECK (id = 1)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        INSERT INTO settings (id, budget, currency)
        VALUES (1, 0.00, 'PKR')
        ON DUPLICATE KEY UPDATE id = id
      `);
    },

    async ping() {
      await pool.query("SELECT 1");
    },

    async listExpenses() {
      const [rows] = await pool.query(`
        SELECT id, title, amount, category, expense_date, created_at
        FROM expenses
        ORDER BY expense_date DESC, created_at DESC, id DESC
      `);
      return rows.map(mapExpense);
    },

    async createExpense(expense) {
      const [result] = await pool.execute(
        `INSERT INTO expenses (title, amount, category, expense_date)
         VALUES (?, ?, ?, ?)`,
        [expense.title, expense.amount, expense.category, expense.date]
      );
      const [rows] = await pool.execute(
        `SELECT id, title, amount, category, expense_date, created_at
         FROM expenses WHERE id = ?`,
        [result.insertId]
      );
      return mapExpense(rows[0]);
    },

    async deleteExpense(id) {
      const [result] = await pool.execute(
        "DELETE FROM expenses WHERE id = ?",
        [id]
      );
      return result.affectedRows > 0;
    },

    async clearExpenses() {
      await pool.query("DELETE FROM expenses");
    },

    async getSettings() {
      const [rows] = await pool.execute(
        "SELECT budget, currency FROM settings WHERE id = 1"
      );
      if (rows.length === 0) return { budget: 0, currency: "PKR" };
      return {
        budget: Number(rows[0].budget),
        currency: rows[0].currency,
      };
    },

    async saveSettings({ budget, currency }) {
      await pool.execute(
        "UPDATE settings SET budget = ?, currency = ? WHERE id = 1",
        [budget, currency]
      );
      return { budget, currency };
    },

    async eraseAll() {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM expenses");
        await conn.query("UPDATE settings SET budget = 0 WHERE id = 1");
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
