export function money(value) {
  const abs = Math.abs(value);
  const decimals = Number.isInteger(abs) ? 0 : 2;
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${value < 0 ? "−" : ""}Rs ${formatted}`;
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function dayLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - date) / 86400000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  const options = { day: "numeric", month: "short" };
  if (date.getFullYear() !== today.getFullYear()) options.year = "numeric";
  return date.toLocaleDateString(undefined, options);
}
