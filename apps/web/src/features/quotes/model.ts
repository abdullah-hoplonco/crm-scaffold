import { computeQuoteTotals, formatPhone } from "@hco/core";
import {
  addDaysToDate,
  amountInWordsEn,
  dateInTimezone,
  formatAmount,
  formatDecimal,
  formatTrn,
} from "@hco/core/quotes/index";
import type { Company, Contact, QuoteStatus, Workspace } from "@hco/shared";
import type { QuoteDetail } from "@hco/shared/api/quotes";
import type { TFunction } from "i18next";
import { formatDate, WORKSPACE_TZ } from "@/lib/format";

/** Everything printed on a quotation. Built from a saved quote or from the builder's live state. */
export interface QuoteDocumentModel {
  /** Null while the quote is being built and has no number yet. */
  number: string | null;
  status: QuoteStatus;
  /** Timestamp or YYYY-MM-DD. */
  issueDate: string;
  validUntil: string;
  preparedByName: string | null;
  subject: string;
  workspace: Pick<Workspace, "name" | "addressLine" | "emirate" | "trn">;
  contact: Pick<Contact, "firstName" | "lastName" | "primaryPhoneE164" | "emails">;
  company: Pick<Company, "name" | "address" | "emirate" | "trn"> | null;
  lines: Array<{ key: string; description: string; qty: string; unitPriceAed: string; totalAed: string }>;
  subtotalAed: string;
  vatRate: string;
  vatAmountAed: string;
  totalAed: string;
  notes: string | null;
}

export function modelFromDetail(detail: QuoteDetail): QuoteDocumentModel {
  const { quote } = detail;
  const totals = computeQuoteTotals(quote.lineItems, quote.vatRate);
  return {
    number: quote.number,
    status: quote.status,
    issueDate: quote.createdAt,
    validUntil: quote.validUntil,
    preparedByName: detail.preparedByName ?? null,
    subject: detail.deal.title,
    workspace: detail.workspace,
    contact: detail.contact,
    company: detail.company,
    lines: quote.lineItems.map((item, index) => ({
      key: item.id,
      description: item.description,
      qty: item.qty,
      unitPriceAed: item.unitPriceAed,
      totalAed: totals.lineTotals[index] ?? "0.00",
    })),
    subtotalAed: quote.subtotalAed,
    vatRate: quote.vatRate,
    vatAmountAed: quote.vatAmountAed,
    totalAed: quote.totalAed,
    notes: quote.notes,
  };
}

export function contactFullName(contact: Pick<Contact, "firstName" | "lastName">): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

/** Today as YYYY-MM-DD in the workspace timezone. */
export function todayInWorkspace(): string {
  return dateInTimezone(new Date(), WORKSPACE_TZ);
}

export function daysFromToday(days: number): string {
  return addDaysToDate(todayInWorkspace(), days);
}

const MONOGRAM_SKIP = new Set(["al", "el", "and", "&", "the", "of", "llc", "fz", "fze", "ltd", "co"]);

/** Two-letter mark for a business without a logo: "Noor Al Marsa Aesthetic & Dental Clinic" → "NM". */
export function monogram(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !MONOGRAM_SKIP.has(w.toLowerCase()));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "Q";
}

/** The printed strings of a quotation, shared by the on-screen document and the PDF so they never drift. */
export function buildDocumentText(t: TFunction, model: QuoteDocumentModel) {
  const rate = formatDecimal(model.vatRate);
  const emirate = (value: string | null) => (value ? t(`common:emirates.${value}`) : null);
  const withEmirate = (address: string | null, value: string | null) => {
    const label = emirate(value);
    if (!address) return label;
    return label && !address.toLowerCase().includes(label.toLowerCase()) ? `${address}, ${label}` : address;
  };
  const company = model.company;
  return {
    monogram: monogram(model.workspace.name),
    title: t("quotes:document.title"),
    number: model.number ?? t("quotes:document.numberPending"),
    seller: {
      name: model.workspace.name,
      lines: [
        withEmirate(model.workspace.addressLine, model.workspace.emirate),
        t("quotes:document.country"),
      ].filter((line): line is string => Boolean(line)),
      trn: model.workspace.trn
        ? t("quotes:document.trn", { trn: formatTrn(model.workspace.trn) })
        : t("quotes:document.noTrn"),
    },
    meta: [
      { label: t("quotes:document.issueDate"), value: formatDate(model.issueDate) },
      { label: t("quotes:document.validUntil"), value: formatDate(model.validUntil) },
      { label: t("quotes:document.preparedBy"), value: model.preparedByName ?? "" },
    ].filter((item) => item.value),
    billTo: {
      label: t("quotes:document.billTo"),
      name: contactFullName(model.contact),
      company: company?.name ?? null,
      lines: [
        company ? withEmirate(company.address, company.emirate) : null,
        company?.trn ? t("quotes:document.trn", { trn: formatTrn(company.trn) }) : null,
        model.contact.primaryPhoneE164 ? formatPhone(model.contact.primaryPhoneE164) : null,
        model.contact.emails[0] ?? null,
      ].filter((line): line is string => Boolean(line)),
    },
    subject: { label: t("quotes:document.subject"), value: model.subject },
    columns: {
      description: t("quotes:document.description"),
      qty: t("quotes:document.qty"),
      unitPrice: t("quotes:document.unitPrice"),
      amount: t("quotes:document.amount"),
      unitPriceAed: t("quotes:document.unitPriceAed"),
      amountAed: t("quotes:document.amountAed"),
      inAed: t("quotes:document.columnsInAed"),
    },
    lines: model.lines.map((line) => ({
      key: line.key,
      description: line.description,
      qty: formatDecimal(line.qty),
      unitPrice: formatAmount(line.unitPriceAed),
      amount: formatAmount(line.totalAed),
      mobile: t("quotes:document.lineMobile", {
        qty: formatDecimal(line.qty),
        price: formatAmount(line.unitPriceAed),
      }),
    })),
    noItems: t("quotes:document.noItems"),
    totals: {
      subtotal: { label: t("quotes:document.subtotal"), value: formatAmount(model.subtotalAed) },
      vat: { label: t("quotes:document.vat", { rate }), value: formatAmount(model.vatAmountAed) },
      total: { label: t("quotes:document.total"), value: formatAmount(model.totalAed) },
    },
    amountInWords: amountInWordsEn(model.totalAed),
    notes: model.notes ? { label: t("quotes:document.notes"), value: model.notes } : null,
    footer: t("quotes:document.footer", { rate }),
    watermark: model.status === "draft" ? t("quotes:document.watermark") : null,
  };
}

export type QuoteDocumentText = ReturnType<typeof buildDocumentText>;
