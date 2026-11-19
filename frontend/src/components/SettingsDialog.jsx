import { useEffect, useRef, useState } from "react";

export default function SettingsDialog({
  open,
  budget,
  onClose,
  onSaveBudget,
  onEraseAll,
}) {
  const dialogRef = useRef(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setValue(budget > 0 ? String(budget) : "");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, budget]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleCancel = (event) => {
      event.preventDefault();
      onClose();
    };
    const handleBackdrop = (event) => {
      if (event.target === dialog) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleBackdrop);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleBackdrop);
    };
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    const parsed = Number(value);
    const next =
      Number.isFinite(parsed) && parsed > 0
        ? Math.round(parsed * 100) / 100
        : 0;

    setSaving(true);
    await onSaveBudget(next);
    setSaving(false);
  }

  return (
    <dialog id="settingsDialog" className="dialog" ref={dialogRef}>
      <form id="settingsForm" noValidate onSubmit={handleSubmit}>
        <div className="dialog-head">
          <h2>Budget &amp; data</h2>
          <button
            type="button"
            className="icon-btn small"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <label className="field">
          <span>Total money available</span>
          <span className="money-input">
            <span className="currency-prefix">Rs</span>
            <input
              id="budgetInput"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              aria-label="Total budget"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </span>
        </label>
        <p className="hint dialog-hint">
          Your remaining balance is this budget minus everything you've spent.
        </p>

        <div className="dialog-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary-btn compact"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save budget"}
          </button>
        </div>

        <div className="danger-zone">
          <div>
            <strong>Erase everything</strong>
            <p>
              Deletes all expenses from MySQL and resets the budget. This can't
              be undone.
            </p>
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={onEraseAll}
          >
            Erase
          </button>
        </div>
      </form>
    </dialog>
  );
}
