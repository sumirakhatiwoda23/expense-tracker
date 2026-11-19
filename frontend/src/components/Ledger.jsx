import { useEffect, useMemo, useRef } from "react";
import { CATEGORIES, categoryById } from "../constants";
import { dayLabel, money } from "../lib/format";

function EmptyState({ hasExpenses, hasFilters, onClearFilters }) {
  if (!hasExpenses) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          🧾
        </div>
        <h3>No expenses yet</h3>
        <p>
          Add your first expense on the left
          <br />
          and watch the balance update.
        </p>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          🔍
        </div>
        <h3>No matches</h3>
        <p>Nothing fits that filter right now.</p>
        <button type="button" className="link-btn" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  return null;
}

export default function Ledger({
  expenses,
  totalCount,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onDelete,
  onExport,
  removingId,
  loading,
}) {
  const searchRef = useRef(null);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const groups = useMemo(() => {
    const byDate = new Map();
    for (const expense of expenses) {
      if (!byDate.has(expense.date)) byDate.set(expense.date, []);
      byDate.get(expense.date).push(expense);
    }
    return [...byDate.entries()];
  }, [expenses]);

  const visibleTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const hasFilters = filter !== "all" || search.trim() !== "";

  let summary = "0 entries";
  if (loading) {
    summary = "Loading…";
  } else if (totalCount > 0) {
    const count = `${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`;
    summary = `${count}${hasFilters ? " shown" : ""} · ${money(visibleTotal)}`;
  }

  function clearFilters() {
    onFilterChange("all");
    onSearchChange("");
  }

  return (
    <article className="panel ledger-panel">
      <div className="ledger-head">
        <div>
          <h2>Transactions</h2>
          <p className="hint" id="ledgerSummary">
            {summary}
          </p>
        </div>
        <div className="ledger-tools">
          <label className="search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={searchRef}
              id="searchInput"
              type="search"
              placeholder="Search…"
              aria-label="Search expenses"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
          <button
            className="icon-btn small"
            id="exportBtn"
            type="button"
            aria-label="Download PDF report"
            title="Download PDF report"
            onClick={onExport}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="filter-row" id="filterRow">
        <button
          type="button"
          className={`filter-chip${filter === "all" ? " is-active" : ""}`}
          onClick={() => onFilterChange("all")}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`filter-chip${filter === category.id ? " is-active" : ""}`}
            onClick={() => onFilterChange(category.id)}
          >
            <span className="emoji" aria-hidden="true">
              {category.emoji}
            </span>
            {category.label}
          </button>
        ))}
      </div>

      <div className="ledger-list" id="ledgerList">
        {loading ? (
          <div className="ledger-loading">
            <span className="spinner" aria-hidden="true" />
            Loading your ledger…
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            hasExpenses={totalCount > 0}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
          />
        ) : (
          groups.map(([date, items]) => {
            const groupTotal = items.reduce((sum, item) => sum + item.amount, 0);
            return (
              <div className="date-group" key={date}>
                <div className="date-label">
                  <span>{dayLabel(date)}</span>
                  <span className="group-total">
                    {money(groupTotal)}
                  </span>
                </div>

                {items.map((expense) => {
                  const category = categoryById(expense.category);
                  return (
                    <div
                      className={`tx${removingId === expense.id ? " is-removing" : ""}`}
                      key={expense.id}
                    >
                      <div
                        className="tx-icon"
                        style={{
                          background: `${category.color}1f`,
                          color: category.color,
                        }}
                        aria-hidden="true"
                      >
                        {category.emoji}
                      </div>
                      <div className="tx-main">
                        <div className="tx-title">{expense.title}</div>
                        <div className="tx-meta">{category.label}</div>
                      </div>
                      <div className="tx-amount">
                        −{money(expense.amount)}
                      </div>
                      <button
                        type="button"
                        className="tx-delete"
                        aria-label={`Delete ${expense.title}`}
                        title="Delete"
                        onClick={() => onDelete(expense.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
