export default function Toast({ toast }) {
  const tone = toast?.tone === "error" ? " is-error" : "";

  return (
    <div
      className={`toast${toast ? " show" : ""}${tone}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {toast?.message ?? ""}
    </div>
  );
}
