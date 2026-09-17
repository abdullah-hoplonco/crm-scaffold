import type { ChannelConnectionType } from "@hco/shared";
import { Check, CircleCheck, Hourglass, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ChannelGlyph, DemoConnectionBadge } from "./channel-meta";

/** Pause long enough for a simulated hand-off to Meta, TikTok or Google to feel real. */
export function simulateProvider(ms = 1100) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function FlowFrame({
  type,
  title,
  description,
  steps,
  current,
  children,
  footer,
}: {
  type: ChannelConnectionType;
  title: string;
  description: string;
  steps: string[];
  current: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation("settings");
  const label = steps[current] ?? "";
  return (
    <>
      <DialogHeader className="gap-3 text-start sm:text-start">
        <div className="flex items-center gap-3 pe-6">
          <ChannelGlyph type={type} live size="sm" />
          <div className="min-w-0">
            <DialogTitle className="leading-snug">{title}</DialogTitle>
            <DialogDescription className="sr-only">{description}</DialogDescription>
          </div>
          <span className="ms-auto hidden sm:inline-flex">
            <DemoConnectionBadge />
          </span>
        </div>
        <div>
          <ol className="grid auto-cols-fr grid-flow-col gap-1.5" aria-label={t("connect.progress")}>
            {steps.map((step, index) => (
              <li
                key={step}
                aria-current={index === current ? "step" : undefined}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  index <= current ? "bg-primary" : "bg-muted",
                )}
              >
                <span className="sr-only">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("connect.stepOf", { current: current + 1, total: steps.length, label })}
          </p>
        </div>
      </DialogHeader>
      <div className="min-h-56">{children}</div>
      {footer ? <DialogFooter className="gap-2">{footer}</DialogFooter> : null}
      <p className="-mt-2 flex justify-center sm:hidden">
        <DemoConnectionBadge />
      </p>
    </>
  );
}

export function BusyState({ label, detail }: { label: string; detail?: string }) {
  return (
    <div role="status" className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
      <LoaderCircle className="size-7 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
      {detail ? <p className="max-w-xs text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function ResultState({
  tone = "success",
  title,
  children,
}: {
  tone?: "success" | "pending";
  title: string;
  children?: ReactNode;
}) {
  const Icon = tone === "success" ? CircleCheck : Hourglass;
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-full",
          tone === "success" ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p role="status" className="text-base font-semibold">
        {title}
      </p>
      <div className="w-full text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function PermissionList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 rounded-lg border bg-muted/30 p-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A radio option drawn as a selectable row. Put it inside a RadioGroup. */
export function ChoiceRow({
  id,
  value,
  selected,
  title,
  meta,
  aside,
}: {
  id: string;
  value: string;
  selected: boolean;
  title: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50",
        selected && "border-primary/50 bg-accent/60 hover:bg-accent/60",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {meta ? <span className="block truncate text-sm text-muted-foreground">{meta}</span> : null}
      </span>
      {aside ? <span className="shrink-0">{aside}</span> : null}
    </label>
  );
}

const PROVIDER_STYLE = {
  facebook: "bg-channel-facebook text-white hover:bg-channel-facebook/90",
  tiktok: "bg-channel-tiktok text-white hover:bg-channel-tiktok/90",
  google: "border bg-card text-foreground shadow-xs hover:bg-muted",
} as const;

export function ProviderButton({
  provider,
  children,
  onClick,
}: {
  provider: keyof typeof PROVIDER_STYLE;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button type="button" size="lg" className={cn("w-full", PROVIDER_STYLE[provider])} onClick={onClick}>
      {children}
    </Button>
  );
}

export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="mt-4 grid gap-2 rounded-lg border bg-card p-3 text-start">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 truncate text-end font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
