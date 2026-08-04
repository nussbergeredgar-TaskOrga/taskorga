// Formatiert Zahlen mit Komma als Dezimaltrennzeichen (deutsche Excel-Konvention)
export function csvNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function csvCell(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: string[][]): string {
  // BOM voranstellen, damit Excel Umlaute unter Windows korrekt als UTF-8 erkennt
  return "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export function csvResponseHeaders(filename: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
