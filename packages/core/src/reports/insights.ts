import type { LeadSource, StageType } from "@hco/shared";
import Big from "big.js";

/**
 * "What stands out" on the owner dashboard: a few plain statements picked from the numbers by fixed
 * rules (no AI). Each insight carries its figures; the UI turns it into a sentence.
 */
export type Insight =
  | { kind: "source_without_deals"; source: LeadSource; leads: number }
  | { kind: "best_source"; source: LeadSource; leads: number; deals: number; won: number; ratePct: number }
  | { kind: "stale_deals"; count: number; valueAed: string }
  | { kind: "funnel_drop"; fromStage: string; toStage: string; conversionPct: number }
  | { kind: "won_this_month"; count: number; valueAed: string }
  | { kind: "period_summary"; leads: number; deals: number }
  | { kind: "no_leads" };

export interface InsightInput {
  funnel: Array<{ name: string; type: StageType; reachedCount: number; conversionPct: number | null }>;
  leadsBySource: Array<{ source: LeadSource; leads: number; deals: number; won: number }>;
  wonThisMonth: { count: number; valueAed: string };
  staleDeals?: { count: number; valueAed: string };
}

/** A source needs at least this many leads before we call out how it converts. */
const MIN_LEADS_TO_JUDGE = 10;
/** Stage-to-stage conversion below this is worth pointing at. */
const WEAK_STEP_PCT = 50;

export function dashboardInsights(input: InsightInput, limit = 3): Insight[] {
  const totalLeads = input.leadsBySource.reduce((n, s) => n + s.leads, 0);
  const totalDeals = input.leadsBySource.reduce((n, s) => n + s.deals, 0);
  const found: Insight[] = [];

  const withoutDeals = input.leadsBySource
    .filter((s) => s.leads >= MIN_LEADS_TO_JUDGE && s.deals === 0)
    .sort((a, b) => b.leads - a.leads)[0];
  if (withoutDeals) {
    found.push({ kind: "source_without_deals", source: withoutDeals.source, leads: withoutDeals.leads });
  }

  // The source that turns into the most deals, not the best ratio on a handful of leads.
  const best = input.leadsBySource
    .filter((s) => s.leads >= MIN_LEADS_TO_JUDGE && s.deals > 0)
    .map((s) => ({ ...s, ratePct: Math.round((s.deals / s.leads) * 100) }))
    .sort((a, b) => b.deals - a.deals || b.won - a.won || b.ratePct - a.ratePct)[0];
  if (best) found.push({ kind: "best_source", ...best });

  if (input.staleDeals && input.staleDeals.count > 0) {
    found.push({ kind: "stale_deals", count: input.staleDeals.count, valueAed: input.staleDeals.valueAed });
  }

  const open = input.funnel.filter((s) => s.type === "open");
  let weakest: Insight | null = null;
  for (let i = 1; i < open.length; i++) {
    const from = open[i - 1];
    const to = open[i];
    if (!from || !to || to.conversionPct === null || from.reachedCount < 3) continue;
    if (to.conversionPct >= WEAK_STEP_PCT) continue;
    if (weakest === null || (weakest.kind === "funnel_drop" && to.conversionPct < weakest.conversionPct)) {
      weakest = {
        kind: "funnel_drop",
        fromStage: from.name,
        toStage: to.name,
        conversionPct: to.conversionPct,
      };
    }
  }
  if (weakest) found.push(weakest);

  if (input.wonThisMonth.count > 0 && new Big(input.wonThisMonth.valueAed).gt(0)) {
    found.push({ kind: "won_this_month", ...input.wonThisMonth });
  }

  // Nothing crossed a threshold: still say what happened, or invite the first lead.
  if (found.length === 0) {
    found.push(
      totalLeads > 0
        ? { kind: "period_summary", leads: totalLeads, deals: totalDeals }
        : { kind: "no_leads" },
    );
  }
  return found.slice(0, limit);
}
