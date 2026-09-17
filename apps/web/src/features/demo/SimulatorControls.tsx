import {
  ClipboardList,
  Layers,
  LoaderCircle,
  MessageCircle,
  MessageCircleDashed,
  X,
  type LucideIcon,
} from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DemoActionKey } from "./useSimulate";

interface PadProps {
  actionKey: DemoActionKey;
  icon: LucideIcon;
  /** Channel colour of the icon chip. */
  chip: string;
  pending: DemoActionKey | null;
  onRun: (key: DemoActionKey) => void;
  layout?: "stacked" | "inline";
  children?: ReactNode;
}

/** One Simulator button: a large target that says what arrives and where it came from. */
function ActionPad({ actionKey, icon: Icon, chip, pending, onRun, layout = "stacked", children }: PadProps) {
  const { t } = useTranslation("demo");
  const isPending = pending === actionKey;
  return (
    <button
      type="button"
      onClick={() => onRun(actionKey)}
      disabled={pending !== null}
      aria-busy={isPending}
      className={cn(
        "group relative flex min-w-0 gap-3 rounded-lg border bg-card p-3.5 text-start shadow-xs transition-colors",
        "hover:border-primary/45 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:cursor-not-allowed",
        pending !== null && !isPending && "opacity-60",
        isPending && "border-primary/45 bg-accent/40",
        layout === "stacked" ? "flex-row items-center sm:flex-col sm:items-start" : "flex-row items-start",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md text-white", chip)}
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug font-medium text-foreground">
          {t(`actions.${actionKey}.label`)}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {isPending ? t("actions.working") : t(`actions.${actionKey}.hint`)}
        </span>
        {children}
      </span>
    </button>
  );
}

function Group({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** Ten dots in channel colours: a burst mixes sources. */
const BURST_MIX = [
  "bg-channel-instagram",
  "bg-channel-tiktok",
  "bg-channel-instagram",
  "bg-channel-whatsapp",
  "bg-channel-tiktok",
  "bg-channel-facebook",
  "bg-channel-instagram",
  "bg-channel-tiktok",
  "bg-channel-whatsapp",
  "bg-channel-facebook",
];

export function SimulatorControls({
  pending,
  onRun,
  phone,
  onPhoneChange,
  phoneError,
}: {
  pending: DemoActionKey | null;
  onRun: (key: DemoActionKey) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  phoneError: string | null;
}) {
  const { t } = useTranslation("demo");
  const baseId = useId();
  const phoneId = `${baseId}-phone`;
  const hintId = `${baseId}-phone-hint`;
  const errorId = `${baseId}-phone-error`;

  return (
    <div className="flex flex-col gap-7">
      <Group id={`${baseId}-ads`} title={t("groups.ads.title")} description={t("groups.ads.description")}>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <ActionPad
            actionKey="instagram"
            icon={ClipboardList}
            chip="bg-channel-instagram"
            pending={pending}
            onRun={onRun}
          />
          <ActionPad
            actionKey="facebook"
            icon={ClipboardList}
            chip="bg-channel-facebook"
            pending={pending}
            onRun={onRun}
          />
          <ActionPad
            actionKey="tiktok"
            icon={ClipboardList}
            chip="bg-channel-tiktok"
            pending={pending}
            onRun={onRun}
          />
        </div>
      </Group>

      <Group
        id={`${baseId}-whatsapp`}
        title={t("groups.whatsapp.title")}
        description={t("groups.whatsapp.description")}
      >
        <div className="grid gap-2.5 md:grid-cols-2">
          <ActionPad
            actionKey="existingPatient"
            icon={MessageCircle}
            chip="bg-channel-whatsapp"
            pending={pending}
            onRun={onRun}
            layout="inline"
          />
          <ActionPad
            actionKey="unknownNumber"
            icon={MessageCircleDashed}
            chip="bg-channel-whatsapp"
            pending={pending}
            onRun={onRun}
            layout="inline"
          />
        </div>
      </Group>

      <Group
        id={`${baseId}-volume`}
        title={t("groups.volume.title")}
        description={t("groups.volume.description")}
      >
        <ActionPad
          actionKey="burst"
          icon={Layers}
          chip="bg-primary"
          pending={pending}
          onRun={onRun}
          layout="inline"
        >
          <span aria-hidden="true" className="mt-2.5 flex gap-1">
            {BURST_MIX.map((tone, i) => (
              <span key={i} className={cn("size-2 rounded-full", tone)} />
            ))}
          </span>
        </ActionPad>
      </Group>

      <section className="flex flex-col gap-2 border-t pt-6">
        <div className="flex items-baseline gap-2">
          <Label htmlFor={phoneId}>{t("phone.label")}</Label>
          <span className="text-xs text-muted-foreground">{t("phone.optional")}</span>
        </div>
        <div className="relative max-w-xs">
          <Input
            id={phoneId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("phone.placeholder")}
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? `${errorId} ${hintId}` : hintId}
            className="bg-card pe-9"
          />
          {phone ? (
            <button
              type="button"
              onClick={() => onPhoneChange("")}
              aria-label={t("phone.clear")}
              className="absolute end-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        {phoneError ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {phoneError}
          </p>
        ) : null}
        <p id={hintId} className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {t("phone.hint")}
        </p>
      </section>
    </div>
  );
}
