import { api, type Stage } from "@hco/shared";
import type { DealDetail } from "@hco/shared/api/pipeline";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, CircleX, RotateCcw, Trophy, UserPlus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { Money } from "@/components/app/Money";
import { SourceBadge } from "@/components/app/SourceBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { DatePickerButton } from "../DatePickerButton";
import { daysSince } from "../dates";
import { parseAedInput } from "../MoneyInput";
import { MoveToMenu } from "../MoveToMenu";
import { InlineEdit } from "./InlineEdit";
import { StageStepper } from "./StageStepper";

export function DealHeader({
  detail,
  onMove,
}: {
  detail: DealDetail;
  onMove: (stage: Stage, options?: { announce?: boolean }) => void;
}) {
  const { t } = useTranslation("pipeline");
  const { user } = useSession();
  const { deal, card, stage, stages, contact, company, lead } = detail;
  const canReopen = user.role !== "rep";
  const isClosed = stage.type !== "open";
  const won = stages.find((s) => s.type === "won");
  const lost = stages.find((s) => s.type === "lost");
  const openStages = stages.filter((s) => s.type === "open");
  const assigneeId = useId();
  const closeId = useId();
  const users = useApiQuery(api.workspace.listUsers, {});

  const update = useApiMutation(api.pipeline.update, {
    onError: (error) => toast.error(t("deal.updateFailed"), { description: errorMessage(error) }),
  });
  const save = (body: Parameters<typeof update.mutate>[0]["body"], message: string) =>
    update.mutate({ params: { dealId: deal.id }, body }, { onSuccess: () => toast.success(message) });

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const openIndex = openStages.findIndex((s) => s.id === stage.id);

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-3 pb-4 sm:px-6 lg:px-8 lg:pt-4">
        <Link
          to="/pipeline"
          className="-ms-1 inline-flex w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t("title")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-80">
            <InlineEdit
              value={deal.title}
              label={t("deal.titleField")}
              onSave={(title) => save({ title }, t("deal.titleSaved"))}
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              inputClassName="h-10 text-lg font-semibold"
            >
              <h1 className="min-w-0 text-balance">{deal.title}</h1>
            </InlineEdit>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("deal.with")}
              <Link
                to="/contacts/$contactId"
                params={{ contactId: contact.id }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {contactName}
              </Link>
              {company ? (
                <>
                  {t("deal.atCompany")}
                  <Link
                    to="/companies/$companyId"
                    params={{ companyId: company.id }}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {company.name}
                  </Link>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isClosed ? (
              canReopen ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <RotateCcw />
                      {t("deal.reopen")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {t("moveTo.reopenTo")}
                    </DropdownMenuLabel>
                    {openStages.map((s) => (
                      <DropdownMenuItem key={s.id} onSelect={() => onMove(s)}>
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <Button variant="outline" disabled>
                        <RotateCcw />
                        {t("deal.reopen")}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{t("moveTo.reopenNotAllowed")}</TooltipContent>
                </Tooltip>
              )
            ) : (
              <>
                {lost ? (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-danger-soft hover:text-destructive"
                    onClick={() => onMove(lost)}
                  >
                    <CircleX />
                    {t("moveTo.markLost")}
                  </Button>
                ) : null}
                {won ? (
                  <Button className="bg-success text-white hover:bg-success/90" onClick={() => onMove(won)}>
                    <Trophy />
                    {t("moveTo.markWon")}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isClosed ? (
          <p
            className={cn(
              "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-sm",
              stage.type === "won" ? "bg-success-soft text-success" : "bg-danger-soft text-destructive",
            )}
          >
            {stage.type === "won" ? (
              <Trophy className="size-4" aria-hidden="true" />
            ) : (
              <CircleX className="size-4" aria-hidden="true" />
            )}
            <span className="font-medium">
              {stage.type === "won"
                ? t("deal.wonBanner", {
                    stage: stage.name,
                    date: deal.closedAt ? formatDate(deal.closedAt) : "",
                  })
                : t("deal.lostBanner", { date: deal.closedAt ? formatDate(deal.closedAt) : "" })}
            </span>
            {deal.lostReason ? (
              <span className="text-foreground/80">
                {t(`common:lostReasons.${deal.lostReason}`)}
                {deal.lostNote ? `: ${deal.lostNote}` : null}
              </span>
            ) : null}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 sm:hidden">
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t("deal.stageOf", { index: openIndex + 1, total: openStages.length })}
                </span>{" "}
                <span className="font-medium">{stage.name}</span>
              </p>
              <MoveToMenu
                deal={card}
                stages={stages}
                canReopen={canReopen}
                onMove={(s) => onMove(s, { announce: true })}
              />
            </div>
            <StageStepper stages={stages} current={stage} onSelect={(s) => onMove(s, { announce: true })} />
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-start sm:gap-x-8">
          <Field label={t("deal.value")}>
            <InlineEdit
              value={deal.valueAed.replace(/\.00$/, "")}
              label={t("deal.value")}
              prefix="AED"
              parse={parseAedInput}
              invalidMessage={t("newDealDialog.valueInvalid")}
              onSave={(valueAed) => save({ valueAed }, t("deal.valueSaved"))}
              inputClassName="w-36"
            >
              <Money value={deal.valueAed} className="text-lg font-semibold" />
            </InlineEdit>
          </Field>
          <Field label={t("deal.assignee")} htmlFor={assigneeId}>
            <AssigneeSelect
              id={assigneeId}
              value={deal.assigneeId}
              onChange={(next) => {
                const name = users.data?.items.find((u) => u.id === next)?.name;
                save({ assigneeId: next }, name ? t("deal.assignedTo", { name }) : t("deal.unassigned"));
              }}
              className="h-8 w-full min-w-40 bg-card sm:w-auto"
            />
          </Field>
          <Field label={t("deal.expectedClose")} htmlFor={closeId}>
            <DatePickerButton
              id={closeId}
              value={deal.expectedCloseDate}
              onChange={(expectedCloseDate) => save({ expectedCloseDate }, t("deal.closeDateSaved"))}
              placeholder={t("newDealDialog.closePlaceholder")}
              className="h-8 w-full sm:w-auto"
            />
          </Field>
          <Field label={t("deal.source")}>
            <span className="flex h-8 flex-wrap items-center gap-2">
              <SourceBadge source={deal.source} />
              {lead ? (
                <Link
                  to="/leads/$leadId"
                  params={{ leadId: lead.id }}
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                >
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  {t("deal.viewLead")}
                </Link>
              ) : null}
            </span>
          </Field>
          <Field label={t("deal.lastActivity")}>
            <span
              className={cn("flex h-8 items-center text-sm", card.isStale && "font-medium text-[#7A5200]")}
            >
              {t("deal.daysAgo", { count: daysSince(deal.lastActivityAt) })}
            </span>
          </Field>
        </dl>
      </div>
    </header>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
