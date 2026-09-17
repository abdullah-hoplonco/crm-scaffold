import { api, type Role } from "@hco/shared";
import type { DashboardSummary } from "@hco/shared/api/dashboard";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/app/States";
import { UserAvatar } from "@/components/app/UserAvatar";
import { useApiQuery } from "@/lib/api/hooks";
import { barWidth, primaryFill } from "./chart-colors";
import { Panel } from "./Panel";

type ActivityRow = DashboardSummary["repActivity"][number];
type Metric = "messages" | "notes" | "tasksDone";
const METRICS: Metric[] = ["messages", "notes", "tasksDone"];

const total = (row: ActivityRow) => row.messages + row.notes + row.tasksDone;

function MetricBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="flex h-2.5 max-w-44 min-w-0 flex-1" aria-hidden="true">
      <span
        className="h-full rounded-e-[4px]"
        style={{ width: barWidth(value, max), backgroundColor: primaryFill() }}
      />
    </span>
  );
}

/**
 * Follow-up work per teammate over the last 7 days. Each measure has its own scale, so the bars
 * compare people, not messages against tasks. Owners and managers with nothing logged are left out.
 */
export function TeamActivity({ summary, className }: { summary: DashboardSummary; className?: string }) {
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation();
  const users = useApiQuery(api.workspace.listUsers, {});
  const roles = new Map<string, Role>((users.data?.items ?? []).map((u) => [u.id, u.role]));
  const rows = summary.repActivity.filter((r) => total(r) > 0 || roles.get(r.userId) === "rep");
  const max: Record<Metric, number> = {
    messages: Math.max(0, ...rows.map((r) => r.messages)),
    notes: Math.max(0, ...rows.map((r) => r.notes)),
    tasksDone: Math.max(0, ...rows.map((r) => r.tasksDone)),
  };
  const label: Record<Metric, string> = {
    messages: t("team.messages"),
    notes: t("team.notes"),
    tasksDone: t("team.tasksDone"),
  };
  const roleOf = (row: ActivityRow) => {
    const role = roles.get(row.userId);
    return role ? tc(`roles.${role}`) : null;
  };

  return (
    <Panel id="team-activity" title={t("team.title")} scope={t("scope.lastWeek")} className={className}>
      {rows.every((r) => total(r) === 0) ? (
        <EmptyState
          icon={Activity}
          title={t("team.emptyTitle")}
          description={t("team.emptyDescription")}
          className="py-8"
        />
      ) : (
        <>
          <table className="hidden w-full border-collapse text-sm md:table">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="w-56 pb-2 text-start font-normal">
                  {t("team.colPerson")}
                </th>
                {METRICS.map((m) => (
                  <th key={m} scope="col" className="pb-2 ps-6 text-start font-normal">
                    {label[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-t">
                  <th scope="row" className="py-2.5 pe-3 text-start font-normal">
                    <span className="flex items-center gap-2.5">
                      <UserAvatar name={row.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{row.name}</span>
                        <span className="block text-xs text-muted-foreground">{roleOf(row)}</span>
                      </span>
                    </span>
                  </th>
                  {METRICS.map((m) => (
                    <td key={m} className="py-2.5 ps-6">
                      <span className="flex items-center gap-3">
                        <span className="w-7 text-end font-semibold tabular-nums">{row[m]}</span>
                        <MetricBar value={row[m]} max={max[m]} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="flex flex-col md:hidden">
            {rows.map((row) => (
              <li key={row.userId} className="border-t py-3 first:border-t-0 first:pt-0">
                <p className="flex items-center gap-2.5">
                  <UserAvatar name={row.name} size="sm" />
                  <span className="min-w-0 truncate text-sm font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{roleOf(row)}</span>
                </p>
                <dl className="mt-2 grid grid-cols-[7.5rem_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
                  {METRICS.map((m) => (
                    <div key={m} className="contents">
                      <dt className="text-muted-foreground">{label[m]}</dt>
                      <dd className="flex items-center gap-2">
                        <span className="w-6 text-end font-semibold tabular-nums">{row[m]}</span>
                        <MetricBar value={row[m]} max={max[m]} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
