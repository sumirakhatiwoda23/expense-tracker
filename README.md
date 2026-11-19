# Paisa — Full-Stack Expense Ledger

A complete expense tracker with a **React** frontend, a **Node.js + Express** API,
and a **SQL database** you can inspect in **DBeaver**.

```
React (Vite)  ──HTTP──▶  Express API  ──▶  SQLite file (default)
  :5173                     :4000      └─▶  MySQL 8 (when configured)
```

The backend prefers **MySQL**, and automatically falls back to a local **SQLite**
file when MySQL isn't configured. That means the app runs immediately with zero
database setup — and switches to MySQL as soon as the app user exists.

## Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Frontend  | React 19, Vite 8, plain CSS                  |
| Backend   | Node.js, Express 5, mysql2, node:sqlite      |
| Database  | SQLite (default) or MySQL 8 (DBeaver-ready)  |
| Dev tools | nodemon, concurrently, Vite proxy            |

## Quick start

```bash
npm run install:all   # already done if node_modules exist
npm run dev
```

Then open:

- **Frontend: <http://localhost:5173>**
- API health: <http://localhost:4000/api/health>

On first boot the backend logs which database it picked, e.g.:

```
[db] Using SQLite (MySQL not available)
[db] File: …/backend/data/paisa.db
```

## Using MySQL (optional)

The app user has not been created on the system MySQL server yet. To create it:

```bash
cd paisa-expense-ledger
sudo mysql < backend/setup.sql
```

Or open a SQL editor in DBeaver as an admin user and run `backend/setup.sql`.

Then restart `npm run dev`. With `DB_CLIENT=auto` in `backend/.env`, MySQL is
detected and used instead of SQLite (the server logs `[db] MySQL connected`).
To force a mode, set `DB_CLIENT=mysql` or `DB_CLIENT=sqlite`.

Credentials live in `backend/.env` (user `paisa`, password `paisa_dev_2026`).

## Connect with DBeaver

**SQLite (works right now, no setup):**

1. **Database → New Database Connection → SQLite**
2. Database file: `<project>/backend/data/paisa.db`
3. Open `Tables → expenses` and **View Data**.

**MySQL (after running `backend/setup.sql`):**

1. **Database → New Database Connection → MySQL**
2. Host `localhost` · Port `3306` · Database `paisa_ledger`
3. Username `paisa` · Password `paisa_dev_2026`
4. Test Connection → Finish → open `paisa_ledger → Tables`.

## Production build

```bash
npm run build   # React → frontend/dist
npm start       # Express serves the build + API on :4000
```

Open <http://localhost:4000>.

## Project structure

```
paisa-expense-ledger/
├── frontend/                 React app (Vite)
│   ├── src/
│   │   ├── components/       TopBar, BalanceCard, ExpenseForm, Ledger, …
│   │   ├── lib/              API client, money/date helpers
│   │   ├── App.jsx           state, data loading, actions
│   │   └── styles.css        the Paisa design
│   └── vite.config.js        proxies /api → localhost:4000
├── backend/                  Express API
│   ├── src/
│   │   ├── app.js            routes, validation, static hosting
│   │   ├── server.js         startup/shutdown
│   │   ├── validate.js       request validation
│   │   └── store/
│   │       ├── index.js      picks MySQL or SQLite
│   │       ├── mysql.js      MySQL adapter
│   │       └── sqlite.js     SQLite adapter
│   ├── setup.sql             optional MySQL database + user
│   ├── .env                  DB mode and credentials
│   └── data/paisa.db         SQLite database (created on first run)
├── legacy/                   previous vanilla-JS version (reference only)
└── package.json              root scripts
```

## Database schema

Both adapters expose the same shape.

**expenses**

| Column         | Type / values                                  |
| -------------- | ---------------------------------------------- |
| `id`           | integer, auto increment (primary key)          |
| `title`        | text, max 60 characters                        |
| `amount`       | decimal, always positive                       |
| `category`     | food, transport, shopping, bills, fun, health, other |
| `expense_date` | date (`YYYY-MM-DD`)                            |
| `created_at`   | creation timestamp                             |

**settings** — a single row (`id = 1`) with `budget`; the app uses a fixed
currency of **PKR**, displayed as **Rs** (the `currency` column is kept for
compatibility and always defaults to `PKR`).

## API

| Method   | Route               | Body / params                       | Returns                |
| -------- | ------------------- | ----------------------------------- | ---------------------- |
| `GET`    | `/api/health`       | —                                   | `{ ok, database }`     |
| `GET`    | `/api/expenses`     | —                                   | `{ expenses[] }`       |
| `POST`   | `/api/expenses`     | `{ title, amount, category, date }` | `201 { expense }`      |
| `DELETE` | `/api/expenses/:id` | —                                   | `204`                  |
| `DELETE` | `/api/expenses`     | —                                   | `204` (clear all)      |
| `GET`    | `/api/settings`     | —                                   | `{ budget, currency }` |
| `PUT`    | `/api/settings`     | `{ budget?, currency? }`            | `{ budget, currency }` |
| `GET`    | `/api/export.pdf`   | —                                   | `.pdf` report          |
| `GET`    | `/api/export.xlsx`  | —                                   | `.xlsx` report (opt.)  |
| `DELETE` | `/api/data`         | —                                   | `{ ok: true }`         |

Every request is validated on the server (amount > 0, title ≤ 60, valid date,
known category) and queries use parameter binding.

## Features

- Budget with live remaining balance and progress warnings
- Add/delete expenses stored in the database
- Category breakdown with percentages
- Day-grouped ledger with search and category filters
- Fixed currency: Pakistani Rupees (**Rs**) — no currency switcher
- **Download PDF report** (`.pdf`, drawn server-side with PDFKit, A4):
  - Green title banner and a “All amounts in Pakistani rupees (Rs)” subtitle
  - Summary boxes: budget / spent / remaining / entries
  - Boxed, bordered expense table with dark-green headers and zebra rows
  - Every expense amount in **red**, formatted as `Rs 1,250.00`
  - `TOTAL SPENT` row (red when over budget)
  - **Spending by category** table with counts, red totals, and % share
  - Repeating table header + “continued” marker across pages, page numbers in
    the footer, and cell text truncated with an ellipsis
  - Also available as a styled Excel workbook at `GET /api/export.xlsx`
- Loading, error/retry, and toast feedback
- Responsive layout, `Ctrl/Cmd + K` to search

## Notes

- `legacy/` is the earlier browser-only version; it is not used and can be
  deleted safely.
- For production, use a private `.env`, a strong database password, HTTPS, and
  rate limiting.
