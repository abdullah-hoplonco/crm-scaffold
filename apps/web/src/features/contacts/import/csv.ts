import type { ImportDraft } from "@hco/shared/api/contacts";
import { sheetRowNumber } from "@hco/core/contacts/import";
import Papa from "papaparse";

/** Matches the contract's limit on rows per preview. */
export const MAX_IMPORT_ROWS = 5000;
export const SAMPLE_FILE_URL = "/samples/clinic-patients.csv";

export interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
}

export type CsvProblemCode = "not_csv" | "no_header" | "no_rows" | "too_many" | "unreadable";

export class CsvProblem extends Error {
  readonly code: CsvProblemCode;
  constructor(code: CsvProblemCode) {
    super(code);
    this.code = code;
  }
}

/** Parse CSV text with a header row. Blank rows and unnamed columns are dropped; every value is a trimmed string. */
export function parseCsvText(text: string, fileName: string): ParsedSheet {
  const result = Papa.parse<Record<string, unknown>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((header) => header !== "");
  if (headers.length === 0) throw new CsvProblem("no_header");
  const rows = result.data
    .map((row) =>
      Object.fromEntries(
        headers.map((header) => {
          const value = row[header];
          return [header, typeof value === "string" ? value.trim() : ""];
        }),
      ),
    )
    .filter((row) => Object.values(row).some(Boolean));
  if (rows.length === 0) throw new CsvProblem("no_rows");
  if (rows.length > MAX_IMPORT_ROWS) throw new CsvProblem("too_many");
  return { fileName, headers, rows };
}

export async function parseCsvFile(file: File): Promise<ParsedSheet> {
  const looksLikeCsv = /\.(csv|txt)$/i.test(file.name) || /csv|text\/plain/i.test(file.type);
  if (!looksLikeCsv) throw new CsvProblem("not_csv");
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new CsvProblem("unreadable");
  }
  return parseCsvText(text, file.name);
}

export async function loadSampleSheet(): Promise<ParsedSheet> {
  const response = await fetch(SAMPLE_FILE_URL);
  if (!response.ok) throw new CsvProblem("unreadable");
  return parseCsvText(await response.text(), "clinic-patients.csv");
}

/** Download the rows that can't be imported, with their spreadsheet row number and the problem, to fix and re-import. */
export function downloadRowsToFix(sheet: ParsedSheet, drafts: ImportDraft[]) {
  const withErrors = drafts.filter((draft) => draft.errors.length > 0);
  const csv = Papa.unparse({
    fields: ["Row", ...sheet.headers, "Problem"],
    data: withErrors.map((draft) => [
      String(sheetRowNumber(draft.rowIndex)),
      ...sheet.headers.map((header) => sheet.rows[draft.rowIndex]?.[header] ?? ""),
      draft.errors.join(" "),
    ]),
  });
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sheet.fileName.replace(/\.(csv|txt)$/i, "")}-rows-to-fix.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
