const BASE = import.meta.env.VITE_API_BASE ?? "";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error("Can't reach the server. Is the backend running?");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* not JSON — keep the generic message */
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  getExpenses: () =>
    request("/api/expenses").then((data) => data.expenses),
  createExpense: (expense) =>
    request("/api/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    }).then((data) => data.expense),
  deleteExpense: (id) =>
    request(`/api/expenses/${id}`, { method: "DELETE" }),
  getSettings: () => request("/api/settings"),
  updateSettings: (patch) =>
    request("/api/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  eraseAll: () => request("/api/data", { method: "DELETE" }),
  exportReport: async () => {
    let response;
    try {
      response = await fetch(`${BASE}/api/export.pdf`);
    } catch {
      throw new Error("Can't reach the server. Is the backend running?");
    }
    if (!response.ok) {
      throw new Error("Could not build the PDF report.");
    }
    return response.blob();
  },
};
