import ExcelJS from "exceljs";

const FONT = "Calibri";
const GREEN = "FF0F2E23";
const SOFT_GREEN = "FFEAF1E7";
const ZEBRA = "FFF7F9F2";
const BORDER = "FFD3D9CC";
const INK = "FF14211B";
const MUTED = "FF6B7A72";
const RED = "FFB4442F";
const WHITE = "FFFFFFFF";

const CATEGORY_LABELS = {
  food: "Food",
  transport: "Transport",
  shopping: "Shopping",
  bills: "Bills",
  fun: "Fun",
  health: "Health",
  other: "Other",
};

const MONEY_FORMAT = '"Rs" #,##0.00';

const thin = { style: "thin", color: { argb: BORDER } };
const boxBorder = { top: thin, left: thin, bottom: thin, right: thin };

function paint(cell, argb) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function excelDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localISODate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function reportFilename(date = new Date()) {
  return `paisa-expenses-${localISODate(date)}.xlsx`;
}

function buildTitle(ws, lastColumn, title, subtitle) {
  ws.mergeCells(1, 1, 1, lastColumn);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 17, bold: true, color: { argb: WHITE } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  paint(titleCell, GREEN);
  ws.getRow(1).height = 38;

  ws.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = {
    name: FONT,
    size: 10,
    italic: true,
    color: { argb: MUTED },
  };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 8;
}

function headerRow(ws, rowNumber, headers, lastColumn) {
  for (let col = 1; col <= lastColumn; col += 1) {
    const cell = ws.getCell(rowNumber, col);
    cell.value = headers[col - 1];
    cell.font = {
      name: FONT,
      size: 10,
      bold: true,
      color: { argb: WHITE },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: col === lastColumn ? "right" : "left",
      indent: col === lastColumn ? 0 : 1,
    };
    cell.border = boxBorder;
    paint(cell, GREEN);
  }
  ws.getRow(rowNumber).height = 24;
}

