import Big from "big.js";

/** UAE TRNs have 15 digits and are printed in groups: 100-4583-9270-0003. Anything else is returned as is. */
export function formatTrn(trn: string | null | undefined): string {
  if (!trn) return "";
  const digits = trn.replace(/\D/g, "");
  if (digits.length !== 15) return trn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}-${digits.slice(11)}`;
}

/** "19,425.00": an amount with thousands separators and fils, as printed on quotations. */
export function formatAmount(value: string): string {
  const fixed = new Big(value).round(2, Big.roundHalfUp).toFixed(2);
  const [intPart = "0", dec = "00"] = fixed.split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  return `${negative ? "-" : ""}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

/** "5.00" → "5", "2.50" → "2.5": a quantity or VAT rate without trailing zeros. */
export function formatDecimal(value: string): string {
  return new Big(value).toString();
}

/** Calendar date (YYYY-MM-DD) of an instant in a timezone, e.g. the quote year in Asia/Dubai. */
export function dateInTimezone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function addDaysToDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES: Array<[number, string]> = [
  [1_000_000_000, "billion"],
  [1_000_000, "million"],
  [1_000, "thousand"],
];

function below100(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const tens = TENS[Math.floor(n / 10)] ?? "";
  const ones = n % 10;
  return ones ? `${tens}-${ONES[ones] ?? ""}` : tens;
}

function below1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return below100(rest);
  return rest ? `${ONES[hundreds] ?? ""} hundred and ${below100(rest)}` : `${ONES[hundreds] ?? ""} hundred`;
}

function integerWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  let rest = n;
  for (const [value, name] of SCALES) {
    const count = Math.floor(rest / value);
    if (count) {
      parts.push(`${below1000(count)} ${name}`);
      rest %= value;
    }
  }
  if (rest) parts.push(parts.length && rest < 100 ? `and ${below100(rest)}` : below1000(rest));
  return parts.join(" ");
}

/**
 * The total written out in English, as UAE quotations and cheques print it:
 * "Nineteen thousand four hundred and twenty-five UAE dirhams and fifty fils only".
 */
export function amountInWordsEn(value: string): string {
  const [intPart = "0", filsPart = "00"] = new Big(value)
    .abs()
    .round(2, Big.roundHalfUp)
    .toFixed(2)
    .split(".");
  const dirhams = Number(intPart);
  const fils = Number(filsPart);
  let words = `${integerWords(dirhams)} UAE ${dirhams === 1 ? "dirham" : "dirhams"}`;
  if (fils) words += ` and ${integerWords(fils)} fils`;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
}
