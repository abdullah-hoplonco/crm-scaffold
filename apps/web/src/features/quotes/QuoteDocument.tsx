import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { buildDocumentText, type QuoteDocumentModel } from "./model";
import { QuoteStatusPill } from "./QuoteStatusPill";

/**
 * The quotation as the customer sees it. Lays itself out by the width it is given (container
 * queries), so the same sheet reads well in the builder preview, on a phone and on a desktop.
 */
export function QuoteDocument({
  model,
  showStatus = true,
  className,
}: {
  model: QuoteDocumentModel;
  showStatus?: boolean;
  className?: string;
}) {
  const { t } = useTranslation(["quotes", "common"]);
  const text = buildDocumentText(t, model);

  return (
    <div className={cn("@container", className)}>
      <article
        aria-label={t("quotes:document.label", { number: text.number })}
        className="relative overflow-hidden rounded-md border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgb(19_35_42/0.05),0_18px_40px_-20px_rgb(19_35_42/0.25)]"
      >
        <div aria-hidden="true" className="h-1.5 bg-primary" />
        {text.watermark ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
          >
            <span className="-rotate-[24deg] text-[22cqw] leading-none font-bold tracking-tight text-foreground/[0.045]">
              {text.watermark}
            </span>
          </span>
        ) : null}

        <div className="relative px-5 pt-6 pb-5 @lg:px-8 @lg:pt-8 @3xl:px-12 @3xl:pt-11 @3xl:pb-8">
          {/* Letterhead */}
          <header className="flex flex-col gap-6 @xl:flex-row @xl:items-start @xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold tracking-wide text-primary-foreground @3xl:size-12 @3xl:text-base"
              >
                {text.monogram}
              </span>
              <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                <p className="text-sm leading-snug font-semibold text-foreground">{text.seller.name}</p>
                {text.seller.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="text-foreground tabular-nums">{text.seller.trn}</p>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 @xl:flex-col @xl:items-end @xl:justify-start">
              <div className="@xl:text-end">
                <h2 className="text-2xl leading-none font-semibold tracking-tight @3xl:text-[2rem]">
                  {text.title}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">{text.number}</p>
              </div>
              {showStatus ? <QuoteStatusPill status={model.status} /> : null}
            </div>
          </header>

          {/* Dates and who prepared it */}
          <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3.5 @xl:grid-cols-3">
            {text.meta.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>

          {/* Parties */}
          <div className="mt-6 grid gap-5 @xl:grid-cols-2 @xl:gap-8">
            <section className="min-w-0">
              <h3 className="text-xs text-muted-foreground">{text.billTo.label}</h3>
              <p className="mt-1 text-sm font-semibold">{text.billTo.name}</p>
              {text.billTo.company ? <p className="text-sm">{text.billTo.company}</p> : null}
              <div className="mt-0.5 text-xs leading-relaxed break-words text-muted-foreground tabular-nums">
                {text.billTo.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
            <section className="min-w-0">
              <h3 className="text-xs text-muted-foreground">{text.subject.label}</h3>
              <p className="mt-1 text-sm font-medium">{text.subject.value}</p>
            </section>
          </div>

          {/* Items: a table when there is room, stacked lines on a phone */}
          <div className="mt-7">
            <table className="hidden w-full text-sm @xl:table">
              <caption className="sr-only">{text.columns.inAed}</caption>
              <thead>
                <tr className="border-b border-foreground/15 text-xs text-muted-foreground">
                  <th scope="col" className="w-8 py-2 pe-2 text-start font-medium">
                    #
                  </th>
                  <th scope="col" className="py-2 pe-3 text-start font-medium">
                    {text.columns.description}
                  </th>
                  <th scope="col" className="w-12 py-2 pe-3 text-end font-medium">
                    {text.columns.qty}
                  </th>
                  <th scope="col" className="w-28 py-2 pe-3 text-end font-medium">
                    {text.columns.unitPrice}
                  </th>
                  <th scope="col" className="w-28 py-2 text-end font-medium">
                    {text.columns.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {text.lines.map((line, index) => (
                  <tr key={line.key} className="border-b align-top">
                    <td className="py-3 pe-2 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-3 pe-3 break-words">{line.description}</td>
                    <td className="py-3 pe-3 text-end tabular-nums">{line.qty}</td>
                    <td className="py-3 pe-3 text-end tabular-nums">{line.unitPrice}</td>
                    <td className="py-3 text-end font-medium tabular-nums">{line.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ol className="border-t border-foreground/15 @xl:hidden">
              {text.lines.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-3 border-b py-3">
                  <div className="min-w-0">
                    <p className="text-sm break-words">{line.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{line.mobile}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">{line.amount}</p>
                </li>
              ))}
            </ol>

            {text.lines.length === 0 ? (
              <p className="border-b py-6 text-center text-sm text-muted-foreground">{text.noItems}</p>
            ) : null}
          </div>

          {/* Totals */}
          <div className="mt-5 flex justify-end">
            <dl className="w-full text-sm @xl:w-80">
              {[text.totals.subtotal, text.totals.vat].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-3 py-1.5">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="tabular-nums">{row.value}</dd>
                </div>
              ))}
              <div className="mt-1.5 flex items-baseline justify-between gap-4 rounded-md bg-primary px-3 py-2.5 text-primary-foreground">
                <dt className="font-medium">{text.totals.total.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{text.totals.total.value}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-2 text-end text-xs text-muted-foreground">{text.amountInWords}</p>

          {text.notes ? (
            <section className="mt-7">
              <h3 className="text-xs text-muted-foreground">{text.notes.label}</h3>
              <p className="mt-1 max-w-prose text-sm whitespace-pre-line">{text.notes.value}</p>
            </section>
          ) : null}

          <footer className="mt-8 border-t pt-3.5 text-[11px] leading-relaxed text-muted-foreground">
            {text.footer}
          </footer>
        </div>
      </article>
    </div>
  );
}
