import Big from "big.js";

Big.RM = Big.roundHalfUp;

export type MoneyInput = string | number | Big;

export function money(value: MoneyInput): Big {
  return new Big(value);
}

/** 2-decimal string, e.g. "1250.00". */
export function toMoneyString(value: MoneyInput): string {
  return new Big(value).round(2, Big.roundHalfUp).toFixed(2);
}

export function sumMoney(values: MoneyInput[]): string {
  return toMoneyString(values.reduce<Big>((acc, v) => acc.plus(v), new Big(0)));
}

/** "AED 18,500" or "AED 1,250.50" (decimals only when non-zero). */
export function formatAed(value: MoneyInput, opts: { compact?: boolean } = {}): string {
  const n = new Big(value);
  if (opts.compact) {
    const abs = n.abs();
    if (abs.gte(1_000_000)) return `AED ${trimZeros(n.div(1_000_000).toFixed(1))}M`;
    if (abs.gte(10_000)) return `AED ${trimZeros(n.div(1_000).toFixed(1))}K`;
  }
  const fixed = n.round(2, Big.roundHalfUp).toFixed(2);
  const [intPart = "0", dec = "00"] = fixed.split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `AED ${negative ? "-" : ""}${grouped}${dec === "00" ? "" : `.${dec}`}`;
}

function trimZeros(s: string): string {
  return s.replace(/\.0$/, "");
}
