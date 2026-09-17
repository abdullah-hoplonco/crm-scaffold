import type { ActivityType, LeadSource, StageType } from "@hco/shared";
import Big from "big.js";
import { sumMoney, toMoneyString } from "../money";

/**
 * Owner dashboard figures as pure functions over plain rows. The showcase mock backend and the
 * Phase B API both call these, so the numbers on the dashboard never depend on who computed them.
 */

export interface ReportStage {
  id: string;
  name: string;
  position: number;
  type: StageType;
  probability: number;
}

export interface ReportDeal {
  id: string;
  stageId: string;
  valueAed: string;
  createdAt: string;
  closedAt: string | null;
}

export interface ReportTransition {
  dealId: string;
  toStageId: string;
}

export interface FunnelRow {
  stageId: string;
  name: string;
  type: StageType;
  /** Deals currently in the stage. */
  count: number;
  /** Deals created in the period that ever reached this stage or a later one. */
  reachedCount: number;
  /** reachedCount against the previous open stage, 0–100. Null for the first stage and for lost. */
  conversionPct: number | null;
  /** AED value of the deals currently in the stage. */
  valueAed: string;
}

function byPosition(stages: ReportStage[]): ReportStage[] {
  return [...stages].sort((a, b) => a.position - b.position);
}

function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

/**
 * Funnel by stage. A deal "reached" an open stage when it was ever in that stage or a later open
 * stage, or when it was won. Lost deals count only for the open stages they actually got to, so a
 * loss never inflates progress. Won and lost report the deals that entered them.
 */
export function computeFunnel(input: {
  stages: ReportStage[];
  deals: ReportDeal[];
  transitions: ReportTransition[];
  /** ISO start of the period; deals created before it are left out of reachedCount. */
  since: string;
}): FunnelRow[] {
  const stages = byPosition(input.stages);
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const openPositions = stages.filter((s) => s.type === "open").map((s) => s.position);

  const visited = new Map<string, Set<string>>();
  for (const deal of input.deals) visited.set(deal.id, new Set([deal.stageId]));
  for (const t of input.transitions) visited.get(t.dealId)?.add(t.toStageId);

  const inPeriod = input.deals.filter((d) => d.createdAt >= input.since);
  const progress = inPeriod.map((deal) => {
    const reached = [...(visited.get(deal.id) ?? [])]
      .map((id) => stageById.get(id))
      .filter((s): s is ReportStage => Boolean(s));
    const won = reached.some((s) => s.type === "won");
    const lost = reached.some((s) => s.type === "lost");
    const furthestOpen = reached
      .filter((s) => s.type === "open")
      .reduce((max, s) => Math.max(max, s.position), Number.NEGATIVE_INFINITY);
    return { won, lost, furthestOpen: won ? Math.max(...openPositions, furthestOpen) : furthestOpen };
  });

  const rows: FunnelRow[] = [];
  let previousOpenReached: number | null = null;
  for (const stage of stages) {
    const current = input.deals.filter((d) => d.stageId === stage.id);
    const reachedCount = progress.filter((p) =>
      stage.type === "won" ? p.won : stage.type === "lost" ? p.lost : p.furthestOpen >= stage.position,
    ).length;
    const conversionPct =
      stage.type === "lost" || previousOpenReached === null
        ? null
        : percent(reachedCount, previousOpenReached);
    rows.push({
      stageId: stage.id,
      name: stage.name,
      type: stage.type,
      count: current.length,
      reachedCount,
      conversionPct,
      valueAed: sumMoney(current.map((d) => d.valueAed)),
    });
    if (stage.type === "open") previousOpenReached = reachedCount;
  }
  return rows;
}

export interface ReportLead {
  source: LeadSource;
  receivedAt: string;
  convertedDealId: string | null;
}

export interface SourceRow {
  source: LeadSource;
  leads: number;
  /** Leads from the period that became deals. */
  deals: number;
  /** Those deals now in a won stage. */
  won: number;
}

