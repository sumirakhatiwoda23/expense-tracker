import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "./components/TopBar";
import BalanceCard from "./components/BalanceCard";
import ExpenseForm from "./components/ExpenseForm";
import CategoryBreakdown from "./components/CategoryBreakdown";
import Ledger from "./components/Ledger";
import SettingsDialog from "./components/SettingsDialog";
import Toast from "./components/Toast";
import { CATEGORIES, categoryById } from "./constants";
import { money, todayISO } from "./lib/format";
import { api } from "./lib/api";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ budget: 0 });
  const [status, setStatus] = useState("loading");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = "default") => {
    setToast({ message, tone, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => {
      setToast((current) => (current?.key === toast.key ? null : current));
    }, 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const [list, prefs] = await Promise.all([
        api.getExpenses(),
        api.getSettings(),
      ]);
      setExpenses(list);
      setSettings({ budget: prefs.budget });
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      showToast(error.message, "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const spent = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses
      .filter((expense) => filter === "all" || expense.category === filter)
      .filter((expense) => {
        if (!query) return true;
        const category = categoryById(expense.category);
        return (
          expense.title.toLowerCase().includes(query) ||
          category.label.toLowerCase().includes(query) ||
          expense.date.includes(query)
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return b.id - a.id;
      });
  }, [expenses, filter, search]);

  const totals = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        total: expenses
          .filter((expense) => expense.category === category.id)
          .reduce((sum, expense) => sum + expense.amount, 0),
      }))
        .filter((category) => category.total > 0)
        .sort((a, b) => b.total - a.total),
    [expenses]
  );

  async function handleAdd(input) {
    if (savingExpense) return false;
    setSavingExpense(true);
    try {
      const created = await api.createExpense(input);
      setExpenses((current) => [created, ...current]);
      showToast(
        `Added ${money(created.amount)} · ${created.title}`
      );
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDelete(id) {
    const expense = expenses.find((item) => item.id === id);
    setRemovingId(id);
    await wait(190);
    try {
      await api.deleteExpense(id);
      setExpenses((current) => current.filter((item) => item.id !== id));
      if (expense) {
        showToast(
          `Removed ${money(expense.amount)} · ${expense.title}`
        );
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSaveBudget(budget) {
    try {
      const prefs = await api.updateSettings({ budget });
      setSettings({ budget: prefs.budget });
      setSettingsOpen(false);
      showToast(
        budget > 0
          ? `Budget set to ${money(budget)}`
          : "Budget cleared"
      );
      return true;
    } catch (error) {
      showToast(error.message, "error");
      return false;
    }
  }

  async function handleEraseAll() {
    const confirmed = window.confirm(
      "Erase all expenses from the database and reset your budget? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await api.eraseAll();
      setExpenses([]);
      setSettings({ budget: 0 });
      setFilter("all");
      setSearch("");
      setSettingsOpen(false);
      showToast("Everything erased. Fresh start.");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function exportReport() {
    if (expenses.length === 0) {
      showToast("Nothing to export yet");
      return;
    }

    try {
      const blob = await api.exportReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paisa-expenses-${todayISO()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Downloaded PDF report (.pdf)");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <>
      <div className="bg-blobs" aria-hidden="true" />

      <div className="app">
        <TopBar onOpenSettings={() => setSettingsOpen(true)} />

        {status === "error" && (
          <div className="api-banner" role="alert">
            <span>
              Couldn't load data from the API. Make sure the Express server and
              database are running.
            </span>
            <button type="button" onClick={loadData}>
              Retry
            </button>
          </div>
        )}

        <main className="layout">
          <BalanceCard
            budget={settings.budget}
            spent={spent}
            entries={expenses.length}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <ExpenseForm
            saving={savingExpense}
            onAdd={handleAdd}
          />

          <CategoryBreakdown
            totals={totals}
            spent={spent}
          />

          <Ledger
            expenses={filtered}
            totalCount={expenses.length}
            filter={filter}
            search={search}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onDelete={handleDelete}
            onExport={exportReport}
            removingId={removingId}
            loading={status === "loading"}
          />
        </main>

        <footer className="footer">
          <p>Small leaks sink big ships — keep an eye on the little ones.</p>
          <p className="footer-dim">
            React frontend · Express API · SQL database
          </p>
        </footer>
      </div>

      <SettingsDialog
        open={settingsOpen}
        budget={settings.budget}
        onClose={() => setSettingsOpen(false)}
        onSaveBudget={handleSaveBudget}
        onEraseAll={handleEraseAll}
      />

      <Toast toast={toast} />
    </>
  );
}
