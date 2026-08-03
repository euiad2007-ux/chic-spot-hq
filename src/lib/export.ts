/** Shared report-export helpers: CSV / JSON download and print. */

function download(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Stamps a filename with today's date: `trial-balance-2026-08-03.csv`. */
export function stampName(base: string, ext = "csv") {
  return `${base}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

/**
 * Downloads rows as an Excel-friendly CSV.
 * A UTF-8 BOM is required so Excel renders Arabic headers correctly.
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const body = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
  download("\uFEFF" + body, filename, "text/csv;charset=utf-8;");
}

/** Downloads any serialisable payload as pretty JSON (used for e-invoice archives). */
export function exportJson(filename: string, payload: unknown) {
  download(JSON.stringify(payload, null, 2), filename, "application/json;charset=utf-8;");
}

/** Downloads raw text (used for UBL XML e-invoices). */
export function exportText(filename: string, text: string, mime = "application/xml;charset=utf-8;") {
  download(text, filename, mime);
}

/** Opens the browser print dialog for a PDF-style export of the current report. */
export function printReport() {
  window.print();
}
