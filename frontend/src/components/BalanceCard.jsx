import AnimatedMoney from "./AnimatedMoney";
import { money } from "../lib/format";

export default function BalanceCard({
  budget,
  spent,
  entries,
  onOpenSettings,
}) {
  const remaining = budget - spent;
  const ratio = budget > 0 ? spent / budget : 0;
  const percent = budget > 0 ? Math.min(ratio * 100, 100) : 0;

  const progressClass = [
    "progress-fill",
    ratio >= 1 ? "is-over" : ratio >= 0.75 ? "is-warn" : "",
  ]
    .filter(Boolean)
    .join(" ");

  let budgetNote = "no budget set";
  if (budget > 0) {
    budgetNote =
      remaining < 0
        ? `${money(-remaining)} over budget`
        : `of ${money(budget)}`;
  }

  return (
    <article className="balance-card">
      <div className="balance-head">
        <span className="eyebrow">Remaining balance</span>
        <button
          className={`ghost-light${budget <= 0 ? " is-cta" : ""}`}
          id="editBudgetBtn"
          type="button"
          onClick={onOpenSettings}
        >
          {budget > 0 ? "Edit budget" : "Set budget"}
        </button>
      </div>

      <AnimatedMoney
        className={`balance-amount${remaining < 0 ? " is-negative" : ""}`}
        id="remainingAmount"
        value={remaining}
      />

      <div className="progress" aria-hidden="true">
        <div className={progressClass} style={{ width: `${percent}%` }} />
      </div>
      <div className="balance-meta">
        <span>{money(spent)} spent</span>
        <span>{budgetNote}</span>
      </div>

      <div className="balance-split">
        <div>
          <span>Budget</span>
          <strong>{money(budget)}</strong>
        </div>
        <div>
          <span>Spent</span>
          <strong>{money(spent)}</strong>
        </div>
        <div>
          <span>Entries</span>
          <strong>{entries}</strong>
        </div>
      </div>
    </article>
  );
}
