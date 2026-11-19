/* ============================================================
   Paisa — expense ledger
   Vanilla JS, no dependencies. Data is stored in localStorage.
   ============================================================ */

"use strict";

const STORAGE_KEY = "paisa.ledger.v1";

const CATEGORIES = [
  { id: "food",      label: "Food",      emoji: "🍜", color: "#e8890c" },
  { id: "transport", label: "Transport", emoji: "🚕", color: "#3b82f6" },
  { id: "shopping",  label: "Shopping",  emoji: "🛍️", color: "#ec4899" },
  { id: "bills",     label: "Bills",     emoji: "🧾", color: "#8b5cf6" },
  { id: "fun",       label: "Fun",       emoji: "🎮", color: "#0ea5a4" },
  { id: "health",    label: "Health",    emoji: "💊", color: "#ef4444" },
  { id: "other",     label: "Other",     emoji: "📦", color: "#64748b" },
];

const CURRENCIES = {
  PKR: { symbol: "Rs", locale: "en-PK" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-US" },
  GBP: { symbol: "£", locale: "en-US" },
  JPY: { symbol: "¥", locale: "en-US" },
  AED: { symbol: "د.إ", locale: "en-US" },
};

const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const state = {
  budget: 0,
  currency: "PKR",
  expenses: [],
  selectedCategory: "food",
  filter: "all",
  search: "",
};

/* ---------- DOM refs ---------- */

const $ = (sel) => document.querySelector(sel);

const el = {
  remaining: $("#remainingAmount"),
  progress: $("#progressFill"),
  spentLabel: $("#spentLabel"),
  budgetLabel: $("#budgetLabel"),
  budgetStat: $("#budgetStat"),
  spentStat: $("#spentStat"),
  entriesStat: $("#entriesStat"),
  editBudgetBtn: $("#editBudgetBtn"),
  form: $("#expenseForm"),
  amount: $("#amountInput"),
  title: $("#titleInput"),
  date: $("#dateInput"),
  catGrid: $("#catGrid"),
  filterRow: $("#filterRow"),
  ledgerList: $("#ledgerList"),
  ledgerSummary: $("#ledgerSummary"),
  search: $("#searchInput"),
  breakdownList: $("#breakdownList"),
  breakdownHint: $("#breakdownHint"),
  currencySelect: $("#currencySelect"),
  topCurrencySymbol: $("#topCurrencySymbol"),
  settingsBtn: $("#settingsBtn"),
  settingsDialog: $("#settingsDialog"),
  settingsForm: $("#settingsForm"),
  budgetInput: $("#budgetInput"),
  clearDataBtn: $("#clearDataBtn"),
  exportBtn: $("#exportBtn"),
  toast: $("#toast"),
};

/* ---------- Helpers ---------- */

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function money(value) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.PKR;
  const abs = Math.abs(value);
  const decimals = Number.isInteger(abs) ? 0 : 2;
  const formatted = new Intl.NumberFormat(cur.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(abs);
  const gap = /^[A-Za-z]/.test(cur.symbol) ? " " : "";
  return (value < 0 ? "−" : "") + cur.symbol + gap + formatted;
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function totalSpent() {
  return state.expenses.reduce((sum, e) => sum + e.amount, 0);
}

let toastTimer;
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2400);
}

/* ---------- Persistence ---------- */

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        budget: state.budget,
        currency: state.currency,
        expenses: state.expenses,
      })
    );
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return;
  }
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (typeof data.budget === "number" && Number.isFinite(data.budget) && data.budget >= 0) {
      state.budget = data.budget;
    }
    if (data.currency && CURRENCIES[data.currency]) {
      state.currency = data.currency;
    }
    if (Array.isArray(data.expenses)) {
      state.expenses = data.expenses
        .filter((e) => e && typeof e === "object")
        .map((e) => ({
          id: String(e.id || uid()),
          title: String(e.title || "Expense").slice(0, 60),
          amount: Number(e.amount),
          category: CATEGORIES.some((c) => c.id === e.category) ? e.category : "other",
          date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : todayISO(),
          createdAt: Number(e.createdAt) || Date.now(),
        }))
        .filter((e) => Number.isFinite(e.amount) && e.amount > 0);
    }
  } catch (err) {
    console.warn("Could not read saved data:", err);
  }
}

