export const CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍜", color: "#e8890c" },
  { id: "transport", label: "Transport", emoji: "🚕", color: "#3b82f6" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", color: "#ec4899" },
  { id: "bills", label: "Bills", emoji: "🧾", color: "#8b5cf6" },
  { id: "fun", label: "Fun", emoji: "🎮", color: "#0ea5a4" },
  { id: "health", label: "Health", emoji: "💊", color: "#ef4444" },
  { id: "other", label: "Other", emoji: "📦", color: "#64748b" },
];

export const categoryById = (id) =>
  CATEGORIES.find((category) => category.id === id) ||
  CATEGORIES[CATEGORIES.length - 1];
