import Big from "big.js";

/** Pakistani NTNs have 8 digits (7 plus a check digit) and are printed 4213785-6. Anything else is returned as is. */
export function formatTrn(trn: string | null | undefined): string {
  if (!trn) return "";
  const digits = trn.replace(/\D/g, "");
  if (digits.length !== 8) return trn;
  return `${digits.slice(0, 7)}-${digits.slice(7)}`;
}

/** "185,600.00": an amount with thousands separators and paisa, as printed on quotations. */
export function formatAmount(value: string): string {
  const fixed = new Big(value).round(2, Big.roundHalfUp).toFixed(2);
  const [intPart = "0", dec = "00"] = fixed.split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  return `${negative ? "-" : ""}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

/** "16.00" → "16", "2.50" → "2.5": a quantity or sales tax rate without trailing zeros. */
export function formatDecimal(value: string): string {
  return new Big(value).toString();
}

/** Calendar date (YYYY-MM-DD) of an instant in a timezone, e.g. the quote year in Asia/Karachi. */
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
/** The South Asian scale Pakistani quotations and cheques use: 1,85,600 is "one lakh eighty-five thousand". */
const SCALES: Array<[number, string]> = [
  [10_000_000, "crore"],
  [100_000, "lakh"],
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
      // Lakh and thousand counts stay below 100; a crore count can run past it, so it recurses.
      parts.push(`${integerWords(count)} ${name}`);
      rest %= value;
    }
  }
  if (rest) parts.push(parts.length && rest < 100 ? `and ${below100(rest)}` : below1000(rest));
  return parts.join(" ");
}

/**
 * The total written out in English, as Pakistani quotations and cheques print it:
 * "Rupees one lakh eighty-five thousand six hundred only".
 */
export function amountInWordsEn(value: string): string {
  const [intPart = "0", paisaPart = "00"] = new Big(value)
    .abs()
    .round(2, Big.roundHalfUp)
    .toFixed(2)
    .split(".");
  const rupees = Number(intPart);
  const paisa = Number(paisaPart);
  let words = `Rupees ${integerWords(rupees)}`;
  if (paisa) words += ` and ${integerWords(paisa)} paisa`;
  return `${words} only`;
}