/* ---------- Number animation ---------- */

function animateMoney(node, target) {
  const start = Number(node.dataset.value || 0);
  node.dataset.value = String(target);

  if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = money(target);
    return;
  }

  const duration = 550;
  const t0 = performance.now();

  function frame(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = money(start + (target - start) * eased);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      node.textContent = money(target);
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- Rendering ---------- */

function updateCurrencyUI() {
  const cur = CURRENCIES[state.currency] || CURRENCIES.PKR;
  document.querySelectorAll("[data-currency]").forEach((node) => {
    node.textContent = cur.symbol;
  });
  el.topCurrencySymbol.textContent = cur.symbol;
  el.currencySelect.value = state.currency;
}

function renderBalance() {
  const spent = totalSpent();
  const remaining = state.budget - spent;
  const ratio = state.budget > 0 ? spent / state.budget : 0;
  const pct = state.budget > 0 ? Math.min(ratio * 100, 100) : 0;

  animateMoney(el.remaining, remaining);
  el.remaining.classList.toggle("is-negative", remaining < 0);

  el.progress.style.width = `${pct}%`;
  el.progress.classList.toggle("is-warn", ratio >= 0.75 && ratio < 1);
  el.progress.classList.toggle("is-over", ratio >= 1);

  el.spentLabel.textContent = `${money(spent)} spent`;
  if (state.budget <= 0) {
    el.budgetLabel.textContent = "no budget set";
  } else if (remaining < 0) {
    el.budgetLabel.textContent = `${money(-remaining)} over budget`;
  } else {
    el.budgetLabel.textContent = `of ${money(state.budget)}`;
  }

  el.budgetStat.textContent = money(state.budget);
  el.spentStat.textContent = money(spent);
  el.entriesStat.textContent = String(state.expenses.length);

  el.editBudgetBtn.textContent = state.budget > 0 ? "Edit budget" : "Set budget";
  el.editBudgetBtn.classList.toggle("is-cta", state.budget <= 0);
}

function renderCategoryChips() {
  el.catGrid.innerHTML = CATEGORIES.map(
    (c) => `
      <button type="button" class="cat-chip ${c.id === state.selectedCategory ? "is-active" : ""}"
        data-cat="${c.id}" aria-pressed="${c.id === state.selectedCategory}">
        <span class="emoji" aria-hidden="true">${c.emoji}</span>${c.label}
      </button>`
  ).join("");
}

function renderFilterChips() {
  const chips = [
    `<button type="button" class="filter-chip ${state.filter === "all" ? "is-active" : ""}" data-filter="all">All</button>`,
    ...CATEGORIES.map(
      (c) => `<button type="button" class="filter-chip ${state.filter === c.id ? "is-active" : ""}" data-filter="${c.id}">
        <span class="emoji" aria-hidden="true">${c.emoji}</span>${c.label}
      </button>`
    ),
  ];
  el.filterRow.innerHTML = chips.join("");
}

function dayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });

  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== today.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(undefined, opts);
}

