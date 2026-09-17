import type { StageType } from "@hco/shared";
import type { TimelineItem } from "@hco/shared/api/timeline";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  StickyNote,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { timeOfDay } from "./timeline-format";

export interface StageInfo {
  name: string;
  type: StageType;
}

function meta<T>(item: TimelineItem, key: string, guard: (v: unknown) => v is T): T | undefined {
  const value = item.metadata[key];
  return guard(value) ? value : undefined;
}
const isString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNumber = (v: unknown): v is number => typeof v === "number";

/** One timeline entry. Messages render as small bubbles, stage changes as inline markers, system entries muted. */
export function TimelineEntry({
  item,
  stages,
  showLeadTag,
  isLast,
}: {
  item: TimelineItem;
  stages: Map<string, StageInfo>;
  /** Mark entries that belong to the originating lead rather than this deal or contact. */
  showLeadTag: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation("pipeline");
  const time = (
    <time dateTime={item.occurredAt} title={formatDateTime(item.occurredAt)} className="tabular-nums">
      {timeOfDay(item.occurredAt)}
    </time>
  );
  const leadTag = showLeadTag ? (
    <span className="rounded-full border px-1.5 text-xs leading-4 text-muted-foreground">
      {t("timeline.leadTag")}
    </span>
  ) : null;
  const who = item.userName ?? t("timeline.someone");

  switch (item.type) {
    case "message_in":
    case "message_out":
    case "email_in":
    case "email_out": {
      const inbound = item.type.endsWith("_in");
      const email = item.type.startsWith("email");
      const [subject, ...rest] =
        email && item.body?.includes("\n\n") ? item.body.split("\n\n") : [null, item.body];
      const text = rest.join("\n\n");
      const doc = text.startsWith("📄 ") ? text.slice(3) : null;
      return (
        <Row icon={email ? Mail : MessageCircle} tone={email ? "email" : "whatsapp"} isLast={isLast}>
          <div className={cn("flex flex-col gap-1", inbound ? "items-start" : "items-end ps-6 sm:ps-12")}>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {inbound ? (
                <ArrowDownLeft className="size-3.5 text-channel-whatsapp" aria-hidden="true" />
              ) : (
                <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
              )}
              <span>
                {inbound
                  ? t(email ? "timeline.emailIn" : "timeline.whatsappIn")
                  : item.userName
                    ? t(email ? "timeline.emailOutBy" : "timeline.whatsappOutBy", { name: item.userName })
                    : t(email ? "timeline.emailOut" : "timeline.whatsappOut")}
              </span>
              {time}
              {leadTag}
            </p>
            <div
              className={cn(
                "max-w-[34rem] rounded-2xl px-3 py-2 text-sm whitespace-pre-line",
                inbound ? "rounded-ss-sm border bg-card" : "rounded-se-sm bg-primary/[0.08] text-foreground",
              )}
            >
              {subject ? <p className="mb-1 font-medium">{subject}</p> : null}
              {doc ? (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                  {doc}
                </span>
              ) : (
                <span className={cn(email && "line-clamp-4")}>{text}</span>
              )}
            </div>
          </div>
        </Row>
      );
    }

    case "stage_change": {
      const toId = meta(item, "toStageId", isString);
      const fromId = meta(item, "fromStageId", isString);
      const parsed = item.body?.match(/^Moved from (.+) to (.+)$/);
      const to = {
        name:
          meta(item, "toStageName", isString) ??
          (toId ? stages.get(toId)?.name : undefined) ??
          parsed?.[2] ??
          "",
        type:
          (meta(item, "toStageType", isString) as StageType | undefined) ??
          (toId ? stages.get(toId)?.type : undefined) ??
          "open",
      };
      const from =
        meta(item, "fromStageName", isString) ??
        (fromId ? stages.get(fromId)?.name : undefined) ??
        parsed?.[1];
      const lostReason = meta(item, "lostReason", isString);
      const lostNote = meta(item, "lostNote", isString);
      const icon = to.type === "won" ? Trophy : to.type === "lost" ? CircleX : ArrowRightLeft;
      return (
        <Row
          icon={icon}
          tone={to.type === "won" ? "success" : to.type === "lost" ? "danger" : "primary"}
          isLast={isLast}
          compact
        >
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <span
              className={cn(to.type === "won" && "text-success", to.type === "lost" && "text-destructive")}
            >
              {to.type === "won"
                ? t("timeline.markedWon", { stage: to.name })
                : to.type === "lost"
                  ? t("timeline.markedLost")
                  : t("timeline.movedTo")}
            </span>
            {to.type === "open" ? <span className="font-medium">{to.name}</span> : null}
            {from ? (
              <span className="text-muted-foreground">{t("timeline.fromStage", { stage: from })}</span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {t("timeline.by", { name: who })} {time}
            </span>
          </p>
          {lostReason ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t(`common:lostReasons.${lostReason}`)}
              {lostNote ? `: ${lostNote}` : null}
            </p>
          ) : null}
        </Row>
      );
    }

    case "system": {
      return (
        <Row icon={Sparkles} tone="muted" isLast={isLast} compact>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <span>{item.body}</span>
            <span className="text-xs">{time}</span>
            {leadTag}
          </p>
        </Row>
      );
    }

    default: {
      const config: Record<
        "note" | "call" | "meeting" | "task_done" | "quote_sent",
        { icon: LucideIcon; tone: Tone; label: string }
      > = {
        note: { icon: StickyNote, tone: "attention", label: t("timeline.noteBy", { name: who }) },
        call: { icon: Phone, tone: "primary", label: t("timeline.callBy", { name: who }) },
        meeting: { icon: Users, tone: "primary", label: t("timeline.meetingBy", { name: who }) },
        task_done: { icon: CircleCheck, tone: "success", label: t("timeline.taskDoneBy", { name: who }) },
        quote_sent: { icon: FileText, tone: "primary", label: t("timeline.quoteSentBy", { name: who }) },
      };
      const { icon, tone, label } = config[item.type];
      const minutes = meta(item, "durationMinutes", isNumber);
      const quoteId = meta(item, "quoteId", isString);
      return (
        <Row icon={icon} tone={tone} isLast={isLast}>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{label}</span>
            {minutes ? <span>{t("timeline.minutes", { count: minutes })}</span> : null}
            {time}
            {leadTag}
          </p>
          {item.type === "note" || item.type === "call" || item.type === "meeting" ? (
            <p className="mt-1.5 rounded-lg border bg-card px-3 py-2 text-sm whitespace-pre-line">
              {item.body}
            </p>
          ) : (
            <p className="mt-0.5 text-sm">
              {quoteId ? (
                <Link
                  to="/quotes/$quoteId"
                  params={{ quoteId }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {item.body}
                </Link>
              ) : (
                item.body
              )}
            </p>
          )}
        </Row>
      );
    }
  }
}

type Tone = "primary" | "success" | "danger" | "attention" | "whatsapp" | "email" | "muted";

const TONES: Record<Tone, string> = {
  primary: "bg-accent text-accent-foreground",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-destructive",
  attention: "bg-warning-soft text-warning",
  whatsapp: "bg-[#E3F4EA] text-channel-whatsapp",
  email: "bg-muted text-channel-email",
  muted: "bg-muted text-muted-foreground",
};

function Row({
  icon: Icon,
  tone,
  isLast,
  compact = false,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  isLast: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
      {isLast ? null : (
        <span aria-hidden="true" className="absolute start-[0.8125rem] top-8 bottom-0 w-px bg-border" />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-0.5 inline-flex items-center justify-center rounded-full",
          compact ? "ms-1 size-5 [&_svg]:size-3" : "size-7 [&_svg]:size-3.5",
          TONES[tone],
        )}
      >
        <Icon />
      </span>
      <div className={cn("min-w-0", compact ? "pb-4" : "pb-5")}>{children}</div>
    </li>
  );
}