/** Leads received in the period per source, how many became deals and how many of those were won. Most leads first. */
export function computeLeadsBySource(input: {
  leads: ReportLead[];
  deals: Array<Pick<ReportDeal, "id" | "stageId">>;
  stages: ReportStage[];
  since: string;
}): SourceRow[] {
  const wonStageIds = new Set(input.stages.filter((s) => s.type === "won").map((s) => s.id));
  const dealStage = new Map(input.deals.map((d) => [d.id, d.stageId]));
  const rows = new Map<LeadSource, SourceRow>();
  for (const lead of input.leads) {
    if (lead.receivedAt < input.since) continue;
    const row = rows.get(lead.source) ?? { source: lead.source, leads: 0, deals: 0, won: 0 };
    row.leads += 1;
    const stageId = lead.convertedDealId ? dealStage.get(lead.convertedDealId) : undefined;
    if (stageId !== undefined) {
      row.deals += 1;
      if (wonStageIds.has(stageId)) row.won += 1;
    }
    rows.set(lead.source, row);
  }
  return [...rows.values()].sort((a, b) => b.leads - a.leads || b.deals - a.deals);
}

export interface ReportUser {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ReportActivity {
  type: ActivityType;
  userId: string | null;
  occurredAt: string;
}

export interface RepActivityRow {
  userId: string;
  name: string;
  /** WhatsApp and email messages sent. */
  messages: number;
  /** Notes, calls and meetings logged. */
  notes: number;
  tasksDone: number;
}

const MESSAGE_TYPES: ReadonlySet<ActivityType> = new Set(["message_out", "email_out"]);
const NOTE_TYPES: ReadonlySet<ActivityType> = new Set(["note", "call", "meeting"]);

/** Follow-up work per active user since a point in time, busiest first. */
export function computeRepActivity(input: {
  users: ReportUser[];
  activities: ReportActivity[];
  since: string;
}): RepActivityRow[] {
  const rows = new Map<string, RepActivityRow>(
    input.users
      .filter((u) => u.isActive)
      .map((u) => [u.id, { userId: u.id, name: u.name, messages: 0, notes: 0, tasksDone: 0 }]),
  );
  for (const a of input.activities) {
    if (!a.userId || a.occurredAt < input.since) continue;
    const row = rows.get(a.userId);
    if (!row) continue;
    if (MESSAGE_TYPES.has(a.type)) row.messages += 1;
    else if (NOTE_TYPES.has(a.type)) row.notes += 1;
    else if (a.type === "task_done") row.tasksDone += 1;
  }
  const total = (r: RepActivityRow) => r.messages + r.notes + r.tasksDone;
  return [...rows.values()].sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
}

export interface PipelineValue {
  openPipelineAed: string;
  /** Open value weighted by each stage's probability. */
  weightedPipelineAed: string;
  openDealsCount: number;
}

export function computePipelineValue(input: {
  deals: Array<Pick<ReportDeal, "stageId" | "valueAed">>;
  stages: ReportStage[];
}): PipelineValue {
  const openStages = new Map(input.stages.filter((s) => s.type === "open").map((s) => [s.id, s]));
  const open = input.deals.filter((d) => openStages.has(d.stageId));
  const weighted = open.reduce<Big>((acc, d) => {
    const probability = openStages.get(d.stageId)?.probability ?? 0;
    return acc.plus(new Big(d.valueAed).times(probability).div(100));
  }, new Big(0));
  return {
    openPipelineAed: sumMoney(open.map((d) => d.valueAed)),
    weightedPipelineAed: toMoneyString(weighted),
    openDealsCount: open.length,
  };
}

/** Deals sitting in a won stage that closed at or after `since` (e.g. the start of the month in Dubai). */
export function computeWonSince(input: {
  deals: Array<Pick<ReportDeal, "stageId" | "valueAed" | "closedAt">>;
  stages: ReportStage[];
  since: string;
}): { count: number; valueAed: string } {
  const wonStageIds = new Set(input.stages.filter((s) => s.type === "won").map((s) => s.id));
  const won = input.deals.filter(
    (d) => wonStageIds.has(d.stageId) && d.closedAt && d.closedAt >= input.since,
  );
  return { count: won.length, valueAed: sumMoney(won.map((d) => d.valueAed)) };
}
