import PDFDocument from "pdfkit";

/* ------------------------------------------------------------
   Palette (matches the Paisa UI)
   ------------------------------------------------------------ */
const GREEN = "#0F2E23";
const SOFT_GREEN = "#EAF1E7";
const ZEBRA = "#F7F9F2";
const BORDER = "#D3D9CC";
const INK = "#14211B";
const MUTED = "#6B7A72";
const RED = "#B4442F";
const WHITE = "#FFFFFF";

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_ITALIC = "Helvetica-Oblique";

const CATEGORY_LABELS = {
  food: "Food",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills",
  fun: "Fun",
  health: "Health",
  other: "Other",
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 40;
const CONTENT_W = PAGE.width - MARGIN * 2;

const SUMMARY_H = 52;
const TABLE_HEAD_H = 24;
const ROW_H = 22;

function money(value) {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${value < 0 ? "-" : ""}Rs ${formatted}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function localISODate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export function pdfFilename(date = new Date()) {
  return `paisa-expenses-${localISODate(date)}.pdf`;
}

/* ------------------------------------------------------------
   Drawing helpers
   ------------------------------------------------------------ */

/** Vertically centred single-line text inside a box. */
function cellText(doc, text, x, y, w, h, options = {}) {
  const {
    font = FONT,
    size = 10,
    color = INK,
    align = "left",
    padding = 8,
  } = options;

  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(text, x + padding, y + (h - size * 1.16) / 2, {
      width: Math.max(w - padding * 2, 4),
      height: h,
      align,
      lineBreak: false,
      ellipsis: true,
    });
}

function box(doc, x, y, w, h, { fill = WHITE, stroke = BORDER, lineWidth = 0.6 } = {}) {
  doc.save();
  doc.lineWidth(lineWidth);
  doc.rect(x, y, w, h);
  if (fill) doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  doc.restore();
}

function summarize(doc, { budget, spent, remaining, entries }) {
  const gap = 10;
  const boxW = (CONTENT_W - gap * 3) / 4;
  const y = 112;

  const cards = [
    { label: "BUDGET", value: money(budget), color: INK },
    { label: "SPENT", value: money(spent), color: RED },
    {
      label: "REMAINING",
      value: money(remaining),
      color: remaining < 0 ? RED : INK,
    },
    { label: "ENTRIES", value: String(entries), color: INK },
  ];

  cards.forEach((card, index) => {
    const x = MARGIN + index * (boxW + gap);

    box(doc, x, y, boxW, SUMMARY_H, { fill: WHITE, stroke: BORDER });
    cellText(doc, card.label, x, y + 6, boxW, 14, {
      font: FONT_BOLD,
      size: 7.5,
      color: MUTED,
      align: "center",
      padding: 4,
    });
    cellText(doc, card.value, x, y + 24, boxW, 22, {
      font: FONT_BOLD,
      size: 13,
      color: card.color,
      align: "center",
      padding: 4,
    });
  });

  return y + SUMMARY_H;
}

function banner(doc, y, title, subtitle) {
  const h = 46;
  doc.save();
  doc.rect(MARGIN, y, CONTENT_W, h).fillColor(GREEN).fill();
  doc.restore();

  cellText(doc, title, MARGIN, y, CONTENT_W, h, {
    font: FONT_BOLD,
    size: 16,
    color: WHITE,
    padding: 14,
  });

  doc
    .font(FONT_ITALIC)
    .fontSize(9)
    .fillColor(MUTED)
    .text(subtitle, MARGIN, y + h + 8, {
      width: CONTENT_W,
      lineBreak: false,
      ellipsis: true,
    });

  return y + h + 24;
}

function tableHeader(doc, y, columns) {
  const total = columns.reduce((sum, col) => sum + col.width, 0);
  let x = MARGIN;

  for (const col of columns) {
    box(doc, x, y, col.width, TABLE_HEAD_H, {
      fill: GREEN,
      stroke: GREEN,
    });
    cellText(doc, col.label, x, y, col.width, TABLE_HEAD_H, {
      font: FONT_BOLD,
      size: 8.5,
      color: WHITE,
      align: col.align || "left",
      padding: 8,
    });
    x += col.width;
  }

  // Guard against rounding drift.
  if (Math.abs(x - (MARGIN + total)) > 0.01) {
    throw new Error("Table columns do not span the content width");
  }

  return y + TABLE_HEAD_H;
}

function tableRow(doc, y, columns, values, options = {}) {
  const { zebra = false, amountColor = RED, bold = false, fill = null } = options;
  let x = MARGIN;

  columns.forEach((col, index) => {
    const isAmount = col.key === "amount";
    const bg = fill || (zebra ? ZEBRA : WHITE);

    box(doc, x, y, col.width, ROW_H, { fill: bg, stroke: BORDER });
    cellText(doc, values[col.key] ?? "", x, y, col.width, ROW_H, {
      font: isAmount || bold ? FONT_BOLD : FONT,
      size: isAmount ? 10.5 : 10,
      color: isAmount ? amountColor : INK,
      align: col.align || "left",
      padding: 8,
    });
    x += col.width;
  });

  return y + ROW_H;
}

function sectionHeading(doc, y, text) {
  doc
    .font(FONT_BOLD)
    .fontSize(11.5)
    .fillColor(GREEN)
    .text(text, MARGIN, y, { width: CONTENT_W, lineBreak: false });

  return y + 20;
}

function ensureSpace(doc, y, needed) {
  if (y + needed <= PAGE.height - 54) return y;
  doc.addPage();
  return MARGIN;
}

function totalsRow(doc, y, columns, label, amount, amountColor) {
  let x = MARGIN;

  columns.forEach((col, index) => {
    box(doc, x, y, col.width, ROW_H + 2, {
      fill: SOFT_GREEN,
      stroke: BORDER,
    });

    if (index === 0) {
      cellText(doc, label, x, y, col.width, ROW_H + 2, {
        font: FONT_BOLD,
        size: 10,
        color: GREEN,
        align: "right",
        padding: 8,
      });
    } else if (col.key === "amount") {
      cellText(doc, money(amount), x, y, col.width, ROW_H + 2, {
        font: FONT_BOLD,
        size: 11,
        color: amountColor,
        align: "right",
        padding: 8,
      });
    }

    x += col.width;
  });

  return y + ROW_H + 2;
}

/* ------------------------------------------------------------
   Report
   ------------------------------------------------------------ */

export function buildExpensePdf({ expenses, settings }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: MARGIN,
        bufferPages: true,
        info: {
          Title: "Paisa — Expense Ledger",
          Author: "Paisa",
          Subject: "Expense report",
          Creator: "Paisa expense ledger",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
      const remaining = settings.budget - totalSpent;
      const exportedOn = todayLabel();

      /* Title */
      let y = banner(
        doc,
        40,
        "Paisa — Expense Ledger",
        `Exported ${exportedOn}  ·  All amounts in Pakistani rupees (Rs)`
      );

      /* Summary */
      y = summarize(doc, {
        budget: settings.budget,
        spent: totalSpent,
        remaining,
        entries: expenses.length,
      });

      const columns = [
        { key: "date", label: "DATE", width: 92 },
        { key: "title", label: "EXPENSE", width: 213.28 },
        { key: "category", label: "CATEGORY", width: 110 },
        { key: "amount", label: "AMOUNT (RS)", width: 100, align: "right" },
      ];

      /* Expense table */
      y += 30;
      y = tableHeader(doc, y, columns);

      if (expenses.length === 0) {
        const x = MARGIN;
        box(doc, x, y, CONTENT_W, ROW_H + 6, {
          fill: WHITE,
          stroke: BORDER,
        });
        cellText(doc, "No expenses recorded yet.", x, y, CONTENT_W, ROW_H + 6, {
          font: FONT_ITALIC,
          size: 10,
          color: MUTED,
          align: "center",
        });
        y += ROW_H + 6;
      } else {
        expenses.forEach((expense, index) => {
          const nextY = ensureSpace(doc, y, ROW_H + 4);
          if (nextY !== y) {
            doc
              .font(FONT_BOLD)
              .fontSize(9)
              .fillColor(MUTED)
              .text("Paisa — Expense Ledger (continued)", MARGIN, MARGIN, {
                width: CONTENT_W,
                lineBreak: false,
              });
            y = tableHeader(doc, MARGIN + 18, columns);
          }

          y = tableRow(doc, y, columns, {
            date: formatDate(expense.date),
            title: expense.title,
            category:
              CATEGORY_LABELS[expense.category] || expense.category,
            amount: money(expense.amount),
          }, { zebra: index % 2 === 1 });
        });
      }

      y += 8;
      y = ensureSpace(doc, y, ROW_H + 8);
      y = totalsRow(
        doc,
        y,
        columns,
        "TOTAL SPENT",
        totalSpent,
        remaining < 0 ? RED : GREEN
      );

      /* Category table */
      const byCategory = new Map();
      for (const expense of expenses) {
        const current = byCategory.get(expense.category) || {
          count: 0,
          total: 0,
        };
        current.count += 1;
        current.total += expense.amount;
        byCategory.set(expense.category, current);
      }

      const categories = [...byCategory.entries()]
        .map(([id, info]) => ({ id, ...info }))
        .sort((a, b) => b.total - a.total);

      const categoryColumns = [
        { key: "category", label: "CATEGORY", width: 180 },
        { key: "entries", label: "ENTRIES", width: 90, align: "right" },
        { key: "amount", label: "AMOUNT (RS)", width: 155, align: "right" },
        { key: "share", label: "SHARE", width: 90.28, align: "right" },
      ];

      const needed =
        26 +
        20 +
        TABLE_HEAD_H +
        Math.max(categories.length, 1) * ROW_H +
        ROW_H +
        10;
      y = ensureSpace(doc, y, needed);

      y += 26;
      y = sectionHeading(doc, y, "Spending by category");
      y = tableHeader(doc, y, categoryColumns);

      if (categories.length === 0) {
        box(doc, MARGIN, y, CONTENT_W, ROW_H + 6, {
          fill: WHITE,
          stroke: BORDER,
        });
        cellText(
          doc,
          "No expenses recorded yet.",
          MARGIN,
          y,
          CONTENT_W,
          ROW_H + 6,
          {
            font: FONT_ITALIC,
            size: 10,
            color: MUTED,
            align: "center",
          }
        );
        y += ROW_H + 6;
      } else {
        categories.forEach((category, index) => {
          y = tableRow(doc, y, categoryColumns, {
            category: CATEGORY_LABELS[category.id] || category.id,
            entries: String(category.count),
            amount: money(category.total),
            share:
              totalSpent > 0
                ? `${Math.round((category.total / totalSpent) * 100)}%`
                : "0%",
          }, { zebra: index % 2 === 1 });
        });

        y = totalsRow(
          doc,
          y,
          categoryColumns,
          "TOTAL",
          totalSpent,
          RED
        );
      }

      /* Footers on every buffered page */
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);

        // Let the footer sit inside the bottom margin without triggering
        // PDFKit's automatic page break.
        doc.page.margins.bottom = 0;

        const footerY = PAGE.height - 34;

        doc
          .moveTo(MARGIN, footerY - 8)
          .lineTo(MARGIN + CONTENT_W, footerY - 8)
          .lineWidth(0.6)
          .strokeColor(BORDER)
          .stroke();

        doc
          .font(FONT)
          .fontSize(8)
          .fillColor(MUTED)
          .text("Paisa expense ledger · All amounts in Rs", MARGIN, footerY, {
            width: CONTENT_W / 2,
            lineBreak: false,
          });

        doc
          .font(FONT_BOLD)
          .fontSize(8)
          .fillColor(MUTED)
          .text(
            `Page ${i - range.start + 1} of ${range.count}`,
            MARGIN + CONTENT_W / 2,
            footerY,
            { width: CONTENT_W / 2, align: "right", lineBreak: false }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
