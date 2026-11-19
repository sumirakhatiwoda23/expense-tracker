import { useRef, useState } from "react";
import { CATEGORIES } from "../constants";
import { todayISO } from "../lib/format";

export default function ExpenseForm({ saving, onAdd }) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(todayISO);
  const amountRef = useRef(null);
  const formRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formRef.current?.reportValidity()) return;

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      amountRef.current?.focus();
      return;
    }

    const ok = await onAdd({
      amount: parsed,
      title: title.trim(),
      category,
      date: date || todayISO(),
    });

    if (ok) {
      setAmount("");
      setTitle("");
      amountRef.current?.focus();
    }
  }

  return (
    <article className="panel add-panel">
      <div className="panel-head">
        <h2>Add an expense</h2>
        <span className="hint">takes 5 seconds</span>
      </div>

      <form id="expenseForm" ref={formRef} onSubmit={handleSubmit} autoComplete="off">
        <label className="amount-field">
          <span className="currency-prefix">Rs</span>
          <input
            ref={amountRef}
            id="amountInput"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            aria-label="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label className="field">
          <span>What was it for?</span>
          <input
            id="titleInput"
            type="text"
            maxLength="60"
            placeholder="e.g. Chai and samosa"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <fieldset className="cats">
          <legend>Category</legend>
          <div className="cat-grid" id="catGrid">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cat-chip${item.id === category ? " is-active" : ""}`}
                data-cat={item.id}
                aria-pressed={item.id === category}
                onClick={() => setCategory(item.id)}
              >
                <span className="emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Date</span>
          <input
            id="dateInput"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <button className="primary-btn" type="submit" disabled={saving}>
          <span>{saving ? "Adding…" : "Add expense"}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </article>
  );
}