function filteredExpenses() {
  const q = state.search.trim().toLowerCase();
  return state.expenses
    .filter((e) => state.filter === "all" || e.category === state.filter)
    .filter((e) => {
      if (!q) return true;
      const cat = categoryById(e.category);
      return (
        e.title.toLowerCase().includes(q) ||
        cat.label.toLowerCase().includes(q) ||
        e.date.includes(q)
      );
    })
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

function emptyMarkup() {
  const hasFilters = state.filter !== "all" || state.search.trim() !== "";
  if (state.expenses.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">🧾</div>
        <h3>No expenses yet</h3>
        <p>Add your first expense on the left<br>and watch the balance update.</p>
      </div>`;
  }
  if (hasFilters) {
    return `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">🔍</div>
        <h3>No matches</h3>
        <p>Nothing fits that filter right now.</p>
        <button type="button" class="link-btn" data-clear-filters>Clear filters</button>
      </div>`;
  }
  return "";
}

function renderLedger() {
  const list = filteredExpenses();
  const visibleTotal = list.reduce((sum, e) => sum + e.amount, 0);

  const countText = `${list.length} ${list.length === 1 ? "entry" : "entries"}`;
  el.ledgerSummary.textContent =
    state.expenses.length === 0
      ? "0 entries"
      : `${countText}${state.filter !== "all" || state.search.trim() ? " shown" : ""} · ${money(visibleTotal)}`;

  if (list.length === 0) {
    el.ledgerList.innerHTML = emptyMarkup();
    return;
  }

  // Group by date, newest first.
  const groups = new Map();
  for (const expense of list) {
    if (!groups.has(expense.date)) groups.set(expense.date, []);
    groups.get(expense.date).push(expense);
  }

  let html = "";
  for (const [date, items] of groups) {
    const groupTotal = items.reduce((sum, e) => sum + e.amount, 0);
    html += `<div class="date-group">
      <div class="date-label"><span>${dayLabel(date)}</span><span class="group-total">${money(groupTotal)}</span></div>`;

    for (const e of items) {
      const cat = categoryById(e.category);
      html += `
        <div class="tx" data-id="${escapeHTML(e.id)}">
          <div class="tx-icon" style="background:${cat.color}1f;color:${cat.color}" aria-hidden="true">${cat.emoji}</div>
          <div class="tx-main">
            <div class="tx-title">${escapeHTML(e.title)}</div>
            <div class="tx-meta">${cat.label}</div>
          </div>
          <div class="tx-amount">−${money(e.amount)}</div>
          <button type="button" class="tx-delete" data-delete="${escapeHTML(e.id)}"
            aria-label="Delete ${escapeHTML(e.title)}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v5M14 11v5"/>
            </svg>
          </button>
        </div>`;
    }
    html += "</div>";
  }

  el.ledgerList.innerHTML = html;
}

function renderBreakdown() {
  const spent = totalSpent();
  const totals = CATEGORIES.map((c) => ({
    ...c,
    total: state.expenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  if (totals.length === 0) {
    el.breakdownHint.textContent = "no spending yet";
    el.breakdownList.innerHTML =
      `<div class="breakdown-empty">Once you add a few expenses, this will show which categories take the biggest bite out of your budget.</div>`;
    return;
  }

  el.breakdownHint.textContent = `${totals.length} ${totals.length === 1 ? "category" : "categories"} · ${money(spent)} total`;

  el.breakdownList.innerHTML = totals
    .map((c) => {
      const pct = (c.total / spent) * 100;
      const shown = pct < 1 ? "<1" : Math.round(pct);
      return `
        <div class="breakdown-row">
          <div class="breakdown-top">
            <span class="breakdown-label"><i style="background:${c.color}"></i>${c.emoji} ${c.label}</span>
            <span class="breakdown-value">${money(c.total)} · ${shown}%</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width:${Math.max(pct, 1.5)}%;background:${c.color}"></div>
          </div>
        </div>`;
    })
    .join("");
}

function renderAll() {
  updateCurrencyUI();
  renderBalance();
  renderLedger();
  renderBreakdown();
}

/* ---------- Expense actions ---------- */

function addExpense(event) {
  event.preventDefault();

  if (!el.form.checkValidity()) {
    el.form.reportValidity();
    return;
  }

  const amount = Math.round(Number(el.amount.value) * 100) / 100;
  const title = el.title.value.trim();
  const date = el.date.value || todayISO();

  if (!Number.isFinite(amount) || amount <= 0) {
    el.amount.focus();
    toast("Enter an amount greater than zero");
    return;
  }
  if (!title) {
    el.title.focus();
    toast("Give this expense a name");
    return;
  }

  state.expenses.push({
    id: uid(),
    title: title.slice(0, 60),
    amount,
    category: state.selectedCategory,
    date,
    createdAt: Date.now(),
  });

  save();
  renderAll();

  el.amount.value = "";
  el.title.value = "";
  el.amount.focus();
  toast(`Added ${money(amount)} · ${title}`);
}

function deleteExpense(id, row) {
  row.classList.add("is-removing");
  setTimeout(() => {
    const expense = state.expenses.find((e) => e.id === id);
    state.expenses = state.expenses.filter((e) => e.id !== id);
    save();
    renderAll();
    if (expense) toast(`Removed ${money(expense.amount)} · ${expense.title}`);
  }, 190);
}

/* ---------- Settings ---------- */

function openSettings() {
  el.budgetInput.value = state.budget > 0 ? String(state.budget) : "";
  if (typeof el.settingsDialog.showModal === "function") {
    el.settingsDialog.showModal();
  } else {
    el.settingsDialog.setAttribute("open", "");
  }
  setTimeout(() => el.budgetInput.focus(), 40);
}

function saveSettings(event) {
  event.preventDefault();
  const raw = Number(el.budgetInput.value);
  state.budget = Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) / 100 : 0;
  save();
  el.settingsDialog.close();
  renderAll();
  toast(state.budget > 0 ? `Budget set to ${money(state.budget)}` : "Budget cleared");
}

function clearEverything() {
  const ok = window.confirm("Erase all expenses and reset your budget? This cannot be undone.");
  if (!ok) return;

  state.expenses = [];
  state.budget = 0;
  state.filter = "all";
  state.search = "";
  el.search.value = "";
  save();
  el.settingsDialog.close();
  renderFilterChips();
  renderAll();
  toast("Everything erased. Fresh start.");
}

/* ---------- Export ---------- */

function exportCSV() {
  if (state.expenses.length === 0) {
    toast("Nothing to export yet");
    return;
  }

  const cur = CURRENCIES[state.currency] || CURRENCIES.PKR;
  const cell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [["Date", "Expense", "Category", `Amount (${state.currency})`]];

  [...state.expenses]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))
    .forEach((e) => rows.push([e.date, e.title, categoryById(e.category).label, e.amount.toFixed(2)]));

  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paisa-expenses-${todayISO()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  toast(`Exported ${state.expenses.length} ${state.expenses.length === 1 ? "entry" : "entries"} · ${cur.symbol}`);
}

/* ---------- Events ---------- */

function bindEvents() {
  el.form.addEventListener("submit", addExpense);

  el.catGrid.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-cat]");
    if (!chip) return;
    state.selectedCategory = chip.dataset.cat;
    renderCategoryChips();
  });

  el.filterRow.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    state.filter = chip.dataset.filter;
    renderFilterChips();
    renderLedger();
  });

  el.ledgerList.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest("[data-delete]");
    if (deleteBtn) {
      const row = deleteBtn.closest(".tx");
      if (row) deleteExpense(deleteBtn.dataset.delete, row);
      return;
    }

    if (event.target.closest("[data-clear-filters]")) {
      state.filter = "all";
      state.search = "";
      el.search.value = "";
      renderFilterChips();
      renderLedger();
    }
  });

  el.search.addEventListener("input", () => {
    state.search = el.search.value;
    renderLedger();
  });

  el.currencySelect.addEventListener("change", () => {
    if (!CURRENCIES[el.currencySelect.value]) return;
    state.currency = el.currencySelect.value;
    save();
    renderAll();
  });

  el.editBudgetBtn.addEventListener("click", openSettings);
  el.settingsBtn.addEventListener("click", openSettings);

  el.settingsForm.addEventListener("submit", saveSettings);
  el.clearDataBtn.addEventListener("click", clearEverything);

  el.settingsDialog.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => el.settingsDialog.close());
  });

  el.settingsDialog.addEventListener("click", (event) => {
    if (event.target === el.settingsDialog) el.settingsDialog.close();
  });

  el.exportBtn.addEventListener("click", exportCSV);

  // Ctrl/Cmd + K focuses the search field.
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.search.focus();
    }
  });
}

/* ---------- Boot ---------- */

function init() {
  load();
  el.date.value = todayISO();
  el.currencySelect.value = state.currency;
  renderCategoryChips();
  renderFilterChips();
  bindEvents();
  renderAll();
}

init();