export async function buildExpenseWorkbook({ expenses, settings }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Paisa";
  workbook.title = "Paisa expense ledger";
  workbook.created = new Date();

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = settings.budget - totalSpent;
  const exportedOn = new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const sheet = workbook.addWorksheet("Expenses", {
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
    headerFooter: { oddFooter: "Paisa expense ledger · Page &P of &N" },
  });

  sheet.columns = [{ width: 16 }, { width: 36 }, { width: 20 }, { width: 20 }];
  sheet.properties.defaultRowHeight = 20;

  buildTitle(
    sheet,
    4,
    "Paisa — Expense Ledger",
    `Exported ${exportedOn} · All amounts in Pakistani rupees (Rs)`
  );

  /* Summary boxes */
  const summaryHeaders = ["BUDGET", "SPENT", "REMAINING", "ENTRIES"];
  const summaryValues = [settings.budget, totalSpent, remaining, expenses.length];

  for (let col = 1; col <= 4; col += 1) {
    const head = sheet.getCell(4, col);
    head.value = summaryHeaders[col - 1];
    head.font = {
      name: FONT,
      size: 9,
      bold: true,
      color: { argb: MUTED },
    };
    head.alignment = { horizontal: "center", vertical: "middle" };
    head.border = boxBorder;
    paint(head, SOFT_GREEN);

    const value = sheet.getCell(5, col);
    value.value = summaryValues[col - 1];
    if (col < 4) value.numFmt = MONEY_FORMAT;
    value.font = {
      name: FONT,
      size: 13,
      bold: true,
      color: { argb: col === 3 && remaining < 0 ? RED : INK },
    };
    value.alignment = { horizontal: "center", vertical: "middle" };
    value.border = boxBorder;
    paint(value, WHITE);
  }
  sheet.getRow(4).height = 20;
  sheet.getRow(5).height = 28;
  sheet.getRow(6).height = 14;

  /* Expense table */
  headerRow(sheet, 7, ["DATE", "EXPENSE", "CATEGORY", "AMOUNT (RS)"], 4);

  expenses.forEach((expense, index) => {
    const row = sheet.getRow(8 + index);
    row.height = 22;

    const dateCell = row.getCell(1);
    dateCell.value = excelDate(expense.date);
    dateCell.numFmt = "dd mmm yyyy";
    dateCell.alignment = { vertical: "middle", indent: 1 };

    const titleCell = row.getCell(2);
    titleCell.value = expense.title;
    titleCell.alignment = { vertical: "middle", indent: 1 };

    const categoryCell = row.getCell(3);
    categoryCell.value =
      CATEGORY_LABELS[expense.category] || expense.category;
    categoryCell.alignment = { vertical: "middle", indent: 1 };

    const amountCell = row.getCell(4);
    amountCell.value = expense.amount;
    amountCell.numFmt = MONEY_FORMAT;
    amountCell.font = {
      name: FONT,
      size: 11,
      bold: true,
      color: { argb: RED },
    };
    amountCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

    for (let col = 1; col <= 4; col += 1) {
      const cell = row.getCell(col);
      cell.border = boxBorder;
      if (!cell.font) {
        cell.font = { name: FONT, size: 11, color: { argb: INK } };
      }
      if (index % 2 === 1) paint(cell, ZEBRA);
    }
  });

  if (expenses.length === 0) {
    const row = sheet.getRow(8);
    sheet.mergeCells(8, 1, 8, 4);
    const cell = row.getCell(1);
    cell.value = "No expenses recorded yet.";
    cell.font = { name: FONT, size: 11, italic: true, color: { argb: MUTED } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    for (let col = 1; col <= 4; col += 1) {
      row.getCell(col).border = boxBorder;
      paint(row.getCell(col), WHITE);
    }
    row.height = 26;
  } else {
    sheet.autoFilter = {
      from: { row: 7, column: 1 },
      to: { row: 7 + expenses.length, column: 4 },
    };
  }

  const totalRowIndex = 8 + Math.max(expenses.length, 1);
  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.height = 24;
  sheet.mergeCells(totalRowIndex, 1, totalRowIndex, 3);

  const totalLabel = totalRow.getCell(1);
  totalLabel.value = "TOTAL SPENT";
  totalLabel.font = {
    name: FONT,
    size: 11,
    bold: true,
    color: { argb: GREEN },
  };
  totalLabel.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

  const totalAmount = totalRow.getCell(4);
  totalAmount.value = totalSpent;
  totalAmount.numFmt = MONEY_FORMAT;
  totalAmount.font = {
    name: FONT,
    size: 12,
    bold: true,
    color: { argb: remaining < 0 ? RED : GREEN },
  };
  totalAmount.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

  for (let col = 1; col <= 4; col += 1) {
    const cell = totalRow.getCell(col);
    cell.border = boxBorder;
    paint(cell, SOFT_GREEN);
  }

  sheet.printArea = `A1:D${totalRowIndex}`;

  /* Category sheet */
  const categorySheet = workbook.addWorksheet("Categories", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    },
  });

  categorySheet.columns = [
    { width: 26 },
    { width: 14 },
    { width: 20 },
    { width: 12 },
  ];
  categorySheet.properties.defaultRowHeight = 20;

  buildTitle(
    categorySheet,
    4,
    "Spending by category",
    `Exported ${exportedOn} · All amounts in Pakistani rupees (Rs)`
  );

  headerRow(
    categorySheet,
    4,
    ["CATEGORY", "ENTRIES", "AMOUNT (RS)", "SHARE"],
    4
  );

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

  if (categories.length === 0) {
    categorySheet.mergeCells(5, 1, 5, 4);
    const cell = categorySheet.getCell(5, 1);
    cell.value = "No expenses recorded yet.";
    cell.font = {
      name: FONT,
      size: 11,
      italic: true,
      color: { argb: MUTED },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    for (let col = 1; col <= 4; col += 1) {
      categorySheet.getCell(5, col).border = boxBorder;
    }
    categorySheet.getRow(5).height = 26;
  } else {
    categories.forEach((category, index) => {
      const row = categorySheet.getRow(5 + index);
      row.height = 22;

      row.getCell(1).value =
        CATEGORY_LABELS[category.id] || category.id;
      row.getCell(1).alignment = { vertical: "middle", indent: 1 };

      row.getCell(2).value = category.count;
      row.getCell(2).alignment = { vertical: "middle", horizontal: "center" };

      row.getCell(3).value = category.total;
      row.getCell(3).numFmt = MONEY_FORMAT;
      row.getCell(3).font = {
        name: FONT,
        size: 11,
        bold: true,
        color: { argb: RED },
      };
      row.getCell(3).alignment = {
        vertical: "middle",
        horizontal: "right",
        indent: 1,
      };

      row.getCell(4).value = totalSpent > 0 ? category.total / totalSpent : 0;
      row.getCell(4).numFmt = "0%";
      row.getCell(4).alignment = {
        vertical: "middle",
        horizontal: "right",
        indent: 1,
      };

      for (let col = 1; col <= 4; col += 1) {
        const cell = row.getCell(col);
        cell.border = boxBorder;
        if (!cell.font) {
          cell.font = { name: FONT, size: 11, color: { argb: INK } };
        }
        if (index % 2 === 1) paint(cell, ZEBRA);
      }
    });

    const totalRowCategory = categorySheet.getRow(5 + categories.length);
    totalRowCategory.height = 24;
    categorySheet.mergeCells(
      5 + categories.length,
      1,
      5 + categories.length,
      2
    );

    const label = totalRowCategory.getCell(1);
    label.value = "TOTAL";
    label.font = {
      name: FONT,
      size: 11,
      bold: true,
      color: { argb: GREEN },
    };
    label.alignment = { vertical: "middle", horizontal: "right", indent: 1 };

    totalRowCategory.getCell(3).value = totalSpent;
    totalRowCategory.getCell(3).numFmt = MONEY_FORMAT;
    totalRowCategory.getCell(3).font = {
      name: FONT,
      size: 12,
      bold: true,
      color: { argb: RED },
    };
    totalRowCategory.getCell(3).alignment = {
      vertical: "middle",
      horizontal: "right",
      indent: 1,
    };

    totalRowCategory.getCell(4).value = 1;
    totalRowCategory.getCell(4).numFmt = "0%";
    totalRowCategory.getCell(4).font = {
      name: FONT,
      size: 11,
      bold: true,
      color: { argb: GREEN },
    };
    totalRowCategory.getCell(4).alignment = {
      vertical: "middle",
      horizontal: "right",
      indent: 1,
    };

    for (let col = 1; col <= 4; col += 1) {
      const cell = totalRowCategory.getCell(col);
      cell.border = boxBorder;
      paint(cell, SOFT_GREEN);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
