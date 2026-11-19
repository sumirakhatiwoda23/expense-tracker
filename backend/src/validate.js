export const CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "bills",
  "fun",
  "health",
  "other",
];

export const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "JPY", "AED"];

const MAX_MONEY = 9_999_999_999.99;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = status < 500;
  }
}

const roundMoney = (value) => Math.round(value * 100) / 100;

export function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Invalid expense id.");
  }
  return id;
}

export function parseExpense(body = {}) {
  const title = String(body.title ?? "").trim();
  if (!title) {
    throw new HttpError(400, "Give the expense a name.");
  }
  if (title.length > 60) {
    throw new HttpError(400, "Expense name must be 60 characters or fewer.");
  }

  const rawAmount = Number(body.amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new HttpError(400, "Amount must be greater than zero.");
  }
  if (rawAmount > MAX_MONEY) {
    throw new HttpError(400, "Amount is too large.");
  }
  const amount = roundMoney(rawAmount);

  const category = body.category ?? "other";
  if (!CATEGORIES.includes(category)) {
    throw new HttpError(400, "Unknown category.");
  }

  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, "Date must look like YYYY-MM-DD.");
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new HttpError(400, "That date does not exist.");
  }

  return { title, amount, category, date };
}

export function parseBudget(raw) {
  const budget = Number(raw);
  if (!Number.isFinite(budget) || budget < 0) {
    throw new HttpError(400, "Budget must be zero or a positive number.");
  }
  if (budget > MAX_MONEY) {
    throw new HttpError(400, "Budget is too large.");
  }
  return roundMoney(budget);
}

export function parseCurrency(raw) {
  const currency = String(raw ?? "").toUpperCase();
  if (!CURRENCIES.includes(currency)) {
    throw new HttpError(400, "Unsupported currency.");
  }
  return currency;
}
