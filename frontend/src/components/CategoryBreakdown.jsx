import { money } from "../lib/format";

export default function CategoryBreakdown({ totals, spent }) {
  const hint =
    totals.length === 0
      ? "no spending yet"
      : `${totals.length} ${totals.length === 1 ? "category" : "categories"} · ${money(spent)} total`;

  return (
    <article className="panel breakdown-panel">
      <div className="panel-head">
        <h2>Where it goes</h2>
        <span className="hint">{hint}</span>
      </div>

      <div className="breakdown-list">
        {totals.length === 0 ? (
          <div className="breakdown-empty">
            Once you add a few expenses, this will show which categories take
            the biggest bite out of your budget.
          </div>
        ) : (
          totals.map((category) => {
            const percent = (category.total / spent) * 100;
            const shown = percent < 1 ? "<1" : Math.round(percent);
            return (
              <div className="breakdown-row" key={category.id}>
                <div className="breakdown-top">
                  <span className="breakdown-label">
                    <i style={{ background: category.color }} />
                    {category.emoji} {category.label}
                  </span>
                  <span className="breakdown-value">
                    {money(category.total)} · {shown}%
                  </span>
                </div>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill"
                    style={{
                      width: `${Math.max(percent, 1.5)}%`,
                      background: category.color,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
